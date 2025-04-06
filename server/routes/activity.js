const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Test = require('../models/Test');
const Practice = require('../models/Practice');

// @route   GET api/activity
// @desc    Get user activity
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        // Get user ID from auth middleware
        const userId = req.user.id;
        
        // Get user tests
        const tests = await Test.find({ user: userId })
            .sort({ date: -1 })
            .limit(5)
            .select('score date');
        
        // Get user practice sessions
        const practices = await Practice.find({ user: userId })
            .sort({ date: -1 })
            .limit(5)
            .select('category score date');
        
        // Combine and format the activities
        const testActivities = tests.map(test => ({
            type: 'test',
            score: test.score,
            date: test.date
        }));
        
        const practiceActivities = practices.map(practice => ({
            type: 'practice',
            category: practice.category,
            score: practice.score,
            date: practice.date
        }));
        
        // Combine and sort by date (newest first)
        const activities = [...testActivities, ...practiceActivities]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10); // Limit to 10 most recent activities
        
        res.json(activities);
        
    } catch (err) {
        console.error('Error fetching user activity:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router; 