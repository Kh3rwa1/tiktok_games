/**
 * Game Model for MySQL
 */

const { pool } = require('../../config/database');

class GameModel {
  /**
   * Create a new game
   */
  async create(gameData) {
    const [result] = await pool.execute(
      `INSERT INTO games (title, description, thumbnail, game_url, category, tags,
        difficulty, creator_id, controls, requirements, is_featured, version, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        gameData.title,
        gameData.description || '',
        gameData.thumbnail || '',
        gameData.gameUrl || '',
        gameData.category || 'casual',
        JSON.stringify(gameData.tags || []),
        gameData.difficulty || 'medium',
        gameData.creatorId,
        gameData.controls || '',
        gameData.requirements || '',
        gameData.isFeatured || false,
        gameData.version || '1.0.0',
        gameData.fileSize || 0
      ]
    );

    return this.findById(result.insertId);
  }

  /**
   * Find game by ID
   */
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT g.*, u.username as creator_username, u.avatar as creator_avatar
       FROM games g
       LEFT JOIN users u ON g.creator_id = u.id
       WHERE g.id = ?`,
      [id]
    );

    if (rows.length === 0) return null;

    return this.formatGame(rows[0]);
  }

  /**
   * Find all games with pagination and filters
   */
  async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      sortBy = 'createdAt',
      order = 'desc',
      featured,
      isActive = true,
      difficulty
    } = options;

    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];

    // Only filter by isActive if explicitly set
    if (isActive !== undefined) {
      conditions.push('g.is_active = ?');
      values.push(isActive);
    }

    if (category) {
      conditions.push('g.category = ?');
      values.push(category);
    }

    if (difficulty) {
      conditions.push('g.difficulty = ?');
      values.push(difficulty);
    }

    if (featured !== undefined) {
      conditions.push('g.is_featured = ?');
      values.push(featured);
    }

    if (search) {
      conditions.push('(g.title LIKE ? OR g.description LIKE ?)');
      values.push(`%${search}%`, `%${search}%`);
    }

    const sortField = this.getSortField(sortBy);
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Build WHERE clause
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get games
    const [games] = await pool.execute(
      `SELECT g.*, u.username as creator_username, u.avatar as creator_avatar
       FROM games g
       LEFT JOIN users u ON g.creator_id = u.id
       ${whereClause}
       ORDER BY ${sortField} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM games g ${whereClause}`,
      values
    );

    const total = countResult[0].total;

    return {
      games: games.map(game => this.formatGame(game)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: offset + games.length < total
      }
    };
  }

  /**
   * Update game
   */
  async update(id, updates) {
    const allowedFields = [
      'title', 'description', 'thumbnail', 'game_url', 'category',
      'tags', 'difficulty', 'controls', 'requirements', 'is_active', 'is_featured',
      'file_size', 'version'
    ];

    const fieldMapping = {
      gameUrl: 'game_url',
      isActive: 'is_active',
      isFeatured: 'is_featured',
      fileSize: 'file_size'
    };

    const updateFields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      const dbField = fieldMapping[key] || key;
      if (allowedFields.includes(dbField)) {
        updateFields.push(`${dbField} = ?`);
        values.push(key === 'tags' ? JSON.stringify(value) : value);
      }
    }

    if (updateFields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    await pool.execute(
      `UPDATE games SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  /**
   * Delete game (soft delete)
   */
  async delete(id) {
    await pool.execute(
      `UPDATE games SET is_active = FALSE WHERE id = ?`,
      [id]
    );
    return true;
  }

  /**
   * Increment views
   */
  async incrementViews(id) {
    await pool.execute(
      `UPDATE games SET views = views + 1 WHERE id = ?`,
      [id]
    );
    return true;
  }

  /**
   * Increment plays
   */
  async incrementPlays(id) {
    await pool.execute(
      `UPDATE games SET plays = plays + 1 WHERE id = ?`,
      [id]
    );
    return true;
  }

  /**
   * Toggle like
   */
  async toggleLike(gameId, userId) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check if already liked
      const [existing] = await connection.execute(
        `SELECT id FROM game_likes WHERE game_id = ? AND user_id = ?`,
        [gameId, userId]
      );

      if (existing.length > 0) {
        // Unlike
        await connection.execute(
          `DELETE FROM game_likes WHERE game_id = ? AND user_id = ?`,
          [gameId, userId]
        );
        await connection.execute(
          `UPDATE games SET likes = likes - 1 WHERE id = ?`,
          [gameId]
        );
      } else {
        // Like
        await connection.execute(
          `INSERT INTO game_likes (game_id, user_id) VALUES (?, ?)`,
          [gameId, userId]
        );
        await connection.execute(
          `UPDATE games SET likes = likes + 1 WHERE id = ?`,
          [gameId]
        );
      }

      await connection.commit();
      connection.release();

      return this.findById(gameId);
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  /**
   * Check if user liked game
   */
  async isLikedBy(gameId, userId) {
    const [rows] = await pool.execute(
      `SELECT id FROM game_likes WHERE game_id = ? AND user_id = ?`,
      [gameId, userId]
    );
    return rows.length > 0;
  }

  /**
   * Get users who liked a game
   */
  async getLikedBy(gameId) {
    const [rows] = await pool.execute(
      `SELECT user_id FROM game_likes WHERE game_id = ?`,
      [gameId]
    );
    return rows.map(row => row.user_id);
  }

  /**
   * Add or update rating
   */
  async addRating(gameId, userId, rating) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Upsert rating
      await connection.execute(
        `INSERT INTO game_ratings (game_id, user_id, rating)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE rating = ?, updated_at = CURRENT_TIMESTAMP`,
        [gameId, userId, rating, rating]
      );

      // Calculate new average
      const [avgResult] = await connection.execute(
        `SELECT AVG(rating) as avg_rating, COUNT(*) as total
         FROM game_ratings WHERE game_id = ?`,
        [gameId]
      );

      const avgRating = avgResult[0].avg_rating || 0;

      await connection.execute(
        `UPDATE games SET average_rating = ? WHERE id = ?`,
        [avgRating, gameId]
      );

      await connection.commit();
      connection.release();

      return this.findById(gameId);
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  /**
   * Get game ratings
   */
  async getRatings(gameId) {
    const [rows] = await pool.execute(
      `SELECT gr.*, u.username, u.avatar
       FROM game_ratings gr
       INNER JOIN users u ON gr.user_id = u.id
       WHERE gr.game_id = ?
       ORDER BY gr.created_at DESC`,
      [gameId]
    );
    return rows;
  }

  /**
   * Get trending games
   */
  async getTrending(limit = 10) {
    const [rows] = await pool.execute(
      `SELECT g.*, u.username as creator_username, u.avatar as creator_avatar
       FROM games g
       LEFT JOIN users u ON g.creator_id = u.id
       WHERE g.is_active = TRUE
       ORDER BY g.plays DESC, g.likes DESC
       LIMIT ?`,
      [limit]
    );

    return rows.map(game => this.formatGame(game));
  }

  /**
   * Get recommended games
   */
  async getRecommended(limit = 10) {
    const [rows] = await pool.execute(
      `SELECT g.*, u.username as creator_username, u.avatar as creator_avatar
       FROM games g
       LEFT JOIN users u ON g.creator_id = u.id
       WHERE g.is_active = TRUE
       ORDER BY g.average_rating DESC, g.plays DESC
       LIMIT ?`,
      [limit]
    );

    return rows.map(game => this.formatGame(game));
  }

  /**
   * Get games by creator
   */
  async getByCreator(creatorId) {
    const [rows] = await pool.execute(
      `SELECT * FROM games
       WHERE creator_id = ?
       ORDER BY created_at DESC`,
      [creatorId]
    );

    return rows.map(game => this.formatGame(game));
  }

  /**
   * Get platform statistics
   */
  async getStats() {
    const [stats] = await pool.execute(`
      SELECT
        COUNT(*) as total_games,
        SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_games,
        SUM(CASE WHEN is_featured = TRUE THEN 1 ELSE 0 END) as featured_games,
        SUM(plays) as total_plays,
        SUM(views) as total_views,
        SUM(likes) as total_likes
      FROM games
    `);

    return {
      totalGames: stats[0].total_games || 0,
      activeGames: stats[0].active_games || 0,
      featuredGames: stats[0].featured_games || 0,
      totalPlays: stats[0].total_plays || 0,
      totalViews: stats[0].total_views || 0,
      totalLikes: stats[0].total_likes || 0
    };
  }

  /**
   * Get sort field for queries
   */
  getSortField(sortBy) {
    const sortFields = {
      'popular': 'g.plays',
      'likes': 'g.likes',
      'rating': 'g.average_rating',
      'createdAt': 'g.created_at',
      'views': 'g.views',
      'title': 'g.title'
    };

    return sortFields[sortBy] || 'g.created_at';
  }

  /**
   * Format game object
   */
  formatGame(game) {
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
        views: game.views,
        plays: game.plays,
        likes: game.likes,
        shares: game.shares,
        averagePlayTime: game.average_play_time
      },
      averageRating: parseFloat(game.average_rating) || 0,
      isActive: game.is_active,
      isFeatured: game.is_featured,
      version: game.version,
      fileSize: game.file_size,
      controls: game.controls,
      requirements: game.requirements,
      createdAt: game.created_at,
      updatedAt: game.updated_at
    };
  }
}

module.exports = new GameModel();
