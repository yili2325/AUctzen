const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Test = require('../models/Test');
const Practice = require('../models/Practice');

// @route   GET api/stats
// @desc    Get user stats
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        // Get user ID from auth middleware
        const userId = req.user.id;
        
        // Get user tests and practice sessions
        const tests = await Test.find({ user: userId });
        const practices = await Practice.find({ user: userId });
        
        // Calculate average score
        let totalScore = 0;
        let totalSessions = 0;
        
        if (tests.length > 0) {
            totalScore += tests.reduce((sum, test) => sum + test.score, 0);
            totalSessions += tests.length;
        }
        
        if (practices.length > 0) {
            totalScore += practices.reduce((sum, practice) => sum + practice.score, 0);
            totalSessions += practices.length;
        }
        
        const averageScore = totalSessions > 0 ? Math.round(totalScore / totalSessions) : 0;
        
        // Calculate total practice time
        const practiceTimeMinutes = practices.reduce((sum, practice) => {
            return sum + (practice.duration || 0);
        }, 0);
        
        // Count questions answered
        const questionsAnswered = tests.reduce((sum, test) => {
            return sum + (test.questionsAnswered || 0);
        }, 0) + practices.reduce((sum, practice) => {
            return sum + (practice.questionsAnswered || 0);
        }, 0);
        
        // Count tests passed (score >= 75%)
        const testsPassed = tests.filter(test => test.score >= 75).length;
        
        res.json({
            averageScore,
            practiceTimeMinutes,
            questionsAnswered,
            testsPassed
        });
        
    } catch (err) {
        console.error('Error fetching user stats:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router; 