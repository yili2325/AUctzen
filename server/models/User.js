const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  subscription: {
    plan: {
      type: String,
      enum: ['basic', 'premium', 'lifetime'],
      default: 'basic'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'expired'],
      default: 'active'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: null
    },
    paymentReference: {
      type: String
    }
  },
  provider: {
    type: String,
    enum: ['email', 'google', 'facebook', 'apple'],
    default: 'email'
  },
  providerId: String,
  progress: {
    testsCompleted: {
      type: Number,
      default: 0
    },
    questionsAnswered: {
      type: Number,
      default: 0
    },
    correctAnswers: {
      type: Number,
      default: 0
    },
    categoryProgress: {
      'Australian Democracy': {
        attempted: { type: Number, default: 0 },
        correct: { type: Number, default: 0 }
      },
      'Laws and Government': {
        attempted: { type: Number, default: 0 },
        correct: { type: Number, default: 0 }
      },
      'Australian History': {
        attempted: { type: Number, default: 0 },
        correct: { type: Number, default: 0 }
      },
      'Australian Society': {
        attempted: { type: Number, default: 0 },
        correct: { type: Number, default: 0 }
      }
    },
    testHistory: [{
      date: {
        type: Date,
        default: Date.now
      },
      score: {
        type: Number
      },
      totalQuestions: {
        type: Number
      },
      timeTaken: {
        type: Number
      }
    }]
  },
  // Track recently served questions to avoid repeats
  recentQuestions: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: null
  },
  date: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', UserSchema);

// Example server-side code to get all users
const getAllUsers = async () => {
  try {
    const users = await User.find().select('-password');
    console.log(users);
    return users;
  } catch (err) {
    console.error('Error fetching users:', err);
    throw err;
  }
}; 