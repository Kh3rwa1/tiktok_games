/**
 * Sync Routes - Real-time data synchronization for mobile app and admin panel
 * Supports delta sync, timestamps, and efficient data transfer
 */

const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/auth');
const { pool } = require('../config/database');
const Game = require('../models/mysql/Game');

// ==================== DELTA SYNC ====================

/**
 * Get changes since last sync
 * Returns all data modified after the given timestamp
 */
router.get('/changes', optionalAuth, async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : new Date(0);
    const userId = req.user?.id || null;

    // Get updated games
    const [games] = await pool.execute(
      `SELECT
        g.*,
        u.username as creator_username,
        u.avatar as creator_avatar
       FROM games g
       LEFT JOIN users u ON g.creator_id = u.id
       WHERE g.updated_at > ? OR g.created_at > ?
       ORDER BY g.updated_at DESC
       LIMIT 100`,
      [since, since]
    );

    // Get user-specific data if authenticated
    let userLikes = [];
    let userFavorites = [];
    let notifications = [];

    if (userId) {
      // Get user's likes
      const [likes] = await pool.execute(
        `SELECT game_id, created_at FROM game_likes
         WHERE user_id = ? AND created_at > ?`,
        [userId, since]
      );
      userLikes = likes.map(l => l.game_id);

      // Get user's favorites
      const [favorites] = await pool.execute(
        `SELECT game_id, created_at FROM user_favorites
         WHERE user_id = ? AND created_at > ?`,
        [userId, since]
      );
      userFavorites = favorites.map(f => f.game_id);

      // Get new notifications
      const [notifs] = await pool.execute(
        `SELECT id, title, message, type, created_at FROM notifications
         WHERE is_active = TRUE
         AND (start_date IS NULL OR start_date <= NOW())
         AND (end_date IS NULL OR end_date >= NOW())
         AND created_at > ?
         ORDER BY created_at DESC
         LIMIT 50`,
        [since]
      );
      notifications = notifs;
    }

    // Get server timestamp for next sync
    const serverTime = new Date().toISOString();

    res.json({
      success: true,
      data: {
        games: games.map(game => Game.prototype.formatGame ? Game.prototype.formatGame.call(Game, game) : formatGameBasic(game)),
        userLikes,
        userFavorites,
        notifications
      },
      syncTimestamp: serverTime,
      hasMore: games.length === 100
    });
  } catch (error) {
    console.error('Sync changes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch changes' });
  }
});

/**
 * Get full sync data for initial load or recovery
 */
router.get('/full', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // Get all active games
    const result = await Game.findAll({
      page,
      limit,
      isActive: true,
      sortBy: 'createdAt',
      order: 'desc'
    });

    // Get user-specific data if authenticated
    let userLikes = [];
    let userFavorites = [];
    let userRatings = [];

    if (userId) {
      // Get all user's likes
      const [likes] = await pool.execute(
        `SELECT game_id FROM game_likes WHERE user_id = ?`,
        [userId]
      );
      userLikes = likes.map(l => l.game_id);

      // Get all user's favorites
      const [favorites] = await pool.execute(
        `SELECT game_id FROM user_favorites WHERE user_id = ?`,
        [userId]
      );
      userFavorites = favorites.map(f => f.game_id);

      // Get all user's ratings
      const [ratings] = await pool.execute(
        `SELECT game_id, rating FROM game_ratings WHERE user_id = ?`,
        [userId]
      );
      userRatings = ratings;
    }

    // Get active notifications
    const [notifications] = await pool.execute(
      `SELECT id, title, message, type, created_at FROM notifications
       WHERE is_active = TRUE
       AND (start_date IS NULL OR start_date <= NOW())
       AND (end_date IS NULL OR end_date >= NOW())
       ORDER BY created_at DESC
       LIMIT 20`
    );

    // Get server timestamp for next sync
    const serverTime = new Date().toISOString();

    res.json({
      success: true,
      data: {
        games: result.games,
        userLikes,
        userFavorites,
        userRatings,
        notifications
      },
      pagination: result.pagination,
      syncTimestamp: serverTime
    });
  } catch (error) {
    console.error('Full sync error:', error);
    res.status(500).json({ success: false, message: 'Failed to perform full sync' });
  }
});

/**
 * Get specific game with full details for sync
 */
router.get('/game/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;

    const game = await Game.findById(id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    // Get user-specific data
    let isLiked = false;
    let isFavorited = false;
    let userRating = null;

    if (userId) {
      const [[liked]] = await pool.execute(
        `SELECT id FROM game_likes WHERE game_id = ? AND user_id = ?`,
        [id, userId]
      );
      isLiked = !!liked;

      const [[favorited]] = await pool.execute(
        `SELECT id FROM user_favorites WHERE game_id = ? AND user_id = ?`,
        [id, userId]
      );
      isFavorited = !!favorited;

      const [[rating]] = await pool.execute(
        `SELECT rating FROM game_ratings WHERE game_id = ? AND user_id = ?`,
        [id, userId]
      );
      userRating = rating ? rating.rating : null;
    }

    res.json({
      success: true,
      data: {
        ...game,
        isLiked,
        isFavorited,
        userRating
      },
      syncTimestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sync game error:', error);
    res.status(500).json({ success: false, message: 'Failed to sync game' });
  }
});

/**
 * Batch sync multiple games by IDs
 */
router.post('/games/batch', optionalAuth, async (req, res) => {
  try {
    const { gameIds } = req.body;
    const userId = req.user?.id || null;

    if (!Array.isArray(gameIds) || gameIds.length === 0) {
      return res.status(400).json({ success: false, message: 'gameIds array required' });
    }

    // Limit batch size
    const ids = gameIds.slice(0, 50);
    const placeholders = ids.map(() => '?').join(',');

    const [games] = await pool.execute(
      `SELECT
        g.*,
        u.username as creator_username,
        u.avatar as creator_avatar
       FROM games g
       LEFT JOIN users u ON g.creator_id = u.id
       WHERE g.id IN (${placeholders})`,
      ids
    );

    // Get user-specific data
    let userLikesMap = {};
    let userFavoritesMap = {};

    if (userId && ids.length > 0) {
      const [likes] = await pool.execute(
        `SELECT game_id FROM game_likes WHERE user_id = ? AND game_id IN (${placeholders})`,
        [userId, ...ids]
      );
      likes.forEach(l => userLikesMap[l.game_id] = true);

      const [favorites] = await pool.execute(
        `SELECT game_id FROM user_favorites WHERE user_id = ? AND game_id IN (${placeholders})`,
        [userId, ...ids]
      );
      favorites.forEach(f => userFavoritesMap[f.game_id] = true);
    }

    const formattedGames = games.map(game => ({
      ...formatGameBasic(game),
      isLiked: !!userLikesMap[game.id],
      isFavorited: !!userFavoritesMap[game.id]
    }));

    res.json({
      success: true,
      data: formattedGames,
      syncTimestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Batch sync error:', error);
    res.status(500).json({ success: false, message: 'Failed to batch sync games' });
  }
});

/**
 * Get stats summary for admin dashboard sync
 */
router.get('/admin/stats', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    // Get real-time stats
    const [userStats] = await pool.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END) as new_today
      FROM users
    `);

    const gameStats = await Game.getStats();

    const [activityStats] = await pool.execute(`
      SELECT
        (SELECT COUNT(*) FROM game_likes WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)) as likes_last_hour,
        (SELECT COUNT(*) FROM game_comments WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)) as comments_last_hour,
        (SELECT SUM(plays) FROM games WHERE updated_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)) as plays_last_hour
    `);

    res.json({
      success: true,
      data: {
        users: userStats[0],
        games: gameStats,
        activity: activityStats[0]
      },
      syncTimestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Admin stats sync error:', error);
    res.status(500).json({ success: false, message: 'Failed to sync admin stats' });
  }
});

/**
 * Heartbeat endpoint for connection status
 */
router.get('/heartbeat', (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    status: 'online'
  });
});

// Helper function to format game
function formatGameBasic(game) {
  return {
    id: game.id,
    title: game.title,
    description: game.description,
    thumbnail: game.thumbnail,
    gameUrl: game.game_url,
    category: game.category,
    tags: typeof game.tags === 'string' ? JSON.parse(game.tags || '[]') : (game.tags || []),
    difficulty: game.difficulty,
    creatorId: game.creator_id,
    creator: game.creator_username ? {
      id: game.creator_id,
      username: game.creator_username,
      avatar: game.creator_avatar
    } : null,
    stats: {
      views: game.views || 0,
      plays: game.plays || 0,
      likes: game.likes || 0,
      shares: game.shares || 0,
      averagePlayTime: game.average_play_time || 0
    },
    averageRating: parseFloat(game.average_rating) || 0,
    isActive: game.is_active,
    isFeatured: game.is_featured,
    version: game.version,
    fileSize: game.file_size,
    createdAt: game.created_at,
    updatedAt: game.updated_at
  };
}

module.exports = router;
