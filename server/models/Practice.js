const mongoose = require('mongoose');

const PracticeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    category: {
        type: String,
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
    duration: {
        type: Number,  // in minutes
        default: 0
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('practice', PracticeSchema); 