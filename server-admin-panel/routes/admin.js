const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { pool, logAudit } = require('../config/database');
const { config, formatFileSize } = require('../config');
const Game = require('../models/mysql/Game');
const Setting = require('../models/mysql/Setting');
const Notification = require('../models/mysql/Notification');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const AdmZip = require('adm-zip');

// Configure multer for game uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'temp');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: config.uploads.maxFileSize },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedTypes = [...config.uploads.allowedGameTypes, ...config.uploads.allowedImageTypes];
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`));
    }
  }
});

/**
 * Admin Routes - All routes require admin authentication
 */

// ==========================================
// DASHBOARD & STATISTICS
// ==========================================

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

    // Get notification stats
    const [notifStats] = await pool.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active
      FROM notifications
    `);

    // Get recent activity
    const [recentGames] = await pool.execute(`
      SELECT id, title, plays, created_at FROM games
      ORDER BY created_at DESC LIMIT 5
    `);

    const [recentUsers] = await pool.execute(`
      SELECT id, username, email, created_at FROM users
      ORDER BY created_at DESC LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        users: {
          total: userStats[0].total || 0,
          active: userStats[0].active || 0,
          admins: userStats[0].admins || 0
        },
        games: gameStats,
        notifications: {
          total: notifStats[0].total || 0,
          active: notifStats[0].active || 0
        },
        recent: {
          games: recentGames,
          users: recentUsers
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

// ==========================================
// APP SETTINGS MANAGEMENT
// ==========================================

// Get all app settings
router.get('/settings', protect, adminOnly, async (req, res) => {
  try {
    const [settings] = await pool.execute(
      'SELECT * FROM app_settings ORDER BY setting_key'
    );

    // Convert to key-value object
    const settingsObj = {};
    settings.forEach(s => {
      let value = s.setting_value;
      if (s.setting_type === 'boolean') {
        value = value === 'true';
      } else if (s.setting_type === 'number') {
        value = Number(value);
      } else if (s.setting_type === 'json') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          value = s.setting_value;
        }
      }
      settingsObj[s.setting_key] = {
        value,
        type: s.setting_type,
        description: s.description
      };
    });

    res.json({ success: true, data: settingsObj });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Error fetching settings' });
  }
});

// Update app settings
router.put('/settings', protect, adminOnly, async (req, res) => {
  try {
    const { settings } = req.body;

    for (const [key, value] of Object.entries(settings)) {
      let stringValue = value;
      if (typeof value === 'object') {
        stringValue = JSON.stringify(value);
      } else if (typeof value === 'boolean') {
        stringValue = value.toString();
      } else {
        stringValue = String(value);
      }

      await pool.execute(
        'UPDATE app_settings SET setting_value = ? WHERE setting_key = ?',
        [stringValue, key]
      );
    }

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Error updating settings' });
  }
});

// Add new setting
router.post('/settings', protect, adminOnly, async (req, res) => {
  try {
    const { key, value, type = 'string', description = '' } = req.body;

    let stringValue = value;
    if (typeof value === 'object') {
      stringValue = JSON.stringify(value);
    } else {
      stringValue = String(value);
    }

    await pool.execute(
      `INSERT INTO app_settings (setting_key, setting_value, setting_type, description)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = ?, setting_type = ?, description = ?`,
      [key, stringValue, type, description, stringValue, type, description]
    );

    res.json({ success: true, message: 'Setting saved successfully' });
  } catch (error) {
    console.error('Error saving setting:', error);
    res.status(500).json({ message: 'Error saving setting' });
  }
});

// ==========================================
// USER MANAGEMENT
// ==========================================

// Get all users
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT id, username, email, avatar, role, is_active, total_games_played, created_at FROM users`;
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

// ==========================================
// GAME MANAGEMENT
// ==========================================

// Get all games (admin view)
router.get('/games', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', category = '' } = req.query;

    const result = await Game.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      isActive: undefined, // Show all games including inactive
      search,
      category: category || undefined
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

// Get single game details
router.get('/games/:id', protect, adminOnly, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    res.json({ success: true, data: game });
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ message: 'Error fetching game' });
  }
});

// Create new game
router.post('/games', protect, adminOnly, upload.fields([
  { name: 'gameFile', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, description, category, difficulty, tags, controls, requirements } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    let gameUrl = '';
    let thumbnailUrl = '';
    let fileSize = 0;

    // Handle game file upload
    if (req.files && req.files.gameFile) {
      const gameFile = req.files.gameFile[0];
      const gameId = Date.now().toString();
      const gamesDir = path.join(__dirname, '..', 'public', 'games', gameId);

      await fs.mkdir(gamesDir, { recursive: true });

      // Extract ZIP file
      const zip = new AdmZip(gameFile.path);
      zip.extractAllTo(gamesDir, true);

      // Delete temp file
      await fs.unlink(gameFile.path);

      // Find index.html
      const files = await fs.readdir(gamesDir);
      const hasIndex = files.includes('index.html');

      if (!hasIndex) {
        // Check subdirectories
        for (const file of files) {
          const subPath = path.join(gamesDir, file);
          const stat = await fs.stat(subPath);
          if (stat.isDirectory()) {
            const subFiles = await fs.readdir(subPath);
            if (subFiles.includes('index.html')) {
              // Move files up
              for (const sf of subFiles) {
                await fs.rename(
                  path.join(subPath, sf),
                  path.join(gamesDir, sf)
                );
              }
              await fs.rmdir(subPath);
              break;
            }
          }
        }
      }

      gameUrl = `/games/${gameId}/index.html`;
      fileSize = gameFile.size;
    }

    // Handle thumbnail upload
    if (req.files && req.files.thumbnail) {
      const thumbFile = req.files.thumbnail[0];
      const thumbDir = path.join(__dirname, '..', 'public', 'thumbnails');
      await fs.mkdir(thumbDir, { recursive: true });

      const thumbName = `${Date.now()}-${thumbFile.originalname}`;
      const thumbPath = path.join(thumbDir, thumbName);

      await fs.rename(thumbFile.path, thumbPath);
      thumbnailUrl = `/thumbnails/${thumbName}`;
    }

    // Create game in database
    const game = await Game.create({
      title,
      description,
      thumbnail: thumbnailUrl || 'https://via.placeholder.com/300x200',
      gameUrl: gameUrl || req.body.gameUrl || '',
      category: category || 'casual',
      tags: tags ? JSON.parse(tags) : [],
      difficulty: difficulty || 'medium',
      creatorId: req.user.id,
      fileSize,
      controls: controls || '',
      requirements: requirements || ''
    });

    res.status(201).json({ success: true, data: game });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ message: 'Error creating game: ' + error.message });
  }
});

// Update game
router.put('/games/:id', protect, adminOnly, upload.fields([
  { name: 'gameFile', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Parse tags if provided as string
    if (updateData.tags && typeof updateData.tags === 'string') {
      updateData.tags = JSON.parse(updateData.tags);
    }

    // Handle game file upload
    if (req.files && req.files.gameFile) {
      const gameFile = req.files.gameFile[0];
      const gamesDir = path.join(__dirname, '..', 'public', 'games', id);

      // Remove old game files
      try {
        await fs.rm(gamesDir, { recursive: true, force: true });
      } catch (e) {}

      await fs.mkdir(gamesDir, { recursive: true });

      // Extract ZIP file
      const zip = new AdmZip(gameFile.path);
      zip.extractAllTo(gamesDir, true);

      // Delete temp file
      await fs.unlink(gameFile.path);

      // Find index.html and restructure if needed
      const files = await fs.readdir(gamesDir);
      if (!files.includes('index.html')) {
        for (const file of files) {
          const subPath = path.join(gamesDir, file);
          const stat = await fs.stat(subPath);
          if (stat.isDirectory()) {
            const subFiles = await fs.readdir(subPath);
            if (subFiles.includes('index.html')) {
              for (const sf of subFiles) {
                await fs.rename(
                  path.join(subPath, sf),
                  path.join(gamesDir, sf)
                );
              }
              await fs.rmdir(subPath);
              break;
            }
          }
        }
      }

      updateData.gameUrl = `/games/${id}/index.html`;
      updateData.fileSize = gameFile.size;
    }

    // Handle thumbnail upload
    if (req.files && req.files.thumbnail) {
      const thumbFile = req.files.thumbnail[0];
      const thumbDir = path.join(__dirname, '..', 'public', 'thumbnails');
      await fs.mkdir(thumbDir, { recursive: true });

      const thumbName = `${Date.now()}-${thumbFile.originalname}`;
      const thumbPath = path.join(thumbDir, thumbName);

      await fs.rename(thumbFile.path, thumbPath);
      updateData.thumbnail = `/thumbnails/${thumbName}`;
    }

    const game = await Game.update(id, updateData);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    res.json({ success: true, data: game });
  } catch (error) {
    console.error('Error updating game:', error);
    res.status(500).json({ message: 'Error updating game: ' + error.message });
  }
});

// Delete game
router.delete('/games/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Delete game files
    const gamesDir = path.join(__dirname, '..', 'public', 'games', id);
    try {
      await fs.rm(gamesDir, { recursive: true, force: true });
    } catch (e) {}

    await Game.delete(id);

    res.json({ success: true, message: 'Game deleted' });
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({ message: 'Error deleting game' });
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

// Get game files for preview/editing
router.get('/games/:id/files', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const gamesDir = path.join(__dirname, '..', 'public', 'games', id);

    const getFiles = async (dir, basePath = '') => {
      const items = [];
      try {
        const files = await fs.readdir(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = await fs.stat(filePath);
          const relativePath = basePath ? `${basePath}/${file}` : file;

          if (stat.isDirectory()) {
            const children = await getFiles(filePath, relativePath);
            items.push({ name: file, type: 'directory', path: relativePath, children });
          } else {
            items.push({
              name: file,
              type: 'file',
              path: relativePath,
              size: stat.size
            });
          }
        }
      } catch (e) {}
      return items;
    };

    const files = await getFiles(gamesDir);
    res.json({ success: true, data: files });
  } catch (error) {
    console.error('Error getting game files:', error);
    res.status(500).json({ message: 'Error getting game files' });
  }
});

// ==========================================
// NOTIFICATIONS MANAGEMENT
// ==========================================

// Get all in-app notifications
router.get('/notifications', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [notifications] = await pool.execute(
      `SELECT n.*, u.username as creator_name
       FROM notifications n
       LEFT JOIN users u ON n.created_by = u.id
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit), offset]
    );

    const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM notifications');

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Create in-app notification
router.post('/notifications', protect, adminOnly, async (req, res) => {
  try {
    const { title, message, type = 'info', target_audience = 'all', start_date, end_date } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    const [result] = await pool.execute(
      `INSERT INTO notifications (title, message, type, target_audience, start_date, end_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, message, type, target_audience, start_date || null, end_date || null, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: 'Notification created',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Error creating notification' });
  }
});

// Update notification
router.put('/notifications/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message, type, target_audience, is_active, start_date, end_date } = req.body;

    await pool.execute(
      `UPDATE notifications SET
        title = COALESCE(?, title),
        message = COALESCE(?, message),
        type = COALESCE(?, type),
        target_audience = COALESCE(?, target_audience),
        is_active = COALESCE(?, is_active),
        start_date = ?,
        end_date = ?
       WHERE id = ?`,
      [title, message, type, target_audience, is_active, start_date || null, end_date || null, id]
    );

    res.json({ success: true, message: 'Notification updated' });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ message: 'Error updating notification' });
  }
});

// Delete notification
router.delete('/notifications/:id', protect, adminOnly, async (req, res) => {
  try {
    await pool.execute('DELETE FROM notifications WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Error deleting notification' });
  }
});

// Get active notifications for app
router.get('/notifications/active', async (req, res) => {
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [notifications] = await pool.execute(
      `SELECT id, title, message, type FROM notifications
       WHERE is_active = TRUE
       AND (start_date IS NULL OR start_date <= ?)
       AND (end_date IS NULL OR end_date >= ?)
       ORDER BY created_at DESC`,
      [now, now]
    );
    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error('Error fetching active notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// ==========================================
// PUSH NOTIFICATIONS (OneSignal)
// ==========================================

// Get push notification history
router.get('/push-notifications', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [notifications] = await pool.execute(
      `SELECT pn.*, u.username as creator_name
       FROM push_notifications pn
       LEFT JOIN users u ON pn.created_by = u.id
       ORDER BY pn.created_at DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit), offset]
    );

    const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM push_notifications');

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching push notifications:', error);
    res.status(500).json({ message: 'Error fetching push notifications' });
  }
});

// Send push notification via OneSignal
router.post('/push-notifications', protect, adminOnly, async (req, res) => {
  try {
    const { title, message, segment = 'All', data = {} } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    // Get OneSignal credentials
    const [settings] = await pool.execute(
      'SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN (?, ?)',
      ['onesignal_app_id', 'onesignal_api_key']
    );

    const settingsMap = {};
    settings.forEach(s => settingsMap[s.setting_key] = s.setting_value);

    if (!settingsMap.onesignal_app_id || !settingsMap.onesignal_api_key) {
      return res.status(400).json({ message: 'OneSignal not configured. Please set App ID and API Key in settings.' });
    }

    // Create notification record
    const [result] = await pool.execute(
      `INSERT INTO push_notifications (title, message, data, segment, created_by) VALUES (?, ?, ?, ?, ?)`,
      [title, message, JSON.stringify(data), segment, req.user.id]
    );

    const notificationId = result.insertId;

    // Send to OneSignal
    try {
      const fetch = require('node-fetch');
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${settingsMap.onesignal_api_key}`
        },
        body: JSON.stringify({
          app_id: settingsMap.onesignal_app_id,
          included_segments: [segment],
          headings: { en: title },
          contents: { en: message },
          data
        })
      });

      const responseData = await response.json();

      if (responseData.id) {
        await pool.execute(
          'UPDATE push_notifications SET onesignal_id = ?, status = ?, sent_at = NOW() WHERE id = ?',
          [responseData.id, 'sent', notificationId]
        );
        res.json({ success: true, message: 'Push notification sent', data: responseData });
      } else {
        await pool.execute(
          'UPDATE push_notifications SET status = ? WHERE id = ?',
          ['failed', notificationId]
        );
        res.status(400).json({ success: false, message: 'Failed to send notification', error: responseData });
      }
    } catch (error) {
      await pool.execute(
        'UPDATE push_notifications SET status = ? WHERE id = ?',
        ['failed', notificationId]
      );
      throw error;
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
    res.status(500).json({ message: 'Error sending push notification' });
  }
});

// ==========================================
// ENVIRONMENT VARIABLES MANAGEMENT
// ==========================================

// Get .env file contents (masked sensitive values)
router.get('/env', protect, adminOnly, async (req, res) => {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';

    try {
      envContent = await fs.readFile(envPath, 'utf8');
    } catch (e) {
      // .env doesn't exist, return example
      const examplePath = path.join(__dirname, '..', '.env.example');
      try {
        envContent = await fs.readFile(examplePath, 'utf8');
      } catch (e2) {
        envContent = '';
      }
    }

    // Parse and mask sensitive values
    const lines = envContent.split('\n');
    const envVars = [];
    const sensitiveKeys = ['password', 'secret', 'key', 'token', 'api_key'];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        envVars.push({ type: 'comment', value: line });
        continue;
      }

      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        const isSensitive = sensitiveKeys.some(sk => key.toLowerCase().includes(sk));

        envVars.push({
          type: 'variable',
          key,
          value: isSensitive && value ? '********' : value,
          sensitive: isSensitive
        });
      }
    }

    res.json({ success: true, data: envVars });
  } catch (error) {
    console.error('Error reading .env:', error);
    res.status(500).json({ message: 'Error reading environment variables' });
  }
});

// Update .env file
router.put('/env', protect, adminOnly, async (req, res) => {
  try {
    const { variables } = req.body;
    const envPath = path.join(__dirname, '..', '.env');

    // Read current .env to preserve sensitive values that weren't changed
    let currentEnv = {};
    try {
      const content = await fs.readFile(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          currentEnv[match[1].trim()] = match[2].trim();
        }
      });
    } catch (e) {}

    // Build new .env content
    const lines = [];
    for (const item of variables) {
      if (item.type === 'comment') {
        lines.push(item.value);
      } else if (item.type === 'variable') {
        let value = item.value;
        // If masked (********), keep original value
        if (value === '********' && currentEnv[item.key]) {
          value = currentEnv[item.key];
        }
        lines.push(`${item.key}=${value}`);
      }
    }

    await fs.writeFile(envPath, lines.join('\n'));

    res.json({ success: true, message: 'Environment variables updated. Restart server to apply changes.' });
  } catch (error) {
    console.error('Error updating .env:', error);
    res.status(500).json({ message: 'Error updating environment variables' });
  }
});

// ==========================================
// INITIAL SETUP
// ==========================================

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

    // Log the setup
    await logAudit(user.id, 'ADMIN_SETUP', 'user', user.id, { username, email }, req);

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

// ==========================================
// SYSTEM INFORMATION
// ==========================================

// Get system configuration
router.get('/system-info', protect, adminOnly, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        app: config.app,
        environment: config.env,
        uploads: {
          maxFileSize: config.uploads.maxFileSize,
          maxFileSizeFormatted: formatFileSize(config.uploads.maxFileSize),
          maxGameZipSize: config.uploads.maxGameZipSize,
          maxGameZipSizeFormatted: formatFileSize(config.uploads.maxGameZipSize),
          maxThumbnailSize: config.uploads.maxThumbnailSize,
          maxThumbnailSizeFormatted: formatFileSize(config.uploads.maxThumbnailSize),
          allowedGameTypes: config.uploads.allowedGameTypes,
          allowedImageTypes: config.uploads.allowedImageTypes
        },
        features: config.features,
        onesignal: {
          enabled: config.onesignal.enabled,
          configured: !!(config.onesignal.appId && config.onesignal.apiKey)
        },
        maintenance: config.maintenance
      }
    });
  } catch (error) {
    console.error('Error getting system info:', error);
    res.status(500).json({ message: 'Error getting system information' });
  }
});

// ==========================================
// AUDIT LOG
// ==========================================

// Get audit log
router.get('/audit-log', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 50, action = '', userId = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT al.*, u.username, u.email
      FROM audit_log al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    let countQuery = `SELECT COUNT(*) as total FROM audit_log WHERE 1=1`;
    const values = [];

    if (action) {
      query += ` AND al.action LIKE ?`;
      countQuery += ` AND action LIKE ?`;
      values.push(`%${action}%`);
    }

    if (userId) {
      query += ` AND al.user_id = ?`;
      countQuery += ` AND user_id = ?`;
      values.push(userId);
    }

    query += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;

    const [logs] = await pool.execute(query, [...values, parseInt(limit), offset]);
    const [countResult] = await pool.execute(countQuery, values);

    res.json({
      success: true,
      data: logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ message: 'Error fetching audit log' });
  }
});

// ==========================================
// ONESIGNAL TEST
// ==========================================

// Test OneSignal connection
router.post('/test-onesignal', protect, adminOnly, async (req, res) => {
  try {
    // Get OneSignal credentials from settings or request
    let appId = req.body.appId;
    let apiKey = req.body.apiKey;

    if (!appId || !apiKey) {
      const [settings] = await pool.execute(
        'SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN (?, ?)',
        ['onesignal_app_id', 'onesignal_api_key']
      );

      const settingsMap = {};
      settings.forEach(s => settingsMap[s.setting_key] = s.setting_value);

      appId = appId || settingsMap.onesignal_app_id;
      apiKey = apiKey || settingsMap.onesignal_api_key;
    }

    if (!appId || !apiKey) {
      return res.status(400).json({
        success: false,
        message: 'OneSignal App ID and API Key are required'
      });
    }

    // Test the connection by fetching app info
    const fetch = require('node-fetch');
    const response = await fetch(`https://onesignal.com/api/v1/apps/${appId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${apiKey}`
      }
    });

    const data = await response.json();

    if (response.ok && data.id) {
      res.json({
        success: true,
        message: 'OneSignal connection successful',
        data: {
          appName: data.name,
          players: data.players,
          messageable_players: data.messageable_players
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'OneSignal connection failed',
        error: data.errors || 'Invalid credentials'
      });
    }
  } catch (error) {
    console.error('Error testing OneSignal:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing OneSignal connection',
      error: error.message
    });
  }
});

// ==========================================
// DATABASE BACKUP (Basic)
// ==========================================

// Get database table info
router.get('/database-info', protect, adminOnly, async (req, res) => {
  try {
    const [tables] = await pool.execute(`
      SELECT
        TABLE_NAME as name,
        TABLE_ROWS as rows,
        DATA_LENGTH as dataSize,
        INDEX_LENGTH as indexSize
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
    `, [config.database.name]);

    const tableInfo = tables.map(t => ({
      name: t.name,
      rows: t.rows,
      size: formatFileSize((t.dataSize || 0) + (t.indexSize || 0))
    }));

    const totalSize = tables.reduce((sum, t) => sum + (t.dataSize || 0) + (t.indexSize || 0), 0);

    res.json({
      success: true,
      data: {
        tables: tableInfo,
        totalSize: formatFileSize(totalSize),
        tableCount: tables.length
      }
    });
  } catch (error) {
    console.error('Error getting database info:', error);
    res.status(500).json({ message: 'Error getting database information' });
  }
});

module.exports = router;
