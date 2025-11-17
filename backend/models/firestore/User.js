const { admin, db } = require('../../config/firebase');

/**
 * User Collection Helper for Firestore
 */
class UserModel {
  constructor() {
    this.collection = db.collection('users');
  }

  /**
   * Create a new user in Firestore using Firebase Auth
   * @param {Object} userData - User data
   * @returns {Promise<Object>} - Created user
   */
  async create(userData) {
    try {
      const { email, password, username, avatar, bio } = userData;

      // Create user in Firebase Auth
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: username,
        photoURL: avatar || 'https://via.placeholder.com/150'
      });

      // Create user document in Firestore
      const userDoc = {
        uid: userRecord.uid,
        username,
        email: email.toLowerCase(),
        avatar: avatar || 'https://via.placeholder.com/150',
        bio: bio || '',
        favoriteGames: [],
        playHistory: [],
        stats: {
          totalGamesPlayed: 0,
          totalPlayTime: 0
        },
        isActive: true,
        role: 'user',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await this.collection.doc(userRecord.uid).set(userDoc);

      return {
        id: userRecord.uid,
        ...userDoc
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Find user by UID
   * @param {String} uid - User ID
   * @returns {Promise<Object|null>} - User data or null
   */
  async findById(uid) {
    try {
      const doc = await this.collection.doc(uid).get();
      if (!doc.exists) {
        return null;
      }
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Find user by email
   * @param {String} email - User email
   * @returns {Promise<Object|null>} - User data or null
   */
  async findByEmail(email) {
    try {
      const snapshot = await this.collection
        .where('email', '==', email.toLowerCase())
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find user by username
   * @param {String} username - Username
   * @returns {Promise<Object|null>} - User data or null
   */
  async findByUsername(username) {
    try {
      const snapshot = await this.collection
        .where('username', '==', username)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {String} uid - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated user
   */
  async update(uid, updates) {
    try {
      const updateData = {
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await this.collection.doc(uid).update(updateData);

      // Also update Firebase Auth profile if needed
      if (updates.username || updates.avatar) {
        const authUpdates = {};
        if (updates.username) authUpdates.displayName = updates.username;
        if (updates.avatar) authUpdates.photoURL = updates.avatar;
        await admin.auth().updateUser(uid, authUpdates);
      }

      return this.findById(uid);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user
   * @param {String} uid - User ID
   * @returns {Promise<Boolean>} - Success status
   */
  async delete(uid) {
    try {
      // Delete from Firestore
      await this.collection.doc(uid).delete();
      // Delete from Firebase Auth
      await admin.auth().deleteUser(uid);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Add game to favorites
   * @param {String} uid - User ID
   * @param {String} gameId - Game ID
   * @returns {Promise<Boolean>} - Success status
   */
  async addFavorite(uid, gameId) {
    try {
      await this.collection.doc(uid).update({
        favoriteGames: admin.firestore.FieldValue.arrayUnion(gameId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error adding favorite:', error);
      throw error;
    }
  }

  /**
   * Remove game from favorites
   * @param {String} uid - User ID
   * @param {String} gameId - Game ID
   * @returns {Promise<Boolean>} - Success status
   */
  async removeFavorite(uid, gameId) {
    try {
      await this.collection.doc(uid).update({
        favoriteGames: admin.firestore.FieldValue.arrayRemove(gameId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error removing favorite:', error);
      throw error;
    }
  }

  /**
   * Add play history entry
   * @param {String} uid - User ID
   * @param {Object} playData - Play history data
   * @returns {Promise<Boolean>} - Success status
   */
  async addPlayHistory(uid, playData) {
    try {
      const user = await this.findById(uid);
      if (!user) return false;

      const playEntry = {
        gameId: playData.gameId,
        playedAt: admin.firestore.FieldValue.serverTimestamp(),
        duration: playData.duration || 0
      };

      await this.collection.doc(uid).update({
        playHistory: admin.firestore.FieldValue.arrayUnion(playEntry),
        'stats.totalGamesPlayed': admin.firestore.FieldValue.increment(1),
        'stats.totalPlayTime': admin.firestore.FieldValue.increment(playData.duration || 0),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error adding play history:', error);
      throw error;
    }
  }

  /**
   * Update user password
   * @param {String} uid - User ID
   * @param {String} newPassword - New password
   * @returns {Promise<Boolean>} - Success status
   */
  async updatePassword(uid, newPassword) {
    try {
      await admin.auth().updateUser(uid, {
        password: newPassword
      });
      return true;
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  /**
   * Verify user's Firebase ID token
   * @param {String} idToken - Firebase ID token
   * @returns {Promise<Object>} - Decoded token
   */
  async verifyToken(idToken) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      console.error('Error verifying token:', error);
      throw error;
    }
  }

  /**
   * Get public profile
   * @param {Object} user - User object
   * @returns {Object} - Public profile
   */
  toPublicProfile(user) {
    return {
      id: user.id || user.uid,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      stats: user.stats,
      createdAt: user.createdAt
    };
  }
}

module.exports = new UserModel();
