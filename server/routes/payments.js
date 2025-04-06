const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const stripe = require('../config/stripe');

// @route   GET api/stripe/config
// @desc    Get Stripe publishable key
// @access  Public
router.get('/config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
});

// @route   POST api/payments/create-intent
// @desc    Create a payment intent with payment method
// @access  Private
router.post('/create-intent', auth, async (req, res) => {
  try {
    const { paymentMethodId, plan, amount } = req.body;

    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      payment_method: paymentMethodId,
      amount: amount, // amount in cents
      currency: 'aud',
      confirmation_method: 'manual',
      confirm: true,
      metadata: {
        userId: req.user.id,
        plan
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status
    });

  } catch (err) {
    console.error('Error creating payment intent:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to create payment intent'
    });
  }
});

// @route   POST api/payments/process-payment
// @desc    Process a successful payment and update user subscription
// @access  Private
router.post('/process-payment', auth, async (req, res) => {
  try {
    const { paymentIntentId, plan } = req.body;

    // Verify the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not successful' });
    }

    // Verify that the payment is for the correct user
    if (paymentIntent.metadata.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized payment confirmation' });
    }

    // Update user subscription in your database
    // This is just an example - adjust according to your User model
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate subscription dates
    const startDate = new Date();
    let endDate = null;
    
    if (plan === 'premium') {
      endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
    }

    user.subscription = {
      plan,
      startDate,
      endDate,
      status: 'active',
      paymentReference: paymentIntentId
    };

    await user.save();

    res.json({ 
      success: true,
      subscription: user.subscription
    });

  } catch (err) {
    console.error('Error processing payment:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to process payment'
    });
  }
});

// @route   GET api/payments/history
// @desc    Get payment history
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Fetch payment history from Stripe
    const paymentIntents = await stripe.paymentIntents.list({
      customer: user.stripeCustomerId,
      limit: 10
    });
    
    res.json({
      subscription: user.subscription,
      payments: paymentIntents.data
    });
    
  } catch (err) {
    console.error('Error fetching payment history:', err);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

module.exports = router; 