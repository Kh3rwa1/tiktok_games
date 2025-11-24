/**
 * Notification Model - MySQL
 * Manages in-app notifications
 */

const { pool } = require('../../config/database');

class Notification {
  // Create a new notification
  static async create(data) {
    const {
      title,
      message,
      type = 'info',
      target_audience = 'all',
      priority = 0,
      start_date = new Date(),
      end_date = null,
      action_url = null,
      image_url = null,
      created_by = null
    } = data;

    const [result] = await pool.execute(
      `INSERT INTO notifications
       (title, message, type, target_audience, priority, start_date, end_date, action_url, image_url, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, message, type, target_audience, priority, start_date, end_date, action_url, image_url, created_by]
    );

    return Notification.findById(result.insertId);
  }

  // Find notification by ID
  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT n.*, u.username as creator_name
       FROM notifications n
       LEFT JOIN users u ON n.created_by = u.id
       WHERE n.id = ?`,
      [id]
    );

    return rows[0] || null;
  }

  // Get all notifications (admin view)
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 20,
      type = null,
      isActive = null
    } = options;

    const offset = (page - 1) * limit;
    let query = `
      SELECT n.*, u.username as creator_name
      FROM notifications n
      LEFT JOIN users u ON n.created_by = u.id
      WHERE 1=1
    `;
    let countQuery = `SELECT COUNT(*) as total FROM notifications WHERE 1=1`;
    const values = [];
    const countValues = [];

    if (type) {
      query += ` AND n.type = ?`;
      countQuery += ` AND type = ?`;
      values.push(type);
      countValues.push(type);
    }

    if (isActive !== null) {
      query += ` AND n.is_active = ?`;
      countQuery += ` AND is_active = ?`;
      values.push(isActive);
      countValues.push(isActive);
    }

    query += ` ORDER BY n.priority DESC, n.created_at DESC LIMIT ? OFFSET ?`;
    values.push(parseInt(limit), offset);

    const [notifications] = await pool.execute(query, values);
    const [countResult] = await pool.execute(countQuery, countValues);

    return {
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    };
  }

  // Get active notifications for users
  static async getActiveForUser(userId, role = 'user') {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const [notifications] = await pool.execute(
      `SELECT n.*,
        CASE WHEN nr.id IS NOT NULL THEN TRUE ELSE FALSE END as is_read
       FROM notifications n
       LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.user_id = ?
       WHERE n.is_active = TRUE
       AND n.start_date <= ?
       AND (n.end_date IS NULL OR n.end_date >= ?)
       AND (n.target_audience = 'all'
         OR (n.target_audience = 'users' AND ? = 'user')
         OR (n.target_audience = 'admins' AND ? = 'admin'))
       ORDER BY n.priority DESC, n.created_at DESC`,
      [userId, now, now, role, role]
    );

    return notifications;
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    await pool.execute(
      `INSERT IGNORE INTO notification_reads (notification_id, user_id) VALUES (?, ?)`,
      [notificationId, userId]
    );
    return true;
  }

  // Update notification
  static async update(id, data) {
    const allowedFields = [
      'title', 'message', 'type', 'target_audience',
      'priority', 'start_date', 'end_date', 'action_url',
      'image_url', 'is_active'
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(data[field]);
      }
    }

    if (updates.length === 0) return false;

    values.push(id);

    const [result] = await pool.execute(
      `UPDATE notifications SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  }

  // Delete notification
  static async delete(id) {
    const [result] = await pool.execute(
      `DELETE FROM notifications WHERE id = ?`,
      [id]
    );

    return result.affectedRows > 0;
  }

  // Toggle notification active status
  static async toggleActive(id) {
    const [notification] = await pool.execute(
      `SELECT is_active FROM notifications WHERE id = ?`,
      [id]
    );

    if (notification.length === 0) return null;

    const newStatus = !notification[0].is_active;

    await pool.execute(
      `UPDATE notifications SET is_active = ? WHERE id = ?`,
      [newStatus, id]
    );

    return newStatus;
  }

  // Get notification statistics
  static async getStats() {
    const [stats] = await pool.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN type = 'info' THEN 1 ELSE 0 END) as info,
        SUM(CASE WHEN type = 'warning' THEN 1 ELSE 0 END) as warning,
        SUM(CASE WHEN type = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN type = 'error' THEN 1 ELSE 0 END) as error,
        SUM(CASE WHEN type = 'promotion' THEN 1 ELSE 0 END) as promotion
      FROM notifications
    `);

    return stats[0];
  }

  // Send push notification via OneSignal
  static async sendPushNotification(notification) {
    const Setting = require('./Setting');
    const config = await Setting.getOneSignalConfig();

    if (!config.onesignal_enabled || !config.onesignal_app_id || !config.onesignal_api_key) {
      return { success: false, message: 'OneSignal not configured' };
    }

    try {
      const fetch = require('node-fetch');

      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${config.onesignal_api_key}`
        },
        body: JSON.stringify({
          app_id: config.onesignal_app_id,
          included_segments: ['All'],
          headings: { en: notification.title },
          contents: { en: notification.message },
          url: notification.action_url || undefined,
          big_picture: notification.image_url || undefined
        })
      });

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = Notification;
