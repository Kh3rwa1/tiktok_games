const express = require('express');
const router = express.Router();
const {
  getGames,
  getGame,
  createGame,
  updateGame,
  deleteGame,
  toggleLike,
  rateGame,
  recordPlay,
  getTrending,
  getRecommended
} = require('../controllers/gameController');
const { protect, optionalAuth } = require('../middleware/auth');
const Setting = require('../models/mysql/Setting');
const Notification = require('../models/mysql/Notification');

// Public routes
router.get('/', optionalAuth, getGames);
router.get('/trending', getTrending);
router.get('/recommended', getRecommended);
router.get('/:id', optionalAuth, getGame);

// Protected routes
router.post('/', protect, createGame);
router.put('/:id', protect, updateGame);
router.delete('/:id', protect, deleteGame);
router.post('/:id/like', protect, toggleLike);
router.post('/:id/rate', protect, rateGame);
router.post('/:id/play', protect, recordPlay);

// Public settings endpoint for mobile app
router.get('/app/settings', async (req, res) => {
  try {
    const settings = await Setting.getAllAsObject();
    // Only return public settings
    const publicSettings = {
      app_name: settings.app_name,
      app_description: settings.app_description,
      app_version: settings.app_version,
      maintenance_mode: settings.maintenance_mode,
      support_email: settings.support_email,
      privacy_policy_url: settings.privacy_policy_url,
      terms_url: settings.terms_url,
      onesignal_app_id: settings.onesignal_app_id,
      onesignal_enabled: settings.onesignal_enabled
    };
    res.json({ success: true, data: publicSettings });
  } catch (error) {
    console.error('Error fetching public settings:', error);
    res.status(500).json({ message: 'Error fetching settings' });
  }
});

// Public notifications endpoint for mobile app
router.get('/app/notifications', protect, async (req, res) => {
  try {
    const notifications = await Notification.getActiveForUser(
      req.user.id,
      req.user.role
    );
    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Mark notification as read
router.post('/app/notifications/:id/read', protect, async (req, res) => {
  try {
    await Notification.markAsRead(req.params.id, req.user.id);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error marking notification as read' });
  }
});

module.exports = router;
