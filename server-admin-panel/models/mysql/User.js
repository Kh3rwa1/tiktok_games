/**
 * User Model for MySQL
 */

const { pool } = require('../../config/database');
const bcrypt = require('bcryptjs');

class UserModel {
  /**
   * Create a new user
   */
  async create(userData) {
    const { username, email, password, avatar, bio } = userData;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.execute(
      `INSERT INTO users (username, email, password, avatar, bio) VALUES (?, ?, ?, ?, ?)`,
      [
        username,
        email.toLowerCase(),
        hashedPassword,
        avatar || 'https://via.placeholder.com/150',
        bio || ''
      ]
    );

    return this.findById(result.insertId);
  }

  /**
   * Find user by ID
   */
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT id, username, email, avatar, bio, total_games_played, total_play_time,
              is_active, role, created_at, updated_at
       FROM users WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) return null;

    return this.formatUser(rows[0]);
  }

  /**
   * Find user by ID with password (for auth)
   */
  async findByIdWithPassword(id) {
    const [rows] = await pool.execute(
      `SELECT * FROM users WHERE id = ?`,
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    const [rows] = await pool.execute(
      `SELECT * FROM users WHERE email = ?`,
      [email.toLowerCase()]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find user by username
   */
  async findByUsername(username) {
    const [rows] = await pool.execute(
      `SELECT id, username, email, avatar, bio FROM users WHERE username = ?`,
      [username]
    );
    return rows.length > 0 ? this.formatUser(rows[0]) : null;
  }

  /**
   * Update user profile
   */
  async update(id, updates) {
    const allowedFields = ['username', 'bio', 'avatar'];
    const updateFields = [];
    const values = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }

    if (updateFields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    await pool.execute(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * Update user password
   */
  async updatePassword(id, newPassword) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.execute(
      `UPDATE users SET password = ? WHERE id = ?`,
      [hashedPassword, id]
    );

    return true;
  }

  /**
   * Compare passwords
   */
  async comparePassword(candidatePassword, hashedPassword) {
    return bcrypt.compare(candidatePassword, hashedPassword);
  }

  /**
   * Add game to favorites
   */
  async addFavorite(userId, gameId) {
    try {
      await pool.execute(
        `INSERT IGNORE INTO user_favorites (user_id, game_id) VALUES (?, ?)`,
        [userId, gameId]
      );
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove game from favorites
   */
  async removeFavorite(userId, gameId) {
    await pool.execute(
      `DELETE FROM user_favorites WHERE user_id = ? AND game_id = ?`,
      [userId, gameId]
    );
    return true;
  }

  /**
   * Get user favorites
   */
  async getFavorites(userId) {
    const [rows] = await pool.execute(
      `SELECT g.* FROM games g
       INNER JOIN user_favorites uf ON g.id = uf.game_id
       WHERE uf.user_id = ? AND g.is_active = TRUE
       ORDER BY uf.created_at DESC`,
      [userId]
    );
    return rows;
  }

  /**
   * Add play history entry
   */
  async addPlayHistory(userId, playData) {
    await pool.execute(
      `INSERT INTO play_history (user_id, game_id, duration) VALUES (?, ?, ?)`,
      [userId, playData.gameId, playData.duration || 0]
    );

    // Update user stats
    await pool.execute(
      `UPDATE users SET
        total_games_played = total_games_played + 1,
        total_play_time = total_play_time + ?
       WHERE id = ?`,
      [playData.duration || 0, userId]
    );

    return true;
  }

  /**
   * Get play history
   */
  async getPlayHistory(userId, limit = 20) {
    const [rows] = await pool.execute(
      `SELECT ph.*, g.title, g.thumbnail
       FROM play_history ph
       INNER JOIN games g ON ph.game_id = g.id
       WHERE ph.user_id = ?
       ORDER BY ph.played_at DESC
       LIMIT ?`,
      [userId, limit]
    );
    return rows;
  }

  /**
   * Delete user
   */
  async delete(id) {
    await pool.execute(`DELETE FROM users WHERE id = ?`, [id]);
    return true;
  }

  /**
   * Format user object
   */
  formatUser(user) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      stats: {
        totalGamesPlayed: user.total_games_played,
        totalPlayTime: user.total_play_time
      },
      isActive: user.is_active,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }

  /**
   * Get public profile
   */
  toPublicProfile(user) {
    return {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      stats: user.stats || {
        totalGamesPlayed: user.total_games_played || 0,
        totalPlayTime: user.total_play_time || 0
      },
      createdAt: user.createdAt || user.created_at
    };
  }
}

module.exports = new UserModel();
