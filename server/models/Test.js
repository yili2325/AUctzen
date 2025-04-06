const mongoose = require('mongoose');

const TestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    score: {
        type: Number,
        required: true
    },
    questionsAnswered: {
        type: Number,
        required: true
    },
    correctAnswers: {
        type: Number,
        required: true
    },
    passed: {
        type: Boolean,
        default: false
    },
    questions: [{
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question',
            required: true
        },
        category: {
            type: String,
            required: true
        },
        isCorrect: {
            type: Boolean,
            required: true
        }
    }],
    date: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('test', TestSchema); 