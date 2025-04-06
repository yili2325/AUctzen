const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Practice = require('../models/Practice');

// @route   GET api/recommendations
// @desc    Get personalized recommendations
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        // Get user ID from auth middleware
        const userId = req.user.id;
        
        // Get category performance
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
        
        // Format the category scores
        const categories = Object.keys(categoryScores).map(category => {
            const { totalScore, count } = categoryScores[category];
            const averageScore = Math.round(totalScore / count);
            
            return {
                category,
                score: averageScore
            };
        });
        
        // Sort by score (ascending) to find weakest areas
        categories.sort((a, b) => a.score - b.score);
        
        // Generate recommendations
        const recommendations = categories.slice(0, 3).map(category => {
            let recommendation = '';
            
            if (category.score < 50) {
                recommendation = `You need significant improvement in ${category.category}. Focus on the core concepts and practice regularly.`;
            } else if (category.score < 75) {
                recommendation = `You're making progress in ${category.category}, but need more practice to pass the test. Review the key points.`;
            } else {
                recommendation = `You're doing well in ${category.category}. Keep practicing to maintain your knowledge.`;
            }
            
            return {
                category: category.category,
                score: category.score,
                recommendation
            };
        });
        
        // If no data, provide default recommendations
        if (recommendations.length === 0) {
            return res.json([
                {
                    category: 'Australian Democracy',
                    score: 0,
                    recommendation: 'Start with the basics of Australian democracy and government structure.'
                },
                {
                    category: 'Australian History',
                    score: 0,
                    recommendation: 'Learn about key events and figures in Australian history.'
                }
            ]);
        }
        
        res.json(recommendations);
        
    } catch (err) {
        console.error('Error generating recommendations:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router; 