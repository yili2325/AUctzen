const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Question = require('../models/Question');
const User = require('../models/User');
const Test = require('../models/Test');
const mongoose = require('mongoose');

// @route   GET api/questions
// @desc    Get all questions
// @access  Public
router.get('/', async (req, res) => {
  try {
    const questions = await Question.find().sort({ category: 1 });
    res.json(questions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/questions/category/:category
// @desc    Get questions by category
// @access  Public
router.get('/category/:category', async (req, res) => {
  try {
    const questions = await Question.find({ category: req.params.category });
    res.json(questions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/questions/random/:count?
// @desc    Get random questions, optionally limited by count
// @access  Public
router.get('/random/:count?', async (req, res) => {
  try {
    const count = req.params.count ? parseInt(req.params.count) : 20;
    const questions = await Question.aggregate([{ $sample: { size: count } }]);
    res.json(questions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/questions/practice
// @desc    Get questions for practice
// @access  Private
router.get('/practice', auth, async (req, res) => {
    try {
        console.log('Fetching practice questions...');
        const { category } = req.query;
        
        // Get user subscription info
        const user = await User.findById(req.user.id);
        const subscription = user.subscription?.plan || 'basic';
        console.log('User subscription:', subscription);
        
        // Valid categories from the actual database
        const validCategories = [
            'Australia and its people',
            'Australian values',
            'Australia\'s democratic beliefs, rights and liberties',
            'Government and the law in Australia'
        ];
        
        // Function to normalize apostrophes for comparison
        const normalize = (str) => str ? str.toLowerCase().replace(/[‘’'`]/g, "'") : str;

        // Check if category is valid
        let categoryFilter = null;
        if (category) {
            const normalizedCategory = normalize(category);
            console.log(`Category filter requested: "${category}", Normalized: "${normalizedCategory}"`);
            
            // Allow category filtering for premium and lifetime users
            if (subscription === 'premium' || subscription === 'lifetime') {
                // Find a match by comparing normalized versions
                const matchedCategory = validCategories.find(
                    validCat => normalize(validCat) === normalizedCategory
                );
                
                if (matchedCategory) {
                    // Use the exact category name from validCategories for the database query
                    categoryFilter = matchedCategory;
                    console.log(`Premium or lifetime user filtering by valid category: "${categoryFilter}" (Matched via normalized: "${normalizedCategory}")`);
                } else {
                    console.log(`Requested category "${category}" (Normalized: "${normalizedCategory}") not found in valid categories after normalization.`);
                    console.log('Valid categories:', validCategories);
                    console.log('Normalized valid categories:', validCategories.map(normalize));
                    return res.status(404).json({
                        message: `Category not found: "${category}". Available categories: ${validCategories.join(', ')}`,
                        availableCategories: validCategories
                    });
                }
            } else {
                console.log('Basic user attempting to filter by category - ignoring filter');
            }
        }
        
        // Build query - filter by category for premium and lifetime users if specified
        const query = {};
        if (categoryFilter) {
            query.category = categoryFilter;
        }
        
        console.log('Database query:', query);

        // Query questions from the database
        let questions = [];
        try {
            questions = await Question.find(query).lean();
            console.log(`Found ${questions.length} questions in database${categoryFilter ? ` for category: "${categoryFilter}"` : ''}`);
        } catch (queryError) {
            console.error('Error querying questions:', queryError);
            return res.status(500).json({
                message: 'Failed to query questions from database',
                error: queryError.message
            });
        }

        if (!questions || questions.length === 0) {
            const message = categoryFilter 
                ? `No questions found for category: "${categoryFilter}"` 
                : 'No questions found in database';
            
            console.log(message);
            return res.status(404).json({
                message,
                availableCategories: validCategories,
                total: 0
            });
        }

        // Get user's recently served questions to avoid repeats 
        // Use custom property on user or get from practice history
        const recentQuestionsIds = user.recentQuestions || [];
        
        // Filter out recently served questions if possible
        let availableQuestions = questions;
        if (recentQuestionsIds.length > 0 && questions.length > 25) {
            availableQuestions = questions.filter(q => !recentQuestionsIds.includes(q._id.toString()));
            console.log(`Filtered out ${questions.length - availableQuestions.length} recently served questions`);
            
            // If filtering resulted in too few questions, use all questions
            if (availableQuestions.length < 20) {
                console.log('Too few questions after filtering recents, using all questions');
                availableQuestions = questions;
            }
        }

        // Randomly select 20 questions
        const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, Math.min(20, shuffled.length));
        
        console.log(`Selected ${selected.length} questions for practice`);
        
        // Save these questions as recently served
        const selectedIds = selected.map(q => q._id.toString());
        
        // Update user's recent questions - keep only the most recent 100
        try {
            user.recentQuestions = [...selectedIds, ...(user.recentQuestions || [])].slice(0, 100);
            await user.save();
            console.log('Updated user recent questions list');
        } catch (updateError) {
            console.error('Failed to update user recent questions:', updateError);
            // Continue serving questions even if we can't update recent questions
        }
        
        // Transform questions to match frontend expectations
        const transformedQuestions = selected.map(q => ({
            _id: q._id.toString(),
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            category: q.category,
            explanation: q.explanation || ""
        }));
        
        // Return the questions along with metadata
        return res.json({
            subscription,
            category: categoryFilter || 'All',
            total: questions.length,
            selected: selected.length,
            questions: transformedQuestions,
            availableCategories: validCategories
        });
        
    } catch (err) {
        console.error('Error fetching practice questions:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/questions
// @desc    Add a new question
// @access  Private (admin only)
router.post(
  '/',
  [
    auth,
    [
      check('question', 'Question is required').not().isEmpty(),
      check('category', 'Category is required').not().isEmpty(),
      check('options', 'At least 2 options are required').isArray({ min: 2 }),
      check('correctAnswer', 'Correct answer is required').isNumeric()
    ]
  ],
  async (req, res) => {
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
        difficulty
      });

      const savedQuestion = await newQuestion.save();
      res.json(savedQuestion);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   POST api/questions/:id/check
// @desc    Check answer for a question
// @access  Private
router.post('/:id/check', auth, async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ msg: 'Question not found' });
        }

        const { answer } = req.body;
        const correct = answer === question.correctAnswer;

        // Get user subscription for response customization
        const user = await User.findById(req.user.id);
        const subscription = user.subscription?.plan || 'basic';

        // Track the answer in user's history
        await Test.create({
            user: req.user.id,
            question: question._id,
            userAnswer: answer,
            correct,
            category: question.category
        });

        res.json({
            correct,
            // Only include explanation for premium/lifetime users
            explanation: subscription !== 'basic' ? question.explanation : null
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get category statistics
router.get('/category-stats', async (req, res) => {
    try {
        const questions = await Question.find({}).lean();
        
        // Group questions by category
        const categoryStats = {};
        questions.forEach(question => {
            const category = question.category || 'Uncategorized';
            if (!categoryStats[category]) {
                categoryStats[category] = 0;
            }
            categoryStats[category]++;
        });
        
        // Convert to array for easier consumption
        const stats = Object.entries(categoryStats).map(([category, count]) => ({
            category,
            count
        }));
        
        res.json({
            totalQuestions: questions.length,
            categories: stats
        });
    } catch (err) {
        console.error('Error getting category stats:', err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router; 