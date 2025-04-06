const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from header
  const authHeader = req.header('Authorization');
  let token = null;
  
  if (authHeader) {
    // Handle both "Bearer token" and just "token" formats
    token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  }
  
  console.log('Auth middleware - Token present:', !!token);

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth middleware - Token verified for user:', decoded.user.id);
    
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error('Auth middleware - Token verification error:', err.message);
    res.status(401).json({ msg: 'Token is not valid', error: err.message });
  }
}; 