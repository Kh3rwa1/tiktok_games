const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { pool } = require('../config/database');
const Game = require('../models/mysql/Game');
const Setting = require('../models/mysql/Setting');
const Notification = require('../models/mysql/Notification');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const AdmZip = require('adm-zip');

/**
 * File Upload Configuration
 */
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'public', 'games');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.zip', '.html', '.htm'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only ZIP, HTML files are allowed.'));
    }
  }
});

const thumbnailUpload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(__dirname, '..', 'public', 'thumbnails');
      try {
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (error) {
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image type.'));
    }
  }
});

/**
 * Admin Routes - All routes require admin authentication
 */

// ===================== STATISTICS =====================

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
    const notificationStats = await Notification.getStats();

    // Get recent activity
    const [recentUsers] = await pool.execute(`
      SELECT id, username, email, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `);

    const [recentGames] = await pool.execute(`
      SELECT id, title, plays, created_at
      FROM games
      ORDER BY created_at DESC
      LIMIT 5
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
        notifications: notificationStats,
        recentUsers,
        recentGames
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

// ===================== USER MANAGEMENT =====================

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

// ===================== GAME MANAGEMENT =====================

// Get all games (admin view)
router.get('/games', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', category = '' } = req.query;

    const result = await Game.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      category: category || undefined,
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

// Upload game (HTML5 folder as ZIP)
router.post('/games/upload', protect, adminOnly, upload.single('game'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { title, description, category, difficulty, tags, controls, requirements } = req.body;

    if (!title || !description) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ message: 'Title and description are required' });
    }

    let gameUrl = '';
    let fileSize = req.file.size;
    const gameId = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const gamesDir = path.join(__dirname, '..', 'public', 'games', gameId);

    // Handle ZIP files - extract them
    if (req.file.originalname.endsWith('.zip')) {
      try {
        await fs.mkdir(gamesDir, { recursive: true });

        const zip = new AdmZip(req.file.path);
        zip.extractAllTo(gamesDir, true);

        // Find index.html
        const files = await fs.readdir(gamesDir, { recursive: true });
        let indexFile = files.find(f =>
          f.toLowerCase() === 'index.html' ||
          f.toLowerCase().endsWith('/index.html') ||
          f.toLowerCase().endsWith('\\index.html')
        );

        if (!indexFile) {
          // Check subdirectory
          const subdirs = await fs.readdir(gamesDir, { withFileTypes: true });
          for (const dir of subdirs) {
            if (dir.isDirectory()) {
              const subFiles = await fs.readdir(path.join(gamesDir, dir.name));
              if (subFiles.includes('index.html')) {
                indexFile = path.join(dir.name, 'index.html');
                break;
              }
            }
          }
        }

        if (indexFile) {
          gameUrl = `/games/${gameId}/${indexFile}`;
        } else {
          gameUrl = `/games/${gameId}/index.html`;
        }

        // Delete the original ZIP
        await fs.unlink(req.file.path);
      } catch (extractError) {
        console.error('Error extracting ZIP:', extractError);
        await fs.unlink(req.file.path);
        return res.status(500).json({ message: 'Error extracting game files' });
      }
    } else {
      // Single HTML file
      await fs.mkdir(gamesDir, { recursive: true });
      const newPath = path.join(gamesDir, 'index.html');
      await fs.rename(req.file.path, newPath);
      gameUrl = `/games/${gameId}/index.html`;
    }

    // Create game in database
    const game = await Game.create({
      title,
      description,
      thumbnail: req.body.thumbnail || 'https://via.placeholder.com/400x300?text=Game',
      game_url: gameUrl,
      category: category || 'casual',
      tags: tags ? JSON.parse(tags) : [],
      difficulty: difficulty || 'medium',
      creator_id: req.user.id,
      version: '1.0.0',
      file_size: fileSize,
      controls: controls || '',
      requirements: requirements || ''
    });

    res.status(201).json({
      success: true,
      message: 'Game uploaded successfully',
      data: game
    });
  } catch (error) {
    console.error('Error uploading game:', error);
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (e) {}
    }
    res.status(500).json({ message: 'Error uploading game' });
  }
});

// Upload thumbnail
router.post('/games/thumbnail', protect, adminOnly, thumbnailUpload.single('thumbnail'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const thumbnailUrl = `/thumbnails/${req.file.filename}`;

    res.json({
      success: true,
      url: thumbnailUrl
    });
  } catch (error) {
    console.error('Error uploading thumbnail:', error);
    res.status(500).json({ message: 'Error uploading thumbnail' });
  }
});

// Update game
router.put('/games/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const game = await Game.findById(id);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const updatedGame = await Game.update(id, updates);

    res.json({
      success: true,
      message: 'Game updated',
      data: updatedGame
    });
  } catch (error) {
    console.error('Error updating game:', error);
    res.status(500).json({ message: 'Error updating game' });
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

// Delete game
router.delete('/games/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const game = await Game.findById(id);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Delete game files if they exist
    if (game.game_url && game.game_url.startsWith('/games/')) {
      const gameFolder = game.game_url.split('/')[2];
      const gamePath = path.join(__dirname, '..', 'public', 'games', gameFolder);
      try {
        await fs.rm(gamePath, { recursive: true, force: true });
      } catch (e) {
        console.error('Error deleting game files:', e);
      }
    }

    await pool.execute(`DELETE FROM games WHERE id = ?`, [id]);

    res.json({ success: true, message: 'Game deleted' });
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({ message: 'Error deleting game' });
  }
});

// Get game files (for preview/management)
router.get('/games/:id/files', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const game = await Game.findById(id);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    if (!game.game_url || !game.game_url.startsWith('/games/')) {
      return res.json({ success: true, files: [] });
    }

    const gameFolder = game.game_url.split('/')[2];
    const gamePath = path.join(__dirname, '..', 'public', 'games', gameFolder);

    const getFiles = async (dir, basePath = '') => {
      const files = [];
      try {
        const items = await fs.readdir(dir, { withFileTypes: true });
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          const relativePath = path.join(basePath, item.name);
          if (item.isDirectory()) {
            files.push(...await getFiles(fullPath, relativePath));
          } else {
            const stats = await fs.stat(fullPath);
            files.push({
              name: item.name,
              path: relativePath,
              size: stats.size,
              type: path.extname(item.name).slice(1)
            });
          }
        }
      } catch (e) {}
      return files;
    };

    const files = await getFiles(gamePath);

    res.json({ success: true, files, gameFolder });
  } catch (error) {
    console.error('Error getting game files:', error);
    res.status(500).json({ message: 'Error getting game files' });
  }
});

// ===================== SETTINGS MANAGEMENT =====================

// Get all settings
router.get('/settings', protect, adminOnly, async (req, res) => {
  try {
    const settings = await Setting.getAll();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Error fetching settings' });
  }
});

// Get settings as object
router.get('/settings/object', protect, adminOnly, async (req, res) => {
  try {
    const settings = await Setting.getAllAsObject();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Error fetching settings' });
  }
});

// Update settings
router.put('/settings', protect, adminOnly, async (req, res) => {
  try {
    const settings = req.body;

    if (typeof settings !== 'object' || Array.isArray(settings)) {
      return res.status(400).json({ message: 'Invalid settings format' });
    }

    await Setting.updateMultiple(settings);

    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Error updating settings' });
  }
});

// Update single setting
router.put('/settings/:key', protect, adminOnly, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const updated = await Setting.update(key, value);

    if (!updated) {
      return res.status(404).json({ message: 'Setting not found' });
    }

    res.json({ success: true, message: 'Setting updated' });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ message: 'Error updating setting' });
  }
});

// Create new setting
router.post('/settings', protect, adminOnly, async (req, res) => {
  try {
    const { key, value, type, description } = req.body;

    if (!key) {
      return res.status(400).json({ message: 'Setting key is required' });
    }

    await Setting.create(key, value, type, description);

    res.status(201).json({ success: true, message: 'Setting created' });
  } catch (error) {
    console.error('Error creating setting:', error);
    res.status(500).json({ message: 'Error creating setting' });
  }
});

// ===================== NOTIFICATION MANAGEMENT =====================

// Get all notifications
router.get('/notifications', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;

    const result = await Notification.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      type: type || null
    });

    res.json({
      success: true,
      data: result.notifications,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Create notification
router.post('/notifications', protect, adminOnly, async (req, res) => {
  try {
    const notification = await Notification.create({
      ...req.body,
      created_by: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Notification created',
      data: notification
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

    const updated = await Notification.update(id, req.body);

    if (!updated) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification updated' });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ message: 'Error updating notification' });
  }
});

// Toggle notification active
router.put('/notifications/:id/toggle-active', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const newStatus = await Notification.toggleActive(id);

    if (newStatus === null) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({
      success: true,
      message: `Notification ${newStatus ? 'activated' : 'deactivated'}`,
      isActive: newStatus
    });
  } catch (error) {
    console.error('Error toggling notification:', error);
    res.status(500).json({ message: 'Error updating notification' });
  }
});

// Delete notification
router.delete('/notifications/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Notification.delete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Error deleting notification' });
  }
});

// Send push notification
router.post('/notifications/:id/send-push', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const result = await Notification.sendPushNotification(notification);

    if (result.success) {
      res.json({ success: true, message: 'Push notification sent', data: result.data });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
    res.status(500).json({ message: 'Error sending push notification' });
  }
});

// ===================== ENV FILE MANAGEMENT =====================

// Get .env file contents
router.get('/env', protect, adminOnly, async (req, res) => {
  try {
    const envPath = path.join(__dirname, '..', '.env');

    let content = '';
    try {
      content = await fs.readFile(envPath, 'utf8');
    } catch (e) {
      // .env doesn't exist, return empty
    }

    // Parse env to object (for safer editing)
    const envVars = {};
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });

    res.json({
      success: true,
      data: {
        raw: content,
        parsed: envVars
      }
    });
  } catch (error) {
    console.error('Error reading .env:', error);
    res.status(500).json({ message: 'Error reading environment file' });
  }
});

// Update .env file
router.put('/env', protect, adminOnly, async (req, res) => {
  try {
    const { content, vars } = req.body;
    const envPath = path.join(__dirname, '..', '.env');

    let newContent = '';

    if (content !== undefined) {
      // Direct content update
      newContent = content;
    } else if (vars && typeof vars === 'object') {
      // Update specific variables
      let existingContent = '';
      try {
        existingContent = await fs.readFile(envPath, 'utf8');
      } catch (e) {}

      const lines = existingContent.split('\n');
      const existingVars = {};
      const comments = [];

      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || !trimmed) {
          comments.push(line);
        } else {
          const [key] = trimmed.split('=');
          if (key) {
            existingVars[key.trim()] = true;
          }
        }
      });

      // Merge vars
      const finalVars = { ...Object.fromEntries(
        lines.filter(l => l.trim() && !l.trim().startsWith('#'))
          .map(l => {
            const [k, ...v] = l.split('=');
            return [k.trim(), v.join('=').trim()];
          })
      ), ...vars };

      newContent = Object.entries(finalVars)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    } else {
      return res.status(400).json({ message: 'Invalid request body' });
    }

    // Backup current .env
    try {
      const backupPath = path.join(__dirname, '..', '.env.backup');
      const currentContent = await fs.readFile(envPath, 'utf8');
      await fs.writeFile(backupPath, currentContent);
    } catch (e) {}

    // Write new content
    await fs.writeFile(envPath, newContent);

    res.json({
      success: true,
      message: 'Environment file updated. Server restart may be required for changes to take effect.'
    });
  } catch (error) {
    console.error('Error updating .env:', error);
    res.status(500).json({ message: 'Error updating environment file' });
  }
});

// ===================== SETUP =====================

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
