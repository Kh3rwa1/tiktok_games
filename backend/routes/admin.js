const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { db } = require('../config/firebase');

/**
 * Admin Routes
 * All routes require admin authentication
 */

// Get platform statistics
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const usersRef = db.collection('users');
    const gamesRef = db.collection('games');

    // Get counts
    const [usersSnapshot, gamesSnapshot] = await Promise.all([
      usersRef.get(),
      gamesRef.get()
    ]);

    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const games = gamesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Calculate stats
    const totalUsers = users.length;
    const totalGames = games.length;
    const activeUsers = users.filter(u => u.isActive !== false).length;
    const adminUsers = users.filter(u => u.role === 'admin').length;
    const featuredGames = games.filter(g => g.isFeatured).length;
    const activeGames = games.filter(g => g.isActive !== false).length;

    // Calculate totals
    const totalPlays = games.reduce((sum, game) => sum + (game.stats?.plays || 0), 0);
    const totalViews = games.reduce((sum, game) => sum + (game.stats?.views || 0), 0);
    const totalLikes = games.reduce((sum, game) => sum + (game.stats?.likes || 0), 0);

    // Calculate average rating
    const gamesWithRatings = games.filter(g => g.averageRating > 0);
    const avgRating = gamesWithRatings.length > 0
      ? gamesWithRatings.reduce((sum, g) => sum + g.averageRating, 0) / gamesWithRatings.length
      : 0;

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        admins: adminUsers,
        inactive: totalUsers - activeUsers
      },
      games: {
        total: totalGames,
        active: activeGames,
        featured: featuredGames,
        inactive: totalGames - activeGames
      },
      engagement: {
        totalPlays,
        totalViews,
        totalLikes,
        avgRating: parseFloat(avgRating.toFixed(2)),
        playRate: totalViews > 0 ? parseFloat(((totalPlays / totalViews) * 100).toFixed(2)) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// Get user list with pagination
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role = '' } = req.query;
    const usersRef = db.collection('users');

    let query = usersRef;

    // Filter by role
    if (role && role !== 'all') {
      query = query.where('role', '==', role);
    }

    const snapshot = await query.get();
    let users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter by search (client-side)
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(user =>
        user.username?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedUsers = users.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.length,
        totalPages: Math.ceil(users.length / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

// Update user role
router.put('/users/:id/role', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be "user" or "admin"'
      });
    }

    // Don't allow users to remove their own admin rights
    if (id === req.user.uid && role === 'user') {
      return res.status(400).json({
        success: false,
        message: 'You cannot remove your own admin rights'
      });
    }

    await db.collection('users').doc(id).update({
      role,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: `User role updated to ${role}`
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user role',
      error: error.message
    });
  }
});

// Toggle user active status
router.put('/users/:id/toggle-active', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Don't allow users to deactivate themselves
    if (id === req.user.uid) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentStatus = userDoc.data().isActive !== false;
    const newStatus = !currentStatus;

    await db.collection('users').doc(id).update({
      isActive: newStatus,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: `User ${newStatus ? 'activated' : 'deactivated'}`,
      isActive: newStatus
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user status',
      error: error.message
    });
  }
});

// Delete user (admin only)
router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Don't allow users to delete themselves
    if (id === req.user.uid) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await db.collection('users').doc(id).delete();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
});

// Get recent activity
router.get('/activity', protect, adminOnly, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    // Get recent games
    const gamesSnapshot = await db.collection('games')
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .get();

    const recentGames = gamesSnapshot.docs.map(doc => ({
      id: doc.id,
      type: 'game_created',
      ...doc.data()
    }));

    // Get recent users
    const usersSnapshot = await db.collection('users')
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .get();

    const recentUsers = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      type: 'user_registered',
      ...doc.data()
    }));

    // Combine and sort by date
    const activity = [...recentGames, ...recentUsers]
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return dateB - dateA;
      })
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: activity,
      count: activity.length
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity',
      error: error.message
    });
  }
});

// Bulk actions on games
router.post('/games/bulk-action', protect, adminOnly, async (req, res) => {
  try {
    const { action, gameIds } = req.body;

    if (!action || !gameIds || !Array.isArray(gameIds)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request. Provide action and gameIds array'
      });
    }

    const batch = db.batch();

    switch (action) {
      case 'delete':
        gameIds.forEach(id => {
          batch.delete(db.collection('games').doc(id));
        });
        break;

      case 'activate':
        gameIds.forEach(id => {
          batch.update(db.collection('games').doc(id), {
            isActive: true,
            updatedAt: new Date()
          });
        });
        break;

      case 'deactivate':
        gameIds.forEach(id => {
          batch.update(db.collection('games').doc(id), {
            isActive: false,
            updatedAt: new Date()
          });
        });
        break;

      case 'feature':
        gameIds.forEach(id => {
          batch.update(db.collection('games').doc(id), {
            isFeatured: true,
            updatedAt: new Date()
          });
        });
        break;

      case 'unfeature':
        gameIds.forEach(id => {
          batch.update(db.collection('games').doc(id), {
            isFeatured: false,
            updatedAt: new Date()
          });
        });
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    await batch.commit();

    res.json({
      success: true,
      message: `Bulk action "${action}" completed successfully`,
      affected: gameIds.length
    });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing bulk action',
      error: error.message
    });
  }
});

module.exports = router;
