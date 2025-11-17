const { admin, db } = require('../../config/firebase');

/**
 * Game Collection Helper for Firestore
 */
class GameModel {
  constructor() {
    this.collection = db.collection('games');
  }

  /**
   * Create a new game
   * @param {Object} gameData - Game data
   * @returns {Promise<Object>} - Created game
   */
  async create(gameData) {
    try {
      const gameDoc = {
        title: gameData.title,
        description: gameData.description,
        thumbnail: gameData.thumbnail,
        gameUrl: gameData.gameUrl,
        category: gameData.category || 'casual',
        tags: gameData.tags || [],
        difficulty: gameData.difficulty || 'medium',
        creatorId: gameData.creatorId,
        stats: {
          views: 0,
          plays: 0,
          likes: 0,
          shares: 0,
          averagePlayTime: 0
        },
        likedBy: [],
        ratings: [],
        averageRating: 0,
        isActive: true,
        isFeatured: gameData.isFeatured || false,
        version: gameData.version || '1.0.0',
        fileSize: gameData.fileSize || 0,
        controls: gameData.controls || '',
        requirements: gameData.requirements || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await this.collection.add(gameDoc);

      return {
        id: docRef.id,
        ...gameDoc
      };
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    }
  }

  /**
   * Find game by ID
   * @param {String} id - Game ID
   * @returns {Promise<Object|null>} - Game data or null
   */
  async findById(id) {
    try {
      const doc = await this.collection.doc(id).get();
      if (!doc.exists) {
        return null;
      }
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error finding game by ID:', error);
      throw error;
    }
  }

  /**
   * Find all games with pagination and filters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Games and pagination info
   */
  async findAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        search,
        sortBy = 'createdAt',
        order = 'desc',
        featured,
        isActive = true
      } = options;

      let query = this.collection.where('isActive', '==', isActive);

      // Filter by category
      if (category) {
        query = query.where('category', '==', category);
      }

      // Filter by featured
      if (featured !== undefined) {
        query = query.where('isFeatured', '==', featured);
      }

      // Sort
      const sortField = this.getSortField(sortBy);
      query = query.orderBy(sortField, order);

      // Pagination
      const offset = (page - 1) * limit;
      query = query.offset(offset).limit(limit);

      const snapshot = await query.get();

      let games = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Client-side search (Firestore doesn't support full-text search natively)
      if (search) {
        const searchLower = search.toLowerCase();
        games = games.filter(game =>
          game.title.toLowerCase().includes(searchLower) ||
          game.description.toLowerCase().includes(searchLower)
        );
      }

      // Get total count
      const totalSnapshot = await this.collection
        .where('isActive', '==', isActive)
        .get();
      const total = totalSnapshot.size;

      return {
        games,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error finding games:', error);
      throw error;
    }
  }

  /**
   * Update game
   * @param {String} id - Game ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated game
   */
  async update(id, updates) {
    try {
      const updateData = {
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await this.collection.doc(id).update(updateData);
      return this.findById(id);
    } catch (error) {
      console.error('Error updating game:', error);
      throw error;
    }
  }

  /**
   * Delete game
   * @param {String} id - Game ID
   * @returns {Promise<Boolean>} - Success status
   */
  async delete(id) {
    try {
      await this.collection.doc(id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting game:', error);
      throw error;
    }
  }

  /**
   * Increment views count
   * @param {String} id - Game ID
   * @returns {Promise<Boolean>} - Success status
   */
  async incrementViews(id) {
    try {
      await this.collection.doc(id).update({
        'stats.views': admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error incrementing views:', error);
      throw error;
    }
  }

  /**
   * Increment plays count
   * @param {String} id - Game ID
   * @returns {Promise<Boolean>} - Success status
   */
  async incrementPlays(id) {
    try {
      await this.collection.doc(id).update({
        'stats.plays': admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error incrementing plays:', error);
      throw error;
    }
  }

  /**
   * Toggle like on game
   * @param {String} gameId - Game ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} - Updated game
   */
  async toggleLike(gameId, userId) {
    try {
      const game = await this.findById(gameId);
      if (!game) {
        throw new Error('Game not found');
      }

      const isLiked = game.likedBy.includes(userId);

      if (isLiked) {
        // Unlike
        await this.collection.doc(gameId).update({
          likedBy: admin.firestore.FieldValue.arrayRemove(userId),
          'stats.likes': admin.firestore.FieldValue.increment(-1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Like
        await this.collection.doc(gameId).update({
          likedBy: admin.firestore.FieldValue.arrayUnion(userId),
          'stats.likes': admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      return this.findById(gameId);
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error;
    }
  }

  /**
   * Add or update rating
   * @param {String} gameId - Game ID
   * @param {String} userId - User ID
   * @param {Number} rating - Rating value (1-5)
   * @returns {Promise<Object>} - Updated game
   */
  async addRating(gameId, userId, rating) {
    try {
      const game = await this.findById(gameId);
      if (!game) {
        throw new Error('Game not found');
      }

      // Remove existing rating by this user
      const updatedRatings = game.ratings.filter(r => r.userId !== userId);

      // Add new rating
      updatedRatings.push({
        userId,
        rating,
        createdAt: new Date()
      });

      // Calculate new average
      const sum = updatedRatings.reduce((acc, r) => acc + r.rating, 0);
      const averageRating = updatedRatings.length > 0
        ? parseFloat((sum / updatedRatings.length).toFixed(2))
        : 0;

      await this.collection.doc(gameId).update({
        ratings: updatedRatings,
        averageRating,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return this.findById(gameId);
    } catch (error) {
      console.error('Error adding rating:', error);
      throw error;
    }
  }

  /**
   * Get trending games
   * @param {Number} limit - Number of games to return
   * @returns {Promise<Array>} - Trending games
   */
  async getTrending(limit = 10) {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const snapshot = await this.collection
        .where('isActive', '==', true)
        .where('createdAt', '>=', oneDayAgo)
        .orderBy('createdAt', 'desc')
        .orderBy('stats.plays', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting trending games:', error);
      throw error;
    }
  }

  /**
   * Get recommended games
   * @param {Number} limit - Number of games to return
   * @returns {Promise<Array>} - Recommended games
   */
  async getRecommended(limit = 10) {
    try {
      const snapshot = await this.collection
        .where('isActive', '==', true)
        .orderBy('averageRating', 'desc')
        .orderBy('stats.plays', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting recommended games:', error);
      throw error;
    }
  }

  /**
   * Get games by creator
   * @param {String} creatorId - Creator user ID
   * @returns {Promise<Array>} - Creator's games
   */
  async getByCreator(creatorId) {
    try {
      const snapshot = await this.collection
        .where('creatorId', '==', creatorId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting games by creator:', error);
      throw error;
    }
  }

  /**
   * Get sort field for queries
   * @param {String} sortBy - Sort field name
   * @returns {String} - Firestore field path
   */
  getSortField(sortBy) {
    const sortFields = {
      'popular': 'stats.plays',
      'likes': 'stats.likes',
      'rating': 'averageRating',
      'createdAt': 'createdAt',
      'views': 'stats.views'
    };

    return sortFields[sortBy] || 'createdAt';
  }
}

module.exports = new GameModel();
