const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { pool } = require('../config/database');
const Game = require('../models/mysql/Game');

/**
 * Admin Routes - All routes require admin authentication
 */

// Get platform statistics
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    // Get user stats
    const [userStats] = await pool.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins
      FROM users
    `);

    // Get game stats
    const gameStats = await Game.getStats();

    res.json({
      success: true,
      data: {
        users: {
          total: userStats[0].total || 0,
          active: userStats[0].active || 0,
          admins: userStats[0].admins || 0
        },
        games: gameStats
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

// Get all users
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT id, username, email, avatar, role, is_active, created_at FROM users`;
    let countQuery = `SELECT COUNT(*) as total FROM users`;
    const values = [];

    if (search) {
      query += ` WHERE username LIKE ? OR email LIKE ?`;
      countQuery += ` WHERE username LIKE ? OR email LIKE ?`;
      values.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    const [users] = await pool.execute(query, [...values, parseInt(limit), offset]);
    const [countResult] = await pool.execute(countQuery, values);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Update user role
router.put('/users/:id/role', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    if (parseInt(id) === req.user.id && role === 'user') {
      return res.status(400).json({ message: 'Cannot remove your own admin rights' });
    }

    await pool.execute(`UPDATE users SET role = ? WHERE id = ?`, [role, id]);

    res.json({ success: true, message: `User role updated to ${role}` });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Error updating user role' });
  }
});

// Toggle user active status
router.put('/users/:id/toggle-active', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    const [user] = await pool.execute(`SELECT is_active FROM users WHERE id = ?`, [id]);
    if (user.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newStatus = !user[0].is_active;
    await pool.execute(`UPDATE users SET is_active = ? WHERE id = ?`, [newStatus, id]);

    res.json({
      success: true,
      message: `User ${newStatus ? 'activated' : 'deactivated'}`,
      isActive: newStatus
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ message: 'Error updating user status' });
  }
});

// Delete user
router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await pool.execute(`DELETE FROM users WHERE id = ?`, [id]);

    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// Get all games (admin view)
router.get('/games', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const result = await Game.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      isActive: undefined // Show all games including inactive
    });

    res.json({
      success: true,
      data: result.games,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ message: 'Error fetching games' });
  }
});

// Toggle game featured status
router.put('/games/:id/toggle-featured', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const [game] = await pool.execute(`SELECT is_featured FROM games WHERE id = ?`, [id]);
    if (game.length === 0) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const newStatus = !game[0].is_featured;
    await pool.execute(`UPDATE games SET is_featured = ? WHERE id = ?`, [newStatus, id]);

    res.json({
      success: true,
      message: `Game ${newStatus ? 'featured' : 'unfeatured'}`,
      isFeatured: newStatus
    });
  } catch (error) {
    console.error('Error toggling featured status:', error);
    res.status(500).json({ message: 'Error updating game' });
  }
});

// Toggle game active status
router.put('/games/:id/toggle-active', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const [game] = await pool.execute(`SELECT is_active FROM games WHERE id = ?`, [id]);
    if (game.length === 0) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const newStatus = !game[0].is_active;
    await pool.execute(`UPDATE games SET is_active = ? WHERE id = ?`, [newStatus, id]);

    res.json({
      success: true,
      message: `Game ${newStatus ? 'activated' : 'deactivated'}`,
      isActive: newStatus
    });
  } catch (error) {
    console.error('Error toggling active status:', error);
    res.status(500).json({ message: 'Error updating game' });
  }
});

// Create first admin user (one-time setup)
router.post('/setup', async (req, res) => {
  try {
    // Check if any admin exists
    const [admins] = await pool.execute(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);

    if (admins.length > 0) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email and password required' });
    }

    const User = require('../models/mysql/User');
    const user = await User.create({ username, email, password });

    // Make admin
    await pool.execute(`UPDATE users SET role = 'admin' WHERE id = ?`, [user.id]);

    res.status(201).json({
      success: true,
      message: 'Admin user created',
      data: { id: user.id, username, email }
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ message: 'Error creating admin user' });
  }
});

module.exports = router;
