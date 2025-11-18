const User = require('../models/mysql/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { handleFailedLogin, resetLoginAttempts, generateToken, generateRefreshToken, verifyToken } = require('../middleware/auth');
const { pool } = require('../config/database');
const { config } = require('../config');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, avatar, bio } = req.body;

    // Check if user already exists
    const emailExists = await User.findByEmail(email);
    if (emailExists) {
      return res.status(400).json({
        message: 'Email already registered'
      });
    }

    const usernameExists = await User.findByUsername(username);
    if (usernameExists) {
      return res.status(400).json({
        message: 'Username already taken'
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      avatar,
      bio
    });

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          role: 'user'
        },
        token,
        refreshToken,
        expiresIn: config.jwt.expiresIn
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during registration',
      code: 'REGISTRATION_ERROR'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Get user with password
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const lockedUntil = new Date(user.locked_until);
      return res.status(423).json({
        message: 'Account is temporarily locked due to too many failed login attempts',
        lockedUntil: lockedUntil.toISOString(),
        code: 'ACCOUNT_LOCKED'
      });
    }

    // Check password
    const isMatch = await User.comparePassword(password, user.password);

    if (!isMatch) {
      // Handle failed login attempt
      const lockoutResult = await handleFailedLogin(user.id);

      if (lockoutResult.locked) {
        return res.status(423).json({
          message: `Account locked for ${lockoutResult.lockDuration} minutes due to too many failed attempts`,
          lockedUntil: lockoutResult.lockedUntil.toISOString(),
          code: 'ACCOUNT_LOCKED'
        });
      }

      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is active
    if (!user.is_active) {
      return res.status(401).json({ message: 'Account is inactive' });
    }

    // Reset login attempts on successful login
    await resetLoginAttempts(user.id);

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          bio: user.bio,
          stats: {
            totalGamesPlayed: user.total_games_played,
            totalPlayTime: user.total_play_time
          },
          role: user.role
        },
        token,
        refreshToken,
        expiresIn: config.jwt.expiresIn
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during login',
      code: 'LOGIN_ERROR'
    });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    // Verify refresh token
    const decoded = verifyToken(token);

    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Get user
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is inactive',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Generate new tokens
    const newAccessToken = generateToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    res.json({
      success: true,
      data: {
        token: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: config.jwt.expiresIn
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Refresh token has expired',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error during token refresh',
      code: 'REFRESH_ERROR'
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      data: User.toPublicProfile(user)
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { username, bio, avatar } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if username is being changed and if it's already taken
    if (username && username !== user.username) {
      const existingUser = await User.findByUsername(username);
      if (existingUser && existingUser.id !== user.id) {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }

    // Build updates object
    const updates = {};
    if (username) updates.username = username;
    if (bio !== undefined) updates.bio = bio;
    if (avatar) updates.avatar = avatar;

    const updatedUser = await User.update(req.user.id, updates);

    res.json({
      success: true,
      data: User.toPublicProfile(updatedUser)
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        message: 'Please provide new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'New password must be at least 6 characters'
      });
    }

    // Get user with password
    const user = await User.findByIdWithPassword(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password if provided
    if (currentPassword) {
      const isMatch = await User.comparePassword(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
    }

    // Update password
    await User.updatePassword(req.user.id, newPassword);

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error changing password' });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  getMe,
  updateProfile,
  changePassword
};
