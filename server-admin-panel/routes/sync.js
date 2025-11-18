/**
 * Sync Routes for Mobile App Data Synchronization
 * Provides efficient bulk data fetching and delta updates
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { protect, optionalAuth } = require('../middleware/auth');

/**
 * GET /api/sync/status
 * Get sync status and server timestamp
 */
router.get('/status', async (req, res) => {
  try {
    const [dbResult] = await pool.query('SELECT NOW() as serverTime');

    res.json({
      success: true,
      data: {
        serverTime: dbResult[0].serverTime,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  } catch (error) {
    console.error('Sync status error:', error);
    res.status(500).json({ success: false, error: 'Failed to get sync status' });
  }
});

/**
 * POST /api/sync/delta
 * Get all data updated since lastSync timestamp
 * Supports selective sync by type
 */
router.post('/delta', optionalAuth, async (req, res) => {
  try {
    const { lastSync, types = ['games', 'notifications'] } = req.body;
    const userId = req.user?.id;

    const syncData = {
      timestamp: new Date().toISOString(),
      games: null,
      notifications: null,
      settings: null,
      userProfile: null
    };

    // Parse lastSync date
    const lastSyncDate = lastSync ? new Date(lastSync) : new Date(0);

    // Sync games
    if (types.includes('games')) {
      const [games] = await pool.query(`
        SELECT
          g.*,
          u.username as creator_username,
          u.avatar as creator_avatar,
          (SELECT COUNT(*) FROM game_likes WHERE game_id = g.id) as likes_count,
          (SELECT AVG(rating) FROM game_ratings WHERE game_id = g.id) as average_rating
        FROM games g
        LEFT JOIN users u ON g.creator_id = u.id
        WHERE g.updated_at > ? AND g.is_active = true
        ORDER BY g.updated_at DESC
        LIMIT 100
      `, [lastSyncDate]);

      // Get user's liked games if authenticated
      let userLikes = [];
      if (userId) {
        const [likes] = await pool.query(
          'SELECT game_id FROM game_likes WHERE user_id = ?',
          [userId]
        );
        userLikes = likes.map(l => l.game_id);
      }

      syncData.games = {
        updated: games.map(game => ({
          ...game,
          isLiked: userLikes.includes(game.id),
          creator: {
            username: game.creator_username,
            avatar: game.creator_avatar
          }
        })),
        deleted: [] // Could track deleted games if needed
      };
    }

    // Sync notifications
    if (types.includes('notifications') && userId) {
      const [notifications] = await pool.query(`
        SELECT
          n.*,
          CASE WHEN nr.user_id IS NOT NULL THEN 1 ELSE 0 END as is_read
        FROM notifications n
        LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.user_id = ?
        WHERE n.updated_at > ?
          AND n.is_active = true
          AND (n.target_role = 'all' OR n.target_role = 'users')
          AND (n.start_date IS NULL OR n.start_date <= NOW())
          AND (n.end_date IS NULL OR n.end_date >= NOW())
        ORDER BY n.priority DESC, n.created_at DESC
        LIMIT 50
      `, [userId, lastSyncDate]);

      syncData.notifications = {
        updated: notifications,
        unreadCount: notifications.filter(n => !n.is_read).length
      };
    }

    // Sync app settings
    if (types.includes('settings')) {
      const [settings] = await pool.query(`
        SELECT setting_key, setting_value, value_type
        FROM app_settings
        WHERE is_public = true AND updated_at > ?
      `, [lastSyncDate]);

      const settingsObj = {};
      settings.forEach(s => {
        let value = s.setting_value;
        if (s.value_type === 'number') value = Number(value);
        else if (s.value_type === 'boolean') value = value === 'true';
        else if (s.value_type === 'json') value = JSON.parse(value);
        settingsObj[s.setting_key] = value;
      });

      syncData.settings = settingsObj;
    }

    // Sync user profile if authenticated
    if (types.includes('profile') && userId) {
      const [users] = await pool.query(`
        SELECT id, username, email, avatar, bio, role,
               followers_count, following_count, games_count,
               created_at, updated_at
        FROM users
        WHERE id = ? AND updated_at > ?
      `, [userId, lastSyncDate]);

      if (users.length > 0) {
        syncData.userProfile = users[0];
      }
    }

    res.json({
      success: true,
      data: syncData
    });
  } catch (error) {
    console.error('Delta sync error:', error);
    res.status(500).json({ success: false, error: 'Failed to sync data' });
  }
});

/**
 * POST /api/sync/batch
 * Submit batch of offline actions to process
 */
router.post('/batch', protect, async (req, res) => {
  try {
    const { actions } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(actions)) {
      return res.status(400).json({ success: false, error: 'Actions must be an array' });
    }

    const results = [];
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      for (const action of actions) {
        try {
          let result = { id: action.id, success: true };

          switch (action.type) {
            case 'like':
              // Toggle like
              const [existingLike] = await connection.query(
                'SELECT id FROM game_likes WHERE user_id = ? AND game_id = ?',
                [userId, action.gameId]
              );

              if (existingLike.length > 0) {
                await connection.query(
                  'DELETE FROM game_likes WHERE user_id = ? AND game_id = ?',
                  [userId, action.gameId]
                );
                await connection.query(
                  'UPDATE games SET likes = likes - 1 WHERE id = ?',
                  [action.gameId]
                );
                result.liked = false;
              } else {
                await connection.query(
                  'INSERT INTO game_likes (user_id, game_id) VALUES (?, ?)',
                  [userId, action.gameId]
                );
                await connection.query(
                  'UPDATE games SET likes = likes + 1 WHERE id = ?',
                  [action.gameId]
                );
                result.liked = true;
              }
              break;

            case 'play':
              // Record play session
              await connection.query(
                'INSERT INTO play_history (user_id, game_id, duration, played_at) VALUES (?, ?, ?, ?)',
                [userId, action.gameId, action.duration || 0, action.timestamp || new Date()]
              );
              await connection.query(
                'UPDATE games SET plays = plays + 1 WHERE id = ?',
                [action.gameId]
              );
              break;

            case 'rate':
              // Add or update rating
              await connection.query(`
                INSERT INTO game_ratings (user_id, game_id, rating)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE rating = ?
              `, [userId, action.gameId, action.rating, action.rating]);

              // Update average rating
              const [avgResult] = await connection.query(
                'SELECT AVG(rating) as avg FROM game_ratings WHERE game_id = ?',
                [action.gameId]
              );
              await connection.query(
                'UPDATE games SET average_rating = ? WHERE id = ?',
                [avgResult[0].avg || 0, action.gameId]
              );
              result.averageRating = avgResult[0].avg;
              break;

            case 'comment':
              // Add comment
              const [commentResult] = await connection.query(
                'INSERT INTO game_comments (game_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
                [action.gameId, userId, action.parentId || null, action.content]
              );
              result.commentId = commentResult.insertId;
              break;

            case 'notification_read':
              // Mark notification as read
              await connection.query(`
                INSERT IGNORE INTO notification_reads (notification_id, user_id, read_at)
                VALUES (?, ?, NOW())
              `, [action.notificationId, userId]);
              break;

            default:
              result.success = false;
              result.error = 'Unknown action type';
          }

          results.push(result);
        } catch (actionError) {
          results.push({
            id: action.id,
            success: false,
            error: actionError.message
          });
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.json({
      success: true,
      data: {
        processed: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      }
    });
  } catch (error) {
    console.error('Batch sync error:', error);
    res.status(500).json({ success: false, error: 'Failed to process batch' });
  }
});

/**
 * GET /api/sync/games
 * Get all active games with pagination (for initial sync)
 */
router.get('/games', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user?.id;

    const [games] = await pool.query(`
      SELECT
        g.*,
        u.username as creator_username,
        u.avatar as creator_avatar
      FROM games g
      LEFT JOIN users u ON g.creator_id = u.id
      WHERE g.is_active = true
      ORDER BY g.updated_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM games WHERE is_active = true'
    );

    // Get user's liked games
    let userLikes = [];
    if (userId) {
      const [likes] = await pool.query(
        'SELECT game_id FROM game_likes WHERE user_id = ?',
        [userId]
      );
      userLikes = likes.map(l => l.game_id);
    }

    res.json({
      success: true,
      data: games.map(game => ({
        ...game,
        isLiked: userLikes.includes(game.id),
        creator: {
          username: game.creator_username,
          avatar: game.creator_avatar
        }
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Sync games error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch games' });
  }
});

module.exports = router;
