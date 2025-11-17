const User = require('../models/firestore/User');
const { admin } = require('../config/firebase');
const { validationResult } = require('express-validator');

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

    // Create user in Firebase Auth and Firestore
    const user = await User.create({
      username,
      email,
      password,
      avatar,
      bio
    });

    // Generate custom token for the user
    const customToken = await admin.auth().createCustomToken(user.id);

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        token: customToken
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Login user (verify Firebase token)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { idToken } = req.body;

    // Validate input
    if (!idToken) {
      return res.status(400).json({ message: 'Please provide Firebase ID token' });
    }

    // Verify Firebase ID token
    const decodedToken = await User.verifyToken(idToken);
    const uid = decodedToken.uid;

    // Get user from Firestore
    const user = await User.findById(uid);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is inactive' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        stats: user.stats,
        token: idToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.uid);

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

    const user = await User.findById(req.user.uid);

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

    const updatedUser = await User.update(req.user.uid, updates);

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
    const { newPassword } = req.body;

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

    // Update password in Firebase Auth
    await User.updatePassword(req.user.uid, newPassword);

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
  getMe,
  updateProfile,
  changePassword
};
