/**
 * Notification Management Routes
 * Powerful API for managing all notification channels from admin panel
 */

const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const { verifyToken, isAdmin } = require('../middleware/auth');

/**
 * GET /api/notifications/config
 * Get current notification configuration
 */
router.get('/config', verifyToken, isAdmin, async (req, res) => {
  try {
    const config = notificationService.getConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error getting notification config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification configuration'
    });
  }
});

/**
 * PUT /api/notifications/config
 * Update notification configuration (master toggle)
 */
router.put('/config', verifyToken, isAdmin, async (req, res) => {
  try {
    const newConfig = req.body;
    const updatedConfig = notificationService.updateConfig(newConfig);

    res.json({
      success: true,
      data: updatedConfig,
      message: 'Notification configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating notification config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification configuration'
    });
  }
});

/**
 * POST /api/notifications/toggle
 * Quick toggle for individual notification channels
 */
router.post('/toggle', verifyToken, isAdmin, async (req, res) => {
  try {
    const { channel, enabled } = req.body;
    const config = notificationService.getConfig();

    // Map channel names to config paths
    const toggleMap = {
      'master': () => { config.enabled = enabled; },
      'aws': () => { config.aws.enabled = enabled; },
      'sns': () => { config.aws.sns.enabled = enabled; },
      'ses': () => { config.aws.ses.enabled = enabled; },
      'firebase': () => { config.firebase.enabled = enabled; },
      'fcm': () => { config.firebase.fcm.enabled = enabled; },
      'email': () => { config.preferences.emailNotifications = enabled; },
      'push': () => { config.preferences.pushNotifications = enabled; },
      'sms': () => { config.preferences.smsNotifications = enabled; },
      'newUser': () => { config.preferences.newUserAlerts = enabled; },
      'gameUpload': () => { config.preferences.gameUploadAlerts = enabled; },
      'system': () => { config.preferences.systemAlerts = enabled; },
      'marketing': () => { config.preferences.marketingNotifications = enabled; },
    };

    if (!toggleMap[channel]) {
      return res.status(400).json({
        success: false,
        error: `Invalid channel: ${channel}`
      });
    }

    toggleMap[channel]();
    notificationService.updateConfig(config);

    res.json({
      success: true,
      message: `${channel} notifications ${enabled ? 'enabled' : 'disabled'}`,
      data: notificationService.getConfig()
    });
  } catch (error) {
    console.error('Error toggling notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle notification'
    });
  }
});

/**
 * POST /api/notifications/send
 * Send notification through all enabled channels
 */
router.post('/send', verifyToken, isAdmin, async (req, res) => {
  try {
    const { title, body, data, targets, type } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: 'Title and body are required'
      });
    }

    const result = await notificationService.sendNotification({
      title,
      body,
      data: data || {},
      targets: targets || {},
      type: type || 'general'
    });

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send notification'
    });
  }
});

/**
 * POST /api/notifications/send-bulk
 * Send bulk notification to multiple users
 */
router.post('/send-bulk', verifyToken, isAdmin, async (req, res) => {
  try {
    const { title, body, data, userIds, type } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: 'Title and body are required'
      });
    }

    const result = await notificationService.sendBulkNotification({
      title,
      body,
      data: data || {},
      userIds: userIds || [],
      type: type || 'general'
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error sending bulk notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send bulk notification'
    });
  }
});

/**
 * POST /api/notifications/send-email
 * Send email via AWS SES
 */
router.post('/send-email', verifyToken, isAdmin, async (req, res) => {
  try {
    const { recipients, subject, body } = req.body;

    if (!recipients || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'Recipients, subject, and body are required'
      });
    }

    const result = await notificationService.sendEmail(recipients, subject, body);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email'
    });
  }
});

/**
 * POST /api/notifications/subscribe
 * Subscribe users to FCM topic
 */
router.post('/subscribe', verifyToken, isAdmin, async (req, res) => {
  try {
    const { tokens, topic } = req.body;

    if (!tokens || !topic) {
      return res.status(400).json({
        success: false,
        error: 'Tokens and topic are required'
      });
    }

    const result = await notificationService.subscribeToTopic(tokens, topic);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('Error subscribing to topic:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to subscribe to topic'
    });
  }
});

/**
 * POST /api/notifications/unsubscribe
 * Unsubscribe users from FCM topic
 */
router.post('/unsubscribe', verifyToken, isAdmin, async (req, res) => {
  try {
    const { tokens, topic } = req.body;

    if (!tokens || !topic) {
      return res.status(400).json({
        success: false,
        error: 'Tokens and topic are required'
      });
    }

    const result = await notificationService.unsubscribeFromTopic(tokens, topic);

    res.json({
      success: result.success,
      data: result
    });
  } catch (error) {
    console.error('Error unsubscribing from topic:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unsubscribe from topic'
    });
  }
});

/**
 * POST /api/notifications/test
 * Test notification services
 */
router.post('/test', verifyToken, isAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    const results = await notificationService.testNotifications(email);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error testing notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test notifications'
    });
  }
});

/**
 * GET /api/notifications/status
 * Get notification service status
 */
router.get('/status', verifyToken, isAdmin, async (req, res) => {
  try {
    const config = notificationService.getConfig();

    res.json({
      success: true,
      data: {
        initialized: config.status.initialized,
        services: {
          aws: {
            available: config.status.awsAvailable,
            sns: config.aws.sns.enabled,
            ses: config.aws.ses.enabled,
          },
          firebase: {
            available: config.status.firebaseAvailable,
            fcm: config.firebase.fcm.enabled,
          }
        },
        preferences: config.preferences,
        masterEnabled: config.enabled
      }
    });
  } catch (error) {
    console.error('Error getting notification status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification status'
    });
  }
});

module.exports = router;
