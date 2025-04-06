const mongoose = require('mongoose');
require('dotenv').config();

// Set strictQuery to false to suppress deprecation warning
mongoose.set('strictQuery', false);

// Track connection attempts to prevent infinite retry loops
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;

const connectDB = async () => {
  if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
    console.log(`Maximum connection attempts (${MAX_CONNECTION_ATTEMPTS}) reached. Using offline mode.`);
    return null;
  }

  connectionAttempts++;
  
  try {
    console.log(`Attempting to connect to MongoDB (Attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})...`);
    console.log(`Connection URI: ${process.env.MONGO_URI ? 'mongodb://localhost:27017/auscitizen' : 'URI not found in environment'}`);
    
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/auscitizen', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      maxPoolSize: 10,
      keepAlive: true,
      keepAliveInitialDelay: 300000
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database Name: ${conn.connection.name}`);
    
    // Reset connection attempts on successful connection
    connectionAttempts = 0;
    
    // Add event listeners for connection issues
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected. Attempting to reconnect...');
      
      // Use exponential backoff for reconnection attempts
      const backoffTime = Math.min(1000 * (2 ** connectionAttempts), 30000);
      console.log(`Will attempt reconnection in ${backoffTime/1000} seconds`);
      
      setTimeout(() => {
        connectDB();
      }, backoffTime);
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
      connectionAttempts = 0;
    });

    return conn;
  } catch (err) {
    console.error(`MongoDB Connection Error: ${err.message}`);
    console.error(`Error stack: ${err.stack}`);
    
    if (err.name === 'MongoServerSelectionError') {
      console.error('Could not connect to MongoDB server. Make sure MongoDB is running on localhost:27017');
      console.log('The application will continue in offline mode with limited functionality');
      
      // In a production application, you might want to implement a fallback mechanism here
      // For now, we'll just let the application continue without MongoDB
      return null;
    }
    
    // For other errors, we'll retry with exponential backoff
    const backoffTime = Math.min(1000 * (2 ** connectionAttempts), 30000);
    console.log(`Will attempt reconnection in ${backoffTime/1000} seconds`);
    
    setTimeout(() => {
      connectDB();
    }, backoffTime);
    
    return null;
  }
};

module.exports = connectDB; 