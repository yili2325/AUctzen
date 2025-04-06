const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Register a new user
router.post('/register', [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
], async (req, res) => {
  console.log('Registration attempt:', { 
    name: req.body.name, 
    email: req.body.email,
    passwordLength: req.body.password ? req.body.password.length : 0
  });

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, firstName, lastName } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      console.log('User already exists:', email);
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Create new user
    user = new User({
      email,
      password,
      firstName,
      lastName
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    console.log('Saving new user to database...');
    await user.save();
    console.log('User saved successfully:', user.id);

    // Create JWT token
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        console.log('JWT generated successfully');
        res.json({ token });
      }
    );
  } catch (err) {
    console.error('Detailed error in user registration:', err);
    console.error('Error in user registration:', err.message);
    res.status(500).send('Server Error');
  }
});

// Login user
router.post('/login', [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Create JWT token
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            subscription: user.subscription
          }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update subscription
router.post('/subscription', auth, async (req, res) => {
  try {
    const { plan, paymentReference } = req.body;
    
    // Calculate subscription dates
    const startDate = new Date();
    let endDate = null;
    
    if (plan === 'premium') {
      // Set end date to 30 days from now for premium plan
      endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
    }
    
    const user = await User.findById(req.user.id);
    
    user.subscription = {
      plan,
      startDate,
      endDate,
      status: 'active',
      paymentReference
    };
    
    await user.save();
    
    res.json(user.subscription);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update the POST route to ensure it's properly saving users
router.post('/', [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
], async (req, res) => {
    try {
        console.log('Received signup request:', req.body);
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }
        
        const { name, email, password, plan } = req.body;
        
        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            console.log('User already exists:', email);
            return res.status(400).json({ msg: 'User already exists' });
        }
        
        // Create new user with proper fields
        user = new User({
            name,
            email,
            password,
            subscription: {
                plan: plan || 'basic',
                status: 'active',
                startDate: new Date()
            }
        });
        
        console.log('Created user object:', user);
        
        // Save user to database
        try {
            await user.save();
            console.log('User saved successfully:', user._id);
        } catch (saveErr) {
            console.error('Error saving user:', saveErr);
            return res.status(500).json({ msg: 'Error saving user to database' });
        }
        
        // Create JWT token
        const payload = {
            user: {
                id: user.id
            }
        };
        
        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'temporarysecret',
            { expiresIn: '7d' },
            (err, token) => {
                if (err) {
                    console.error('JWT Sign error:', err);
                    return res.status(500).json({ msg: 'Error generating token' });
                }
                console.log('Sending token response for user:', user._id);
                res.json({ token, userId: user._id });
            }
        );
    } catch (err) {
        console.error('Signup error:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Add this test endpoint
router.get('/test', (req, res) => {
    res.json({ msg: 'Users API is working' });
});

// Add this simple test route
router.post('/simple-signup', async (req, res) => {
    try {
        console.log('Received simple signup request:', req.body);
        
        // Just return a success response without database operations
        res.json({ 
            success: true, 
            token: 'test-token',
            message: 'User created successfully (test)'
        });
    } catch (err) {
        console.error('Simple signup error:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Add this test route to manually create a user
router.get('/create-test-user', async (req, res) => {
    try {
        // Create a test user
        const testUser = new User({
            name: 'Test User',
            email: 'test' + Date.now() + '@example.com', // Unique email
            password: 'password123',
            subscription: {
                plan: 'basic',
                status: 'active',
                startDate: new Date()
            }
        });
        
        // Save the user
        await testUser.save();
        
        res.json({ 
            success: true, 
            message: 'Test user created successfully',
            userId: testUser._id,
            email: testUser.email
        });
    } catch (err) {
        console.error('Error creating test user:', err.message);
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

module.exports = router; 