const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Question = require('../models/Question');
const PracticeProgress = require('../models/PracticeProgress');

// Get user's practice progress
router.get('/progress', auth, async (req, res) => {
    try {
        let progress = await PracticeProgress.findOne({ userId: req.user.id });
        if (!progress) {
            progress = await PracticeProgress.create({
                userId: req.user.id,
                setsCompleted: 0
            });
        }
        res.json(progress);
    } catch (error) {
        console.error('Error getting practice progress:', error);
        res.status(500).send('Server Error');
    }
});

// Get random questions for practice set
router.get('/questions/random/:count', auth, async (req, res) => {
    try {
        const count = parseInt(req.params.count);
        if (isNaN(count) || count <= 0) {
            return res.status(400).json({ msg: 'Invalid count parameter' });
        }

        // Check if user can start a new set
        let progress = await PracticeProgress.findOne({ userId: req.user.id });
        if (!progress) {
            progress = await PracticeProgress.create({ userId: req.user.id });
        }

        if (!progress.canStartNewSet() && !req.user.isPremium) {
            return res.status(403).json({ 
                msg: 'You have completed all available practice sets'
            });
        }

        // Get previously used question IDs for this user
        const usedQuestionIds = progress.practiceHistory.reduce((ids, set) => {
            if (set.questionIds) {
                ids.push(...set.questionIds);
            }
            return ids;
        }, []);

        // Get random questions excluding previously used ones
        const questions = await Question.aggregate([
            { $match: { _id: { $nin: usedQuestionIds } } },
            { $sample: { size: count } }
        ]);

        if (questions.length < count) {
            // If not enough unused questions, get random ones (may include some duplicates)
            const remainingCount = count - questions.length;
            const additionalQuestions = await Question.aggregate([
                { $sample: { size: remainingCount } }
            ]);
            questions.push(...additionalQuestions);
        }

        res.json(questions);
    } catch (error) {
        console.error('Error getting random questions:', error);
        res.status(500).send('Server Error');
    }
});

// Submit practice results
router.post('/results', auth, async (req, res) => {
    try {
        const { score, totalQuestions, timeRemaining, currentSet } = req.body;
        let progress = await PracticeProgress.findOne({ userId: req.user.id });
        
        if (!progress) {
            progress = await PracticeProgress.create({ userId: req.user.id });
        }

        // For basic users, enforce sequential set completion and limits
        if (!req.user.isPremium) {
            if (currentSet !== progress.setsCompleted + 1) {
                return res.status(400).json({ 
                    msg: 'Sets must be completed in order'
                });
            }

            if (progress.setsCompleted >= progress.totalSetsAllowed) {
                return res.status(403).json({ 
                    msg: 'You have completed all available practice sets'
                });
            }
        }

        // Calculate time taken (45 minutes = 2700 seconds)
        const timeTaken = 2700 - timeRemaining;

        // Record set completion
        await progress.recordSetCompletion({
            score,
            totalQuestions,
            timeTaken
        });
        
        res.json(progress);
    } catch (error) {
        console.error('Error submitting results:', error);
        res.status(500).send('Server Error');
    }
});

module.exports = router; 