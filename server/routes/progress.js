const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Question = require('../models/Question');

// @route   GET api/progress
// @desc    Get user progress
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('progress');
    res.json(user.progress);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/progress/test
// @desc    Submit test results and update progress
// @access  Private
router.post('/test', auth, async (req, res) => {
  try {
    const { score, totalQuestions, timeTaken, categoryResults } = req.body;
    
    const user = await User.findById(req.user.id);
    
    // Update overall progress
    user.progress.testsCompleted += 1;
    user.progress.questionsAnswered += totalQuestions;
    user.progress.correctAnswers += score;
    
    // Add test to history
    user.progress.testHistory.push({
      date: Date.now(),
      score,
      totalQuestions,
      timeTaken
    });
    
    // Update category progress
    if (categoryResults) {
      Object.keys(categoryResults).forEach(category => {
        if (user.progress.categoryProgress[category]) {
          user.progress.categoryProgress[category].attempted += categoryResults[category].attempted;
          user.progress.categoryProgress[category].correct += categoryResults[category].correct;
        }
      });
    }
    
    await user.save();
    
    res.json(user.progress);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/progress/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('progress');
    
    // Calculate overall accuracy
    const accuracy = user.progress.questionsAnswered > 0 
      ? (user.progress.correctAnswers / user.progress.questionsAnswered) * 100 
      : 0;
    
    // Calculate category accuracies
    const categoryAccuracies = {};
    Object.keys(user.progress.categoryProgress).forEach(category => {
      const { attempted, correct } = user.progress.categoryProgress[category];
      categoryAccuracies[category] = attempted > 0 ? (correct / attempted) * 100 : 0;
    });
    
    // Get recent tests
    const recentTests = user.progress.testHistory
      .sort((a, b) => b.date - a.date)
      .slice(0, 5);
    
    res.json({
      totalTests: user.progress.testsCompleted,
      questionsAnswered: user.progress.questionsAnswered,
      correctAnswers: user.progress.correctAnswers,
      accuracy: accuracy.toFixed(2),
      categoryAccuracies,
      recentTests
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 