/**
 * Enhanced Authentication Middleware
 * Provides JWT verification, role checking, and account protection
 */

const jwt = require('jsonwebtoken');
const User = require('../models/mysql/User');
const { config } = require('../config');
const { logAudit } = require('../config/database');

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId, type: 'refresh' }, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn
  });
};

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    return null;
  }
};

/**
 * Check if account is locked
 */
const isAccountLocked = (user) => {
  if (!user.lockedUntil) return false;
  return new Date(user.lockedUntil) > new Date();
};

/**
 * Main authentication middleware
 */
const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      error: 'Not authorized, no token',
      code: 'NO_TOKEN'
    });
  }

  try {
    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        error: 'Not authorized, token invalid',
        code: 'INVALID_TOKEN'
      });
    }

    // Get user from database
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        error: 'Account is deactivated',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Check if account is locked
    if (isAccountLocked(user)) {
      const lockedUntil = new Date(user.lockedUntil);
      return res.status(423).json({
        error: 'Account is temporarily locked',
        lockedUntil: lockedUntil.toISOString(),
        code: 'ACCOUNT_LOCKED'
      });
    }

    // Check if password was changed after token was issued
    if (user.passwordChangedAt) {
      const passwordChangedTime = Math.floor(new Date(user.passwordChangedAt).getTime() / 1000);
      if (decoded.iat < passwordChangedTime) {
        return res.status(401).json({
          error: 'Password was changed. Please log in again.',
          code: 'PASSWORD_CHANGED'
        });
      }
    }

    // Attach user to request
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    console.error('Token verification error:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      error: 'Not authorized, token failed',
      code: 'TOKEN_FAILED'
    });
  }
};

/**
 * Admin only middleware
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    // Log unauthorized admin access attempt
    logAudit(
      req.user?.id,
      'UNAUTHORIZED_ADMIN_ACCESS',
      'admin',
      null,
      { path: req.path, method: req.method },
      req
    );

    res.status(403).json({
      error: 'Access denied. Admin only.',
      code: 'ADMIN_REQUIRED'
    });
  }
};

/**
 * Optional authentication middleware
 * Doesn't fail if no token, but attaches user if valid token present
 */
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = verifyToken(token);

      if (decoded) {
        const user = await User.findById(decoded.id);
        if (user && user.isActive && !isAccountLocked(user)) {
          req.user = user;
        }
      }
    } catch {
      // Silent fail for optional auth
      req.user = null;
    }
  }

  next();
};

/**
 * Role-based access control middleware
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}`,
        code: 'INSUFFICIENT_ROLE'
      });
    }

    next();
  };
};

/**
 * Check if user owns resource or is admin
 */
const ownerOrAdmin = (getResourceOwnerId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Admins always have access
    if (req.user.role === 'admin') {
      return next();
    }

    try {
      const ownerId = await getResourceOwnerId(req);

      if (ownerId !== req.user.id) {
        return res.status(403).json({
          error: 'Access denied. Not owner.',
          code: 'NOT_OWNER'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        error: 'Error checking resource ownership',
        code: 'OWNERSHIP_CHECK_FAILED'
      });
    }
  };
};

/**
 * Refresh token middleware
 */
const refreshAuth = async (req, res, next) => {
  const refreshToken = req.body.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      error: 'Refresh token required',
      code: 'NO_REFRESH_TOKEN'
    });
  }

  try {
    const decoded = verifyToken(refreshToken);

    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'User not found or inactive',
        code: 'USER_INVALID'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Refresh token failed',
      code: 'REFRESH_FAILED'
    });
  }
};

/**
 * Account lockout handler
 * Call this after failed login attempts
 */
const handleFailedLogin = async (userId) => {
  const { pool } = require('../config/database');

  try {
    // Increment failed attempts
    await pool.execute(
      `UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = ?`,
      [userId]
    );

    // Check current attempts
    const [rows] = await pool.execute(
      `SELECT failed_login_attempts FROM users WHERE id = ?`,
      [userId]
    );

    if (rows.length > 0) {
      const attempts = rows[0].failed_login_attempts;

      // Lock account after 5 failed attempts
      if (attempts >= 5) {
        const lockDuration = Math.min(attempts * 5, 60); // Max 60 minutes
        const lockedUntil = new Date(Date.now() + lockDuration * 60 * 1000);

        await pool.execute(
          `UPDATE users SET locked_until = ? WHERE id = ?`,
          [lockedUntil, userId]
        );

        return {
          locked: true,
          lockedUntil,
          lockDuration
        };
      }
    }

    return { locked: false };
  } catch (error) {
    console.error('Handle failed login error:', error);
    return { locked: false };
  }
};

/**
 * Reset login attempts after successful login
 */
const resetLoginAttempts = async (userId) => {
  const { pool } = require('../config/database');

  try {
    await pool.execute(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = ?`,
      [userId]
    );
  } catch (error) {
    console.error('Reset login attempts error:', error);
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  protect,
  adminOnly,
  optionalAuth,
  requireRole,
  ownerOrAdmin,
  refreshAuth,
  handleFailedLogin,
  resetLoginAttempts,
  isAccountLocked
};
