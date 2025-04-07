const mongoose = require('mongoose');
require('dotenv').config();

mongoose.set('strictQuery', false);

let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("❌ MONGO_URI is not defined in environment variables.");
    return null;
  }

  if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
    console.log(`⚠️ Max connection attempts (${MAX_CONNECTION_ATTEMPTS}) reached. Stopping.`);
    return null;
  }

  connectionAttempts++;
  console.log(`🔄 Attempting MongoDB connection (${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})`);
  console.log(`🌐 Connecting to: ${uri}`);

  try {
    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📂 Database: ${conn.connection.name}`);
    connectionAttempts = 0;

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Will attempt reconnect...');
      const backoff = Math.min(1000 * (2 ** connectionAttempts), 30000);
      setTimeout(connectDB, backoff);
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔁 MongoDB reconnected successfully');
      connectionAttempts = 0;
    });

    return conn;
  } catch (err) {
    console.error('❌ MongoDB Connection Failed:', err.message);
    const backoff = Math.min(1000 * (2 ** connectionAttempts), 30000);
    console.log(`🔁 Retrying in ${backoff / 1000}s`);
    setTimeout(connectDB, backoff);
    return null;
  }
};

module.exports = connectDB;
