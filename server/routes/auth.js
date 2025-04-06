const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');
const { sendAdminNotification } = require('../utils/email');
const mongoose = require('mongoose');
const crypto = require('crypto');


const User = require('../models/User');

// @route   GET api/auth
// @desc    Get logged in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
], async (req, res) => {
    try {
        console.log('Auth request received:', req.body);
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;
        console.log(`Login attempt for email: ${email}`);

        // Check database connection
        try {
            console.log('MongoDB connection state:', mongoose.connection.readyState);
            // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
            if (mongoose.connection.readyState !== 1) {
                console.error('Database not connected! Readystate:', mongoose.connection.readyState);
                return res.status(500).json({ msg: 'Database connection error. Please try again later.' });
            }
        } catch (dbErr) {
            console.error('Error checking database connection:', dbErr);
        }

        // Check if user exists
        let user = await User.findOne({ email });
        if (!user) {
            console.log('User not found with email:', email);
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        console.log('User found:', {
            id: user._id,
            email: user.email,
            role: user.role,
            passwordLength: user.password?.length || 'No password'
        });

        // Make sure password field exists
        if (!user.password) {
            console.error('User has no password field:', email);
            return res.status(400).json({ msg: 'Account setup is incomplete. Please reset your password.' });
        }

        // Check password - with additional error handling
        console.log('Attempting password comparison...');
        let isMatch = false;
        try {
            isMatch = await bcrypt.compare(password, user.password);
            console.log('Password comparison result:', isMatch);
        } catch (bcryptError) {
            console.error('bcrypt compare error:', bcryptError);
            return res.status(500).json({ msg: 'Error during password verification' });
        }
        
        if (!isMatch) {
            console.log('Password does not match for user:', email);
            // For additional debugging, log the first few chars of the hashed password
            console.log('Password hash prefix:', user.password.substring(0, 10) + '...');
            return res.status(400).json({ msg: 'Invalid credentials' });
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
                console.log('Login successful for user:', user._id);
                res.json({ 
                    token, 
                    userId: user._id,
                    user: {
                        name: user.name,
                        email: user.email,
                        subscription: user.subscription,
                        role: user.role
                    }
                });
            }
        );
    } catch (err) {
        console.error('Auth error:', err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

// @route   POST api/auth/signup
// @desc    Register a user
// @access  Public
router.post(
  '/signup',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  ],
  async (req, res) => {
    // Validate request data
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    console.log('Signup request received:', {
      name: req.body.name,
      email: req.body.email,
      plan: req.body.plan,
      firstName: req.body.firstName,
      lastName: req.body.lastName
    });

    const { name, email, password, plan, firstName, lastName } = req.body;

    try {
      // Check database connection
      const dbState = mongoose.connection.readyState;
      console.log('Checking database connection, state:', dbState);
      
      if (dbState !== 1) {
        console.error('Database not connected during signup! Readystate:', dbState);
        
        // Create a temporary user in memory and return a token
        // This allows the user to continue using the app with limited functionality
        console.log('Creating temporary user for offline mode');
        
        const tempUserId = crypto.randomBytes(12).toString('hex');
        const payload = {
          user: {
            id: tempUserId
          }
        };
        
        // Log the temporary user
        console.log('Temporary user created:', {
          id: tempUserId,
          name,
          email,
          isTemporary: true
        });
        
        // Store user data in localStorage
        return jwt.sign(
          payload,
          process.env.JWT_SECRET || 'temporarysecret',
          { expiresIn: '1d' },
          (err, token) => {
            if (err) throw err;
            return res.status(201).json({ 
              token,
              user: {
                id: tempUserId,
                name,
                email,
                subscription: {
                  plan: plan || 'basic',
                  status: 'active',
                  startDate: new Date(),
                  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                },
                isTemporary: true
              },
              message: 'Temporary account created. Data saved locally.'
            });
          }
        );
      }

      // Check if user already exists
      let user = await User.findOne({ email });
      if (user) {
        console.log('User already exists with email:', email);
        return res.status(400).json({ msg: 'User already exists' });
      }

      // Create new user
      user = new User({
        name,
        email,
        password, // Will be hashed by the pre-save hook in User model
        firstName: firstName || name.split(' ')[0],
        lastName: lastName || name.split(' ').slice(1).join(' '),
        subscription: {
          plan: plan || 'basic',
          status: 'active',
          startDate: new Date(),
          expiresAt: plan === 'lifetime' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });

      console.log('User object created:', {
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.subscription.plan
      });

      // Save user to database
      try {
        await user.save();
        console.log(`New user saved to database successfully: ${user.email} (${user._id})`);
      } catch (saveError) {
        console.error('Error saving user to database:', saveError);
        return res.status(500).json({ msg: 'Error saving user to database', error: saveError.message });
      }

      // Send admin notification
      try {
        await sendAdminNotification(user);
        console.log('Admin notification email sent');
      } catch (emailErr) {
        console.error('Failed to send admin notification:', emailErr);
      }

      // Create JWT token
      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET || 'fallbacksecret',
        { expiresIn: '7d' },
        (err, token) => {
          if (err) throw err;
          res.json({ 
            token,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              subscription: user.subscription
            }
          });
        }
      );
      
    } catch (err) {
      console.error('Signup error:', err.message);
      console.error(err.stack);
      res.status(500).json({ 
        msg: 'Server error during signup', 
        error: err.message,
        suggestion: 'Please try again later or contact support'
      });
    }
  }
);

// @route   POST api/auth/create-admin
// @desc    Create admin user (temporary route)
// @access  Public
router.post('/create-admin', async (req, res) => {
    try {
        const adminData = {
            name: 'Admin User',
            email: 'admin@gmail.com',
            password: '12345678',
            role: 'admin',
            provider: 'email'
        };

        // Check if admin already exists
        let admin = await User.findOne({ email: adminData.email });
        if (admin) {
            console.log('Existing admin user found:', {
                id: admin._id,
                email: admin.email,
                role: admin.role,
                passwordLength: admin.password.length
            });
            // If admin exists, update the password
            admin.password = adminData.password; // Will be hashed by the pre-save hook
            await admin.save();
            console.log('Admin password updated successfully');
            return res.json({ msg: 'Admin password updated successfully' });
        }

        // Create new admin user
        admin = new User(adminData);
        await admin.save();
        console.log('New admin user created successfully');
        
        res.json({ msg: 'Admin user created successfully' });
    } catch (err) {
        console.error('Create admin error:', err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/auth/check-db
// @desc    Check database status and list users
// @access  Public (temporary)
router.get('/check-db', async (req, res) => {
    try {
        // Check MongoDB connection
        const dbState = mongoose.connection.readyState;
        const dbStatus = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };

        // Get all users
        const users = await User.find().select('email role subscription');
        
        res.json({
            dbConnection: dbStatus[dbState],
            userCount: users.length,
            users: users
        });
    } catch (err) {
        console.error('Database check error:', err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/debug-login
// @desc    Debug login endpoint with hardcoded credentials
// @access  Public
router.post('/debug-login', async (req, res) => {
    try {
        console.log('Debug login attempt');
        
        const { email, password } = req.body;
        
        // Debug credentials - hardcoded for testing
        const debugEmail = email || 'admin@admin.com';
        const debugPassword = password || 'admin123';
        
        // Find or create a test user
        let user = await User.findOne({ email: debugEmail });
        
        if (!user) {
            console.log('Creating admin user with known credentials');
            
            // Create a new admin user with known credentials
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(debugPassword, salt);
            
            user = new User({
                name: 'Admin User',
                email: debugEmail,
                password: hashedPassword,
                role: 'admin',
                subscription: {
                    plan: 'lifetime',
                    status: 'active',
                    startDate: new Date(),
                    expiresAt: null // Never expires for admin
                }
            });
            
            await user.save();
            console.log('New admin user created with email:', debugEmail);
        } else {
            console.log('Admin user found, updating password for testing');
            // Update the password to ensure it's correctly hashed
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(debugPassword, salt);
            await user.save();
        }
        
        // For testing, check if password comparison works
        console.log('Testing password comparison...'); 
        const isMatch = await bcrypt.compare(debugPassword, user.password);
        console.log('Password comparison test result:', isMatch);
        
        if (!isMatch) {
            console.error('Password comparison test failed!');
            return res.status(500).json({ msg: 'Password comparison test failed' });
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
                console.log('Debug login successful for admin user:', user._id);
                res.json({ 
                    token, 
                    userId: user._id,
                    user: {
                        name: user.name,
                        email: user.email,
                        subscription: user.subscription,
                        role: user.role
                    },
                    debugInfo: {
                        createdOrUpdated: true,
                        passwordHash: user.password.substring(0, 10) + '...'
                    }
                });
            }
        );
    } catch (err) {
        console.error('Debug login error:', err.message);
        res.status(500).json({ msg: 'Server error during debug login' });
    }
});

// @route   POST api/auth/simple-login
// @desc    Simple login for testing
// @access  Public
router.post('/simple-login', async (req, res) => {
  try {
    console.log('Simple login attempt for:', req.body.email);
    const { email } = req.body;
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    // If user doesn't exist, create one
    if (!user) {
      console.log('User not found, creating test user with email:', email);
      
      // Generate a random password
      const password = Math.random().toString(36).slice(-8);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      user = new User({
        name: email.split('@')[0],
        email,
        password: hashedPassword,
        firstName: email.split('@')[0],
        lastName: 'TestUser',
        subscription: {
          plan: 'lifetime',
          status: 'active',
          startDate: new Date(),
          expiresAt: null
        },
        role: email.includes('admin') ? 'admin' : 'user'
      });
      
      await user.save();
      console.log('Created test user:', user._id);
    } else {
      console.log('Found existing user:', user._id);
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
        console.log('Simple login successful for user:', user._id);
        res.json({ 
          token, 
          userId: user._id,
          user: {
            name: user.name,
            email: user.email,
            subscription: user.subscription,
            role: user.role
          }
        });
      }
    );
  } catch (err) {
    console.error('Simple login error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router; 