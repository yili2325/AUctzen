require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./server/config/db');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const mongoose = require('mongoose');
require("dotenv").config();
console.log("Gemini API key:", process.env.GEMINI_API_KEY);

const app = express();

// Increase payload size limit to 50MB
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));

// Connect to Database
connectDB();

// Configure CORS
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Define Routes - these must come BEFORE the static file middleware
app.use('/api/auth', require('./server/routes/auth'));
app.use('/api/users', require('./server/routes/users'));
app.use('/api/questions', require('./server/routes/questions'));
app.use('/api/practice', require('./server/routes/practice'));
app.use('/api/ai', require('./server/routes/geminiExplain'));

// Add a test route directly in server.js
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// Add a status endpoint for checking server connectivity
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Add a simple test route
app.get('/api/test-auth', (req, res) => {
  res.json({ 
    message: 'Auth API is working',
    port: server.address().port
  });
});

// Serve static files from the public directory - this should come AFTER API routes
app.use(express.static(path.join(__dirname, 'public')));

// For any route not handled by API or static files, serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 50011;
const HTTPS_PORT = process.env.HTTPS_PORT || 5002;

// Create HTTP server
const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Create HTTPS server
try {
  const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, 'config', 'ssl', 'server.key')),
    cert: fs.readFileSync(path.join(__dirname, 'config', 'ssl', 'server.cert'))
  };
  
  const httpsServer = https.createServer(httpsOptions, app);
  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`HTTPS Server running on https://localhost:${HTTPS_PORT}`);
  });
} catch (error) {
  console.log('HTTPS server not started - SSL certificates not found');
}

//Gemini API
require('dotenv').config();