const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Practice = require('../models/Practice');

// @route   GET api/performance/category
// @desc    Get user performance by category
// @access  Private
router.get('/category', auth, async (req, res) => {
    try {
        // Get user ID from auth middleware
        const userId = req.user.id;
        
        // Get all practice sessions
        const practices = await Practice.find({ user: userId });
        
        // Group by category and calculate average scores
        const categoryScores = {};
        
        practices.forEach(practice => {
            if (!categoryScores[practice.category]) {
                categoryScores[practice.category] = {
                    totalScore: 0,
                    count: 0
                };
            }
            
            categoryScores[practice.category].totalScore += practice.score;
            categoryScores[practice.category].count += 1;
        });
        
        // Format the response
        const categoryPerformance = Object.keys(categoryScores).map(category => {
            const { totalScore, count } = categoryScores[category];
            const averageScore = Math.round(totalScore / count);
            
            return {
                category,
                score: averageScore
            };
        });
        
        // If no data, provide default categories
        if (categoryPerformance.length === 0) {
            return res.json([
                { category: 'Australian Democracy', score: 0 },
                { category: 'Laws and Government', score: 0 },
                { category: 'Australian History', score: 0 },
                { category: 'National Symbols', score: 0 }
            ]);
        }
        
        res.json(categoryPerformance);
        
    } catch (err) {
        console.error('Error fetching category performance:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/performance/progress
// @desc    Get user progress over time
// @access  Private
router.get('/progress', auth, async (req, res) => {
    try {
        // Get user ID from auth middleware
        const userId = req.user.id;
        
        // Get all practice sessions and tests, sorted by date
        const practices = await Practice.find({ user: userId })
            .sort({ date: 1 })
            .select('score date');
        
        // Format dates and scores
        const dates = [];
        const scores = [];
        
        practices.forEach(practice => {
            const date = new Date(practice.date);
            dates.push(date.toLocaleDateString());
            scores.push(practice.score);
        });
        
        // If no data, provide sample data
        if (dates.length === 0) {
            const today = new Date();
            const sampleDates = [];
            const sampleScores = [];
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(today.getDate() - i);
                sampleDates.push(date.toLocaleDateString());
                sampleScores.push(0);
            }
            
            return res.json({
                dates: sampleDates,
                scores: sampleScores
            });
        }
        
        res.json({
            dates,
            scores
        });
        
    } catch (err) {
        console.error('Error fetching progress data:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router; 