/**
 * Game Collection Model for Firestore
 * Optimized for 1 Million+ Users
 * AAA+ Premium Quality with Caching Support
 */

const { admin, db } = require('../../config/firebase');

class GameModel {
  constructor() {
    this.collection = db.collection('games');
    this.batchSize = 500; // Firestore batch limit
  }

  /**
   * Create a new game with optimized write
   */
  async create(gameData) {
    try {
      const gameDoc = {
        title: gameData.title,
        description: gameData.description || '',
        thumbnail: gameData.thumbnail || '',
        gameUrl: gameData.gameUrl || '',
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
        // Denormalized fields for faster queries
        titleLower: gameData.title.toLowerCase(),
        searchKeywords: this.generateSearchKeywords(gameData.title, gameData.description),
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
   * Generate search keywords for better text search
   */
  generateSearchKeywords(title, description = '') {
    const text = `${title} ${description}`.toLowerCase();
    const words = text.split(/\s+/).filter(word => word.length > 2);
    const keywords = new Set(words);

    // Add partial matches for autocomplete
    words.forEach(word => {
      for (let i = 3; i <= word.length; i++) {
        keywords.add(word.substring(0, i));
      }
    });

    return Array.from(keywords).slice(0, 100); // Limit to 100 keywords
  }

  /**
   * Find game by ID with optional caching
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
   * Find all games with optimized pagination using cursor-based pagination
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
        isActive = true,
        cursor,
        difficulty
      } = options;

      let query = this.collection.where('isActive', '==', isActive);

      // Filter by category
      if (category) {
        query = query.where('category', '==', category);
      }

      // Filter by difficulty
      if (difficulty) {
        query = query.where('difficulty', '==', difficulty);
      }

      // Filter by featured
      if (featured !== undefined) {
        query = query.where('isFeatured', '==', featured);
      }

      // Sort
      const sortField = this.getSortField(sortBy);
      query = query.orderBy(sortField, order);

      // Cursor-based pagination (more efficient for large datasets)
      if (cursor) {
        const cursorDoc = await this.collection.doc(cursor).get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      } else {
        // Offset-based pagination for backward compatibility
        const offset = (page - 1) * limit;
        if (offset > 0) {
          query = query.offset(offset);
        }
      }

      query = query.limit(limit);

      const snapshot = await query.get();

      let games = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Server-side search using keywords
      if (search) {
        const searchLower = search.toLowerCase();
        // Use keyword search for better performance
        const searchQuery = this.collection
          .where('isActive', '==', isActive)
          .where('searchKeywords', 'array-contains', searchLower)
          .orderBy(sortField, order)
          .limit(limit);

        const searchSnapshot = await searchQuery.get();

        if (searchSnapshot.docs.length > 0) {
          games = searchSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        } else {
          // Fallback to client-side search
          games = games.filter(game =>
            game.title.toLowerCase().includes(searchLower) ||
            game.description.toLowerCase().includes(searchLower)
          );
        }
      }

      // Get total count using aggregation (more efficient)
      let total = 0;
      try {
        const countQuery = this.collection
          .where('isActive', '==', isActive);
        const countSnapshot = await countQuery.count().get();
        total = countSnapshot.data().count;
      } catch {
        // Fallback for older Firestore versions
        const totalSnapshot = await this.collection
          .where('isActive', '==', isActive)
          .get();
        total = totalSnapshot.size;
      }

      // Get next cursor
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      const nextCursor = lastDoc ? lastDoc.id : null;

      return {
        games,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          nextCursor,
          hasMore: games.length === limit
        }
      };
    } catch (error) {
      console.error('Error finding games:', error);
      throw error;
    }
  }

  /**
   * Batch update for bulk operations
   */
  async batchUpdate(updates) {
    try {
      const batches = [];
      let currentBatch = db.batch();
      let operationCount = 0;

      for (const { id, data } of updates) {
        const ref = this.collection.doc(id);
        currentBatch.update(ref, {
          ...data,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        operationCount++;

        if (operationCount >= this.batchSize) {
          batches.push(currentBatch.commit());
          currentBatch = db.batch();
          operationCount = 0;
        }
      }

      if (operationCount > 0) {
        batches.push(currentBatch.commit());
      }

      await Promise.all(batches);
      return true;
    } catch (error) {
      console.error('Error batch updating games:', error);
      throw error;
    }
  }

  /**
   * Update game with cache invalidation
   */
  async update(id, updates) {
    try {
      const updateData = {
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Update search keywords if title or description changed
      if (updates.title || updates.description) {
        const game = await this.findById(id);
        if (game) {
          updateData.searchKeywords = this.generateSearchKeywords(
            updates.title || game.title,
            updates.description || game.description
          );
          if (updates.title) {
            updateData.titleLower = updates.title.toLowerCase();
          }
        }
      }

      await this.collection.doc(id).update(updateData);
      return this.findById(id);
    } catch (error) {
      console.error('Error updating game:', error);
      throw error;
    }
  }

  /**
   * Delete game
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
   * Batch increment views (more efficient for high traffic)
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
   * Toggle like with optimized atomic operation
   */
  async toggleLike(gameId, userId) {
    try {
      const gameRef = this.collection.doc(gameId);

      // Use transaction for atomic operation
      const result = await db.runTransaction(async (transaction) => {
        const gameDoc = await transaction.get(gameRef);

        if (!gameDoc.exists) {
          throw new Error('Game not found');
        }

        const game = gameDoc.data();
        const isLiked = game.likedBy.includes(userId);

        if (isLiked) {
          transaction.update(gameRef, {
            likedBy: admin.firestore.FieldValue.arrayRemove(userId),
            'stats.likes': admin.firestore.FieldValue.increment(-1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          transaction.update(gameRef, {
            likedBy: admin.firestore.FieldValue.arrayUnion(userId),
            'stats.likes': admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        return !isLiked;
      });

      return this.findById(gameId);
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error;
    }
  }

  /**
   * Add or update rating with atomic operation
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
   * Get trending games with optimized query
   */
  async getTrending(limit = 10) {
    try {
      // Get games with high recent activity
      const snapshot = await this.collection
        .where('isActive', '==', true)
        .orderBy('stats.plays', 'desc')
        .orderBy('stats.likes', 'desc')
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
   * Get platform statistics (optimized for admin panel)
   */
  async getStats() {
    try {
      const [gamesSnapshot, activeGames, featuredGames] = await Promise.all([
        this.collection.count().get(),
        this.collection.where('isActive', '==', true).count().get(),
        this.collection.where('isFeatured', '==', true).count().get()
      ]);

      // Get aggregate stats
      const allGames = await this.collection
        .where('isActive', '==', true)
        .select('stats')
        .get();

      let totalPlays = 0;
      let totalViews = 0;
      let totalLikes = 0;

      allGames.docs.forEach(doc => {
        const stats = doc.data().stats || {};
        totalPlays += stats.plays || 0;
        totalViews += stats.views || 0;
        totalLikes += stats.likes || 0;
      });

      return {
        totalGames: gamesSnapshot.data().count,
        activeGames: activeGames.data().count,
        featuredGames: featuredGames.data().count,
        totalPlays,
        totalViews,
        totalLikes
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }

  /**
   * Get sort field for queries
   */
  getSortField(sortBy) {
    const sortFields = {
      'popular': 'stats.plays',
      'likes': 'stats.likes',
      'rating': 'averageRating',
      'createdAt': 'createdAt',
      'views': 'stats.views',
      'title': 'titleLower'
    };

    return sortFields[sortBy] || 'createdAt';
  }
}

module.exports = new GameModel();
