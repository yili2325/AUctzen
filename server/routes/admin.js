const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Question = require('../models/Question');
const User = require('../models/User');
const Test = require('../models/Test');
// Payment model removed as all features are now free
const multer = require('multer');
const csv = require('csv-parse');
const fs = require('fs');

// Configure multer for file upload
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and JSON files are allowed.'));
    }
  }
});

// @route   GET api/admin/questions
// @desc    Get all questions with pagination
// @access  Admin
router.get('/questions', [auth, admin], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const questions = await Question.find()
      .sort({ category: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Question.countDocuments();
    
    res.json({
      questions,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/admin/questions
// @desc    Add a new question
// @access  Admin
router.post('/questions', [
  auth, 
  admin,
  [
    check('question', 'Question is required').not().isEmpty(),
    check('category', 'Category is required').not().isEmpty(),
    check('options', 'At least 2 options are required').isArray({ min: 2 }),
    check('correctAnswer', 'Correct answer is required').isNumeric(),
    check('explanation', 'Explanation is required').not().isEmpty()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { category, question, options, correctAnswer, explanation, difficulty } = req.body;

  try {
    const newQuestion = new Question({
      category,
      question,
      options,
      correctAnswer,
      explanation,
      difficulty: difficulty || 'medium'
    });

    const savedQuestion = await newQuestion.save();
    res.json(savedQuestion);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/admin/questions/:id
// @desc    Update a question
// @access  Admin
router.put('/questions/:id', [auth, admin], async (req, res) => {
  try {
    const { category, question, options, correctAnswer, explanation, difficulty } = req.body;
    
    // Build question object
    const questionFields = {};
    if (category) questionFields.category = category;
    if (question) questionFields.question = question;
    if (options) questionFields.options = options;
    if (correctAnswer !== undefined) questionFields.correctAnswer = correctAnswer;
    if (explanation) questionFields.explanation = explanation;
    if (difficulty) questionFields.difficulty = difficulty;
    
    let questionItem = await Question.findById(req.params.id);
    
    if (!questionItem) {
      return res.status(404).json({ msg: 'Question not found' });
    }
    
    questionItem = await Question.findByIdAndUpdate(
      req.params.id,
      { $set: questionFields },
      { new: true }
    );
    
    res.json(questionItem);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/admin/questions/:id
// @desc    Delete a question
// @access  Admin
router.delete('/questions/:id', [auth, admin], async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ msg: 'Question not found' });
    }
    
    await Question.findByIdAndRemove(req.params.id);
    
    res.json({ msg: 'Question removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/admin/users
// @desc    Get all users with pagination
// @access  Admin
router.get('/users', [auth, admin], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';
    const plan = req.query.plan ? req.query.plan.trim().toLowerCase() : '';
    const status = req.query.status ? req.query.status.trim() : '';

    // Build query
    const query = {};
    
    // Add search condition with exact match priority
    if (search) {
      // Try exact match first
      const exactMatch = await User.findOne({
        $or: [
          { name: search }, // Exact match for name
          { email: search } // Exact match for email
        ]
      }).select('-password');

      if (exactMatch) {
        // If exact match found, return only that user
        return res.json({
          users: [exactMatch],
          total: 1,
          page: 1,
          pages: 1
        });
      }

      // If the search term is a number or email, do exact match only
      if (/^\d+$/.test(search) || search.includes('@')) {
        query.$or = [
          { name: search },
          { email: search }
        ];
      } else {
        // For text searches, allow partial matches
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }
    }

    // Add plan filter
    if (plan) {
      // Handle the case where no subscription means basic plan
      if (plan === 'basic') {
        query.$or = [
          { 'subscription.plan': 'basic' },
          { 'subscription.plan': { $exists: false } },
          { 'subscription': { $exists: false } }
        ];
      } else {
        query['subscription.plan'] = plan;
      }
    }

    // Add status filter
    if (status) {
      query.status = status;
    }

    console.log('Search query:', JSON.stringify(query, null, 2));
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await User.countDocuments(query);
    
    res.json({
      users,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Error in /users route:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/admin/users/:id
// @desc    Update user role or subscription
// @access  Admin
router.put('/users/:id', [auth, admin], async (req, res) => {
  try {
    const { role, subscription } = req.body;
    
    // Build user object
    const userFields = {};
    if (role) userFields.role = role;
    if (subscription) userFields.subscription = subscription;
    
    let user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: userFields },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/admin/stats
// @desc    Get admin dashboard statistics
// @access  Admin
router.get('/stats', [auth, admin], async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const today = new Date();
    const startDate = new Date(today.setDate(today.getDate() - days));

    // Get total users and premium users
    const totalUsers = await User.countDocuments();
    const premiumUsers = await User.countDocuments({ 
      'subscription.plan': { $in: ['premium', 'lifetime'] },
      'subscription.status': 'active'
    });

    // Get user growth data
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get total tests and test completion data
    const totalTests = await Test.countDocuments();
    const testCompletion = await Test.aggregate([
      {
        $match: {
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get category performance data
    const categoryPerformance = await Test.aggregate([
      {
        $match: {
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalScore: { $avg: "$score" },
          categories: {
            $push: {
              category: "$category",
              score: "$score"
            }
          }
        }
      }
    ]);

    // Get subscription distribution
    const subscriptionData = await User.aggregate([
      {
        $group: {
          _id: "$subscription.plan",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get payment methods distribution - not needed anymore as all features are free
    // const paymentMethods = await Payment.aggregate([
    //   {
    //     $group: {
    //       _id: "$paymentMethod",
    //       count: { $sum: 1 }
    //     }
    //   }
    // ]);
    const paymentMethods = [];

    // Calculate revenue data
    const revenueData = async () => {
      try {
        // Payment functionality removed as all features are now free
        // const revenue = await Payment.aggregate([
        //   { $match: { status: "completed" } },
        //   {
        //     $group: {
        //       _id: {
        //         year: { $year: "$createdAt" },
        //         month: { $month: "$createdAt" }
        //       },
        //       total: { $sum: "$amount" }
        //     }
        //   },
        //   { $sort: { "_id.year": 1, "_id.month": 1 } }
        // ]);
        
        // Placeholder for revenue data
        const revenue = [];
        
        // Rest of the function continues...
      } catch (err) {
        console.error('Error calculating revenue:', err);
        return [];
      }
    };

    // Get recent activity
    const recentActivity = await Promise.all([
      // Recent user registrations
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name email createdAt'),
      
      // Recent tests
      Test.find()
        .populate('user', 'name email')
        .sort({ completedAt: -1 })
        .limit(5),
      
      // Recent payments - replaced with empty array as all features are now free
      // Payment.find({ status: "completed" })
      //   .populate('user', 'name email')
      //   .sort({ createdAt: -1 })
      //   .limit(5)
      []
    ]);

    // Format recent activity
    const formattedActivity = [
      ...recentActivity[0].map(user => ({
        type: 'registration',
        description: `${user.name} (${user.email}) registered`,
        timestamp: user.createdAt
      })),
      ...recentActivity[1].map(test => ({
        type: 'test',
        description: `${test.user ? test.user.name : 'A user'} completed a test with score ${test.score}%`,
        timestamp: test.completedAt || test.createdAt
      })),
      // Payment activities removed as all features are now free
      // ...recentActivity[2].map(payment => ({
      //   type: 'payment',
      //   description: `${payment.user ? payment.user.name : 'A user'} made a payment of ${formatCurrency(payment.amount)}`,
      //   timestamp: payment.createdAt
      // }))
    ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

    // Calculate trends
    const calculateTrend = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    // Format dates for consistent data points
    const formatDateRange = () => {
      const dates = [];
      const currentDate = new Date(startDate);
      while (currentDate <= today) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return dates;
    };

    const dateRange = formatDateRange();
    const userGrowthMap = new Map(userGrowth.map(item => [item._id, item.count]));
    const testCompletionMap = new Map(testCompletion.map(item => [item._id, item.count]));

    const formattedUserGrowth = dateRange.map(date => ({
      label: date,
      value: userGrowthMap.get(date) || 0
    }));

    const formattedTestCompletion = dateRange.map(date => ({
      label: date,
      value: testCompletionMap.get(date) || 0
    }));

    res.json({
      totalUsers,
      premiumUsers,
      totalTests,
      revenue: revenue[0]?.total || 0,
      usersTrend: calculateTrend(currentPeriodUsers, previousPeriodUsers),
      premiumTrend: calculateTrend(currentPeriodPremium, previousPeriodPremium),
      testsTrend: calculateTrend(currentPeriodTests, previousPeriodTests),
      revenueTrend: calculateTrend(
        currentPeriodRevenue[0]?.total || 0,
        previousPeriodRevenue[0]?.total || 0
      ),
      userGrowth: {
        labels: formattedUserGrowth.map(item => item.label),
        data: formattedUserGrowth.map(item => item.value)
      },
      testCompletion: {
        labels: formattedTestCompletion.map(item => item.label),
        data: formattedTestCompletion.map(item => item.value)
      },
      categoryPerformance: {
        labels: ['Australian Democracy', 'Laws and Government', 'Australian History', 'Australian Society'],
        data: categoryPerformance[0]?.categories?.map(c => c.score) || [0, 0, 0, 0]
      },
      subscriptionDistribution: {
        labels: ['Basic', 'Premium', 'Lifetime'],
        data: subscriptionData.map(item => item.count || 0)
      },
      paymentMethods: {
        labels: ['Payment Methods'],
        data: paymentMethods.map(item => item.count || 0)
      },
      recentActivity: formattedActivity
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/admin/users
// @desc    Create a new user
// @access  Admin
router.post('/users', [
  auth,
  admin,
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    check('plan', 'Subscription plan is required').isIn(['basic', 'premium', 'lifetime']),
    check('status', 'Status is required').isIn(['active', 'inactive'])
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, plan, status } = req.body;

  try {
    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ errors: [{ msg: 'User already exists' }] });
    }

    // Create new user
    user = new User({
      name,
      email,
      status,
      subscription: {
        plan,
        status: 'active',
        startDate: new Date(),
        endDate: plan === 'premium' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null // 30 days for premium
      },
      passwordChangeRequired: true // Force password change on first login
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    // Return user without password
    const userToReturn = await User.findById(user._id).select('-password');
    res.json(userToReturn);
  } catch (err) {
    console.error('Error creating user:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/admin/questions/import
// @desc    Import questions in bulk
// @access  Admin
router.post('/questions/import', [auth, admin, upload.single('file')], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    const questions = [];
    const errors = [];
    let processedCount = 0;

    if (req.file.mimetype === 'text/csv') {
      // Process CSV file
      const parser = fs.createReadStream(req.file.path).pipe(csv({
        columns: true,
        skip_empty_lines: true,
        trim: true
      }));

      for await (const record of parser) {
        processedCount++;
        try {
          // Validate record
          if (!record.category || !record.question || !record.correctAnswer || 
              !record.option1 || !record.option2) {
            errors.push(`Row ${processedCount}: Missing required fields`);
            continue;
          }

          // Create options array
          const options = [
            record.option1,
            record.option2,
            record.option3,
            record.option4
          ].filter(Boolean); // Remove empty options

          questions.push({
            category: record.category,
            question: record.question,
            options: options,
            correctAnswer: parseInt(record.correctAnswer) - 1, // Convert to 0-based index
            explanation: record.explanation || '',
            difficulty: record.difficulty || 'medium'
          });
        } catch (err) {
          errors.push(`Row ${processedCount}: ${err.message}`);
        }
      }
    } else if (req.file.mimetype === 'application/json') {
      // Process JSON file
      const jsonData = JSON.parse(fs.readFileSync(req.file.path, 'utf8'));
      
      if (!Array.isArray(jsonData)) {
        throw new Error('JSON file must contain an array of questions');
      }

      for (const record of jsonData) {
        processedCount++;
        try {
          // Validate record
          if (!record.category || !record.question || !record.correctAnswer || 
              !Array.isArray(record.options) || record.options.length < 2) {
            errors.push(`Question ${processedCount}: Missing required fields`);
            continue;
          }

          questions.push({
            category: record.category,
            question: record.question,
            options: record.options,
            correctAnswer: record.correctAnswer,
            explanation: record.explanation || '',
            difficulty: record.difficulty || 'medium'
          });
        } catch (err) {
          errors.push(`Question ${processedCount}: ${err.message}`);
        }
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    if (questions.length === 0) {
      return res.status(400).json({
        msg: 'No valid questions found in file',
        errors
      });
    }

    // Insert questions in bulk
    await Question.insertMany(questions);

    res.json({
      msg: `Successfully imported ${questions.length} questions`,
      totalProcessed: processedCount,
      successCount: questions.length,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error('Error importing questions:', err);
    res.status(500).json({
      msg: 'Error importing questions',
      error: err.message
    });
  }
});

// Helper function to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD'
  }).format(amount);
}

module.exports = router; 