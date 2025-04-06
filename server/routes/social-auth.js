const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Facebook login
router.post('/facebook', async (req, res) => {
  try {
    const { accessToken } = req.body;
    
    // Verify token with Facebook
    const fbResponse = await axios.get(`https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`);
    
    if (!fbResponse.data || !fbResponse.data.id) {
      return res.status(400).json({ msg: 'Invalid Facebook token' });
    }
    
    const { id, name, email } = fbResponse.data;
    
    // Check if user exists
    let user = await User.findOne({ 
      $or: [
        { email },
        { provider: 'facebook', providerId: id }
      ]
    });
    
    if (user) {
      // Update existing user
      user.provider = 'facebook';
      user.providerId = id;
      await user.save();
    } else {
      // Create new user
      user = new User({
        name,
        email,
        password: Math.random().toString(36).slice(-8), // Random password
        provider: 'facebook',
        providerId: id,
        subscription: {
          plan: 'basic',
          status: 'active'
        }
      });
      await user.save();
      console.log(`New Facebook user saved to database: ${user.email}`);
    }
    
    // Create JWT token
    const payload = {
      user: {
        id: user.id
      }
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        subscription: user.subscription
      }
    });
    
  } catch (err) {
    console.error('Facebook auth error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Similar endpoints for Google and Apple

module.exports = router; 