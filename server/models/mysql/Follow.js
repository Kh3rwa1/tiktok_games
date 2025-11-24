/**
 * Follow Model for TikTok-style user following
 */

const { pool } = require('../../config/database');

class Follow {
  /**
   * Follow a user
   */
  static async follow(followerId, followingId) {
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    try {
      await pool.execute(
        `INSERT INTO user_follows (follower_id, following_id) VALUES (?, ?)`,
        [followerId, followingId]
      );

      // Update counts
      await pool.execute(
        `UPDATE users SET following_count = following_count + 1 WHERE id = ?`,
        [followerId]
      );
      await pool.execute(
        `UPDATE users SET followers_count = followers_count + 1 WHERE id = ?`,
        [followingId]
      );

      return { followed: true };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Already following this user');
      }
      throw error;
    }
  }

  /**
   * Unfollow a user
   */
  static async unfollow(followerId, followingId) {
    const [result] = await pool.execute(
      `DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?`,
      [followerId, followingId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Not following this user');
    }

    // Update counts
    await pool.execute(
      `UPDATE users SET following_count = following_count - 1 WHERE id = ?`,
      [followerId]
    );
    await pool.execute(
      `UPDATE users SET followers_count = followers_count - 1 WHERE id = ?`,
      [followingId]
    );

    return { unfollowed: true };
  }

  /**
   * Check if user is following another user
   */
  static async isFollowing(followerId, followingId) {
    const [[result]] = await pool.execute(
      `SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?`,
      [followerId, followingId]
    );
    return !!result;
  }

  /**
   * Get followers of a user
   */
  static async getFollowers(userId, page = 1, limit = 20, currentUserId = null) {
    const offset = (page - 1) * limit;

    const [followers] = await pool.execute(
      `SELECT
        u.id,
        u.username,
        u.avatar,
        u.bio,
        u.followers_count,
        u.following_count,
        u.games_count,
        uf.created_at as followed_at,
        ${currentUserId ? `(SELECT COUNT(*) FROM user_follows WHERE follower_id = ? AND following_id = u.id) as is_following` : '0 as is_following'}
       FROM user_follows uf
       JOIN users u ON uf.follower_id = u.id
       WHERE uf.following_id = ? AND u.is_active = TRUE
       ORDER BY uf.created_at DESC
       LIMIT ? OFFSET ?`,
      currentUserId ? [currentUserId, userId, limit, offset] : [userId, limit, offset]
    );

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) as total FROM user_follows uf
       JOIN users u ON uf.follower_id = u.id
       WHERE uf.following_id = ? AND u.is_active = TRUE`,
      [userId]
    );

    return {
      followers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get users that a user is following
   */
  static async getFollowing(userId, page = 1, limit = 20, currentUserId = null) {
    const offset = (page - 1) * limit;

    const [following] = await pool.execute(
      `SELECT
        u.id,
        u.username,
        u.avatar,
        u.bio,
        u.followers_count,
        u.following_count,
        u.games_count,
        uf.created_at as followed_at,
        ${currentUserId ? `(SELECT COUNT(*) FROM user_follows WHERE follower_id = ? AND following_id = u.id) as is_following` : '1 as is_following'}
       FROM user_follows uf
       JOIN users u ON uf.following_id = u.id
       WHERE uf.follower_id = ? AND u.is_active = TRUE
       ORDER BY uf.created_at DESC
       LIMIT ? OFFSET ?`,
      currentUserId ? [currentUserId, userId, limit, offset] : [userId, limit, offset]
    );

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) as total FROM user_follows uf
       JOIN users u ON uf.following_id = u.id
       WHERE uf.follower_id = ? AND u.is_active = TRUE`,
      [userId]
    );

    return {
      following,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get games from users that a user follows (for feed)
   */
  static async getFollowingGames(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const [games] = await pool.execute(
      `SELECT
        g.*,
        u.username as creator_username,
        u.avatar as creator_avatar
       FROM games g
       JOIN users u ON g.creator_id = u.id
       WHERE g.creator_id IN (
         SELECT following_id FROM user_follows WHERE follower_id = ?
       ) AND g.is_active = TRUE
       ORDER BY g.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) as total FROM games g
       WHERE g.creator_id IN (
         SELECT following_id FROM user_follows WHERE follower_id = ?
       ) AND g.is_active = TRUE`,
      [userId]
    );

    return {
      games,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get suggested users to follow
   */
  static async getSuggestions(userId, limit = 10) {
    const [suggestions] = await pool.execute(
      `SELECT
        u.id,
        u.username,
        u.avatar,
        u.bio,
        u.followers_count,
        u.games_count
       FROM users u
       WHERE u.id != ?
         AND u.is_active = TRUE
         AND u.id NOT IN (SELECT following_id FROM user_follows WHERE follower_id = ?)
       ORDER BY u.followers_count DESC, u.games_count DESC
       LIMIT ?`,
      [userId, userId, limit]
    );

    return suggestions;
  }
}

module.exports = Follow;
