const mongoose = require('mongoose');

const practiceProgressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    setsCompleted: {
        type: Number,
        default: 0
    },
    totalSetsAllowed: {
        type: Number,
        default: 2 // Basic users get 2 sets
    },
    practiceHistory: [{
        setNumber: Number,
        score: Number,
        totalQuestions: Number,
        timeTaken: Number,
        completedAt: {
            type: Date,
            default: Date.now
        },
        accuracy: Number
    }],
    lastPracticeDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Add method to check if user can start new practice set
practiceProgressSchema.methods.canStartNewSet = function() {
    if (this.setsCompleted >= this.totalSetsAllowed) {
        return false;
    }
    return true;
};

// Add method to record practice set completion
practiceProgressSchema.methods.recordSetCompletion = function(setResults) {
    if (this.setsCompleted >= this.totalSetsAllowed) {
        throw new Error('Maximum practice sets reached');
    }

    this.practiceHistory.push({
        setNumber: this.setsCompleted + 1,
        score: setResults.score,
        totalQuestions: setResults.totalQuestions,
        timeTaken: setResults.timeTaken,
        accuracy: Math.round((setResults.score / setResults.totalQuestions) * 100)
    });

    this.setsCompleted += 1;
    this.lastPracticeDate = new Date();

    return this.save();
};

const PracticeProgress = mongoose.model('PracticeProgress', practiceProgressSchema);

module.exports = PracticeProgress; 