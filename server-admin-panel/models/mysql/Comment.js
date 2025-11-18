/**
 * Comment Model for TikTok-style game comments
 */

const { pool } = require('../../config/database');

class Comment {
  /**
   * Create a new comment
   */
  static async create(gameId, userId, content, parentId = null) {
    const [result] = await pool.execute(
      `INSERT INTO game_comments (game_id, user_id, content, parent_id)
       VALUES (?, ?, ?, ?)`,
      [gameId, userId, content, parentId]
    );

    // Update game comments count
    await pool.execute(
      `UPDATE games SET comments_count = comments_count + 1 WHERE id = ?`,
      [gameId]
    );

    return result.insertId;
  }

  /**
   * Get comments for a game with pagination
   */
  static async getByGameId(gameId, page = 1, limit = 20, userId = null) {
    const offset = (page - 1) * limit;

    // Get top-level comments
    const [comments] = await pool.execute(
      `SELECT
        c.id,
        c.game_id,
        c.user_id,
        c.parent_id,
        c.content,
        c.likes,
        c.is_pinned,
        c.created_at,
        c.updated_at,
        u.username,
        u.avatar,
        (SELECT COUNT(*) FROM game_comments WHERE parent_id = c.id) as reply_count,
        ${userId ? `(SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id AND user_id = ?) as is_liked` : '0 as is_liked'}
       FROM game_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.game_id = ? AND c.parent_id IS NULL AND c.is_hidden = FALSE
       ORDER BY c.is_pinned DESC, c.created_at DESC
       LIMIT ? OFFSET ?`,
      userId ? [userId, gameId, limit, offset] : [gameId, limit, offset]
    );

    // Get total count
    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) as total FROM game_comments
       WHERE game_id = ? AND parent_id IS NULL AND is_hidden = FALSE`,
      [gameId]
    );

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get replies to a comment
   */
  static async getReplies(commentId, page = 1, limit = 10, userId = null) {
    const offset = (page - 1) * limit;

    const [replies] = await pool.execute(
      `SELECT
        c.id,
        c.game_id,
        c.user_id,
        c.parent_id,
        c.content,
        c.likes,
        c.created_at,
        c.updated_at,
        u.username,
        u.avatar,
        ${userId ? `(SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id AND user_id = ?) as is_liked` : '0 as is_liked'}
       FROM game_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.parent_id = ? AND c.is_hidden = FALSE
       ORDER BY c.created_at ASC
       LIMIT ? OFFSET ?`,
      userId ? [userId, commentId, limit, offset] : [commentId, limit, offset]
    );

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) as total FROM game_comments
       WHERE parent_id = ? AND is_hidden = FALSE`,
      [commentId]
    );

    return {
      replies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Toggle like on a comment
   */
  static async toggleLike(commentId, userId) {
    // Check if already liked
    const [[existing]] = await pool.execute(
      `SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?`,
      [commentId, userId]
    );

    if (existing) {
      // Unlike
      await pool.execute(
        `DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?`,
        [commentId, userId]
      );
      await pool.execute(
        `UPDATE game_comments SET likes = likes - 1 WHERE id = ?`,
        [commentId]
      );
      return { liked: false };
    } else {
      // Like
      await pool.execute(
        `INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)`,
        [commentId, userId]
      );
      await pool.execute(
        `UPDATE game_comments SET likes = likes + 1 WHERE id = ?`,
        [commentId]
      );
      return { liked: true };
    }
  }

  /**
   * Delete a comment
   */
  static async delete(commentId, userId) {
    // Get comment to check ownership and get game_id
    const [[comment]] = await pool.execute(
      `SELECT id, game_id, user_id FROM game_comments WHERE id = ?`,
      [commentId]
    );

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.user_id !== userId) {
      throw new Error('Not authorized to delete this comment');
    }

    // Count replies that will be deleted
    const [[{ replyCount }]] = await pool.execute(
      `SELECT COUNT(*) as replyCount FROM game_comments WHERE parent_id = ?`,
      [commentId]
    );

    // Delete comment (cascade will delete replies)
    await pool.execute(`DELETE FROM game_comments WHERE id = ?`, [commentId]);

    // Update game comments count
    const totalDeleted = 1 + replyCount;
    await pool.execute(
      `UPDATE games SET comments_count = comments_count - ? WHERE id = ?`,
      [totalDeleted, comment.game_id]
    );

    return { deleted: true };
  }

  /**
   * Pin/unpin a comment (admin only)
   */
  static async togglePin(commentId) {
    await pool.execute(
      `UPDATE game_comments SET is_pinned = NOT is_pinned WHERE id = ?`,
      [commentId]
    );
  }

  /**
   * Hide/unhide a comment (moderation)
   */
  static async toggleHide(commentId) {
    await pool.execute(
      `UPDATE game_comments SET is_hidden = NOT is_hidden WHERE id = ?`,
      [commentId]
    );
  }

  /**
   * Get user's comments
   */
  static async getByUserId(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const [comments] = await pool.execute(
      `SELECT
        c.*,
        g.title as game_title,
        g.thumbnail as game_thumbnail
       FROM game_comments c
       JOIN games g ON c.game_id = g.id
       WHERE c.user_id = ? AND c.is_hidden = FALSE
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) as total FROM game_comments
       WHERE user_id = ? AND is_hidden = FALSE`,
      [userId]
    );

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = Comment;
