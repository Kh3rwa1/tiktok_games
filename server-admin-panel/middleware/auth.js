const { admin: firebaseAdmin } = require('../config/firebase');
const User = require('../models/firestore/User');

// Middleware to verify Firebase ID token
const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify Firebase ID token
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);

      // Get user from Firestore
      req.user = await User.findById(decodedToken.uid);

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      if (!req.user.isActive) {
        return res.status(401).json({ message: 'User account is inactive' });
      }

      // Add Firebase UID to request
      req.uid = decodedToken.uid;

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({
        message: 'Not authorized, token failed',
        error: error.message
      });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Middleware to check if user is admin
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin only.' });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
      req.user = await User.findById(decodedToken.uid);
      req.uid = decodedToken.uid;
    } catch (error) {
      // If token is invalid, just continue without user
      req.user = null;
      req.uid = null;
    }
  }

  next();
};

// Verify email verification status
const requireEmailVerification = async (req, res, next) => {
  try {
    if (!req.uid) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const userRecord = await firebaseAdmin.auth().getUser(req.uid);

    if (!userRecord.emailVerified) {
      return res.status(403).json({
        message: 'Email verification required',
        emailVerified: false
      });
    }

    next();
  } catch (error) {
    console.error('Email verification check error:', error);
    return res.status(500).json({ message: 'Error checking email verification' });
  }
};

module.exports = { protect, adminOnly, optionalAuth, requireEmailVerification };
