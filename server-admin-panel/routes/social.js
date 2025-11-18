/**
 * Social Routes - TikTok-style social features
 * Comments, follows, shares, and user profiles
 */

const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { protect, optionalAuth } = require('../middleware/auth');
const Comment = require('../models/mysql/Comment');
const Follow = require('../models/mysql/Follow');
const { pool } = require('../config/database');

// ==================== COMMENTS ====================

/**
 * Get comments for a game
 */
router.get('/games/:gameId/comments', optionalAuth, async (req, res) => {
  try {
    const { gameId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const userId = req.user?.id || null;

    const result = await Comment.getByGameId(gameId, page, limit, userId);

    res.json({
      success: true,
      data: result.comments,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch comments' });
  }
});

/**
 * Get replies to a comment
 */
router.get('/comments/:commentId/replies', optionalAuth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const userId = req.user?.id || null;

    const result = await Comment.getReplies(commentId, page, limit, userId);

    res.json({
      success: true,
      data: result.replies,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get replies error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch replies' });
  }
});

/**
 * Create a comment
 */
router.post('/games/:gameId/comments', protect, [
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Comment must be 1-1000 characters'),
  body('parentId').optional().isInt().withMessage('Invalid parent comment ID')
], async (req, res) => {
  try {
    const { gameId } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user.id;

    const commentId = await Comment.create(gameId, userId, content, parentId || null);

    res.status(201).json({
      success: true,
      message: 'Comment created',
      data: { id: commentId }
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ success: false, message: 'Failed to create comment' });
  }
});

/**
 * Like/unlike a comment
 */
router.post('/comments/:commentId/like', protect, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const result = await Comment.toggleLike(commentId, userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Toggle comment like error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle like' });
  }
});

/**
 * Delete a comment
 */
router.delete('/comments/:commentId', protect, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    await Comment.delete(commentId, userId);

    res.json({
      success: true,
      message: 'Comment deleted'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    if (error.message === 'Not authorized to delete this comment') {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Failed to delete comment' });
  }
});

// ==================== FOLLOWS ====================

/**
 * Follow a user
 */
router.post('/users/:userId/follow', protect, async (req, res) => {
  try {
    const followingId = parseInt(req.params.userId);
    const followerId = req.user.id;

    const result = await Follow.follow(followerId, followingId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Follow error:', error);
    if (error.message === 'Cannot follow yourself' || error.message === 'Already following this user') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Failed to follow user' });
  }
});

/**
 * Unfollow a user
 */
router.delete('/users/:userId/follow', protect, async (req, res) => {
  try {
    const followingId = parseInt(req.params.userId);
    const followerId = req.user.id;

    const result = await Follow.unfollow(followerId, followingId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Unfollow error:', error);
    if (error.message === 'Not following this user') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Failed to unfollow user' });
  }
});

/**
 * Get followers of a user
 */
router.get('/users/:userId/followers', optionalAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const currentUserId = req.user?.id || null;

    const result = await Follow.getFollowers(userId, page, limit, currentUserId);

    res.json({
      success: true,
      data: result.followers,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch followers' });
  }
});

/**
 * Get users that a user is following
 */
router.get('/users/:userId/following', optionalAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const currentUserId = req.user?.id || null;

    const result = await Follow.getFollowing(userId, page, limit, currentUserId);

    res.json({
      success: true,
      data: result.following,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch following' });
  }
});

/**
 * Get suggested users to follow
 */
router.get('/suggestions', protect, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const suggestions = await Follow.getSuggestions(req.user.id, limit);

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch suggestions' });
  }
});

// ==================== USER PROFILES ====================

/**
 * Get user profile
 */
router.get('/users/:userId/profile', optionalAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id || null;

    const [[user]] = await pool.execute(
      `SELECT
        id,
        username,
        email,
        avatar,
        bio,
        total_games_played,
        total_play_time,
        followers_count,
        following_count,
        games_count,
        created_at,
        ${currentUserId ? `(SELECT COUNT(*) FROM user_follows WHERE follower_id = ? AND following_id = users.id) as is_following` : '0 as is_following'}
       FROM users
       WHERE id = ? AND is_active = TRUE`,
      currentUserId ? [currentUserId, userId] : [userId]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get user's games
    const [games] = await pool.execute(
      `SELECT id, title, thumbnail, plays, likes, average_rating, created_at
       FROM games
       WHERE creator_id = ? AND is_active = TRUE
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        ...user,
        games
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

/**
 * Get user's games
 */
router.get('/users/:userId/games', optionalAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [games] = await pool.execute(
      `SELECT
        g.*,
        u.username as creator_username,
        u.avatar as creator_avatar
       FROM games g
       JOIN users u ON g.creator_id = u.id
       WHERE g.creator_id = ? AND g.is_active = TRUE
       ORDER BY g.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) as total FROM games WHERE creator_id = ? AND is_active = TRUE`,
      [userId]
    );

    res.json({
      success: true,
      data: games,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user games error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user games' });
  }
});

// ==================== FEED ====================

/**
 * Get personalized feed (For You Page style)
 */
router.get('/feed', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const userId = req.user?.id || null;

    let games;
    let total;

    if (userId) {
      // Personalized feed: mix of following + trending
      [games] = await pool.execute(
        `SELECT
          g.*,
          u.username as creator_username,
          u.avatar as creator_avatar,
          ${userId ? `(SELECT COUNT(*) FROM game_likes WHERE game_id = g.id AND user_id = ?) as is_liked` : '0 as is_liked'},
          ${userId ? `(SELECT COUNT(*) FROM user_favorites WHERE game_id = g.id AND user_id = ?) as is_favorited` : '0 as is_favorited'}
         FROM games g
         JOIN users u ON g.creator_id = u.id
         WHERE g.is_active = TRUE
         ORDER BY
           CASE WHEN g.creator_id IN (SELECT following_id FROM user_follows WHERE follower_id = ?) THEN 0 ELSE 1 END,
           (g.plays * 2 + g.likes * 3 + g.views) DESC,
           g.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, userId, userId, limit, offset]
      );

      [[{ total }]] = await pool.execute(
        `SELECT COUNT(*) as total FROM games WHERE is_active = TRUE`
      );
    } else {
      // Public feed: trending games
      [games] = await pool.execute(
        `SELECT
          g.*,
          u.username as creator_username,
          u.avatar as creator_avatar,
          0 as is_liked,
          0 as is_favorited
         FROM games g
         JOIN users u ON g.creator_id = u.id
         WHERE g.is_active = TRUE
         ORDER BY (g.plays * 2 + g.likes * 3 + g.views) DESC, g.created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      [[{ total }]] = await pool.execute(
        `SELECT COUNT(*) as total FROM games WHERE is_active = TRUE`
      );
    }

    res.json({
      success: true,
      data: games,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch feed' });
  }
});

/**
 * Get following feed (only games from followed users)
 */
router.get('/feed/following', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const userId = req.user.id;

    const result = await Follow.getFollowingGames(userId, page, limit);

    res.json({
      success: true,
      data: result.games,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get following feed error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch following feed' });
  }
});

// ==================== SHARES ====================

/**
 * Record a share
 */
router.post('/games/:gameId/share', optionalAuth, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { platform } = req.body;
    const userId = req.user?.id || null;

    await pool.execute(
      `INSERT INTO game_shares (game_id, user_id, platform) VALUES (?, ?, ?)`,
      [gameId, userId, platform || 'link']
    );

    await pool.execute(
      `UPDATE games SET shares = shares + 1 WHERE id = ?`,
      [gameId]
    );

    res.json({
      success: true,
      message: 'Share recorded'
    });
  } catch (error) {
    console.error('Record share error:', error);
    res.status(500).json({ success: false, message: 'Failed to record share' });
  }
});

module.exports = router;
