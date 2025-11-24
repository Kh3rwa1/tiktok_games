/**
 * Setting Model - MySQL
 * Manages application settings and configuration
 */

const { pool } = require('../../config/database');

class Setting {
  // Get all settings
  static async getAll() {
    const [rows] = await pool.execute(
      `SELECT * FROM app_settings ORDER BY setting_key`
    );
    return rows;
  }

  // Get settings as key-value object
  static async getAllAsObject() {
    const [rows] = await pool.execute(
      `SELECT setting_key, setting_value, setting_type FROM app_settings`
    );

    const settings = {};
    rows.forEach(row => {
      let value = row.setting_value;

      // Parse value based on type
      switch (row.setting_type) {
        case 'number':
          value = parseFloat(value) || 0;
          break;
        case 'boolean':
          value = value === 'true';
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch (e) {
            value = null;
          }
          break;
      }

      settings[row.setting_key] = value;
    });

    return settings;
  }

  // Get a single setting by key
  static async get(key) {
    const [rows] = await pool.execute(
      `SELECT * FROM app_settings WHERE setting_key = ?`,
      [key]
    );

    if (rows.length === 0) return null;

    const row = rows[0];
    let value = row.setting_value;

    // Parse value based on type
    switch (row.setting_type) {
      case 'number':
        value = parseFloat(value) || 0;
        break;
      case 'boolean':
        value = value === 'true';
        break;
      case 'json':
        try {
          value = JSON.parse(value);
        } catch (e) {
          value = null;
        }
        break;
    }

    return { ...row, parsed_value: value };
  }

  // Update a setting
  static async update(key, value) {
    // Convert value to string for storage
    let stringValue = value;
    if (typeof value === 'object') {
      stringValue = JSON.stringify(value);
    } else if (typeof value === 'boolean') {
      stringValue = value ? 'true' : 'false';
    } else {
      stringValue = String(value);
    }

    const [result] = await pool.execute(
      `UPDATE app_settings SET setting_value = ? WHERE setting_key = ?`,
      [stringValue, key]
    );

    return result.affectedRows > 0;
  }

  // Update multiple settings at once
  static async updateMultiple(settings) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (const [key, value] of Object.entries(settings)) {
        let stringValue = value;
        if (typeof value === 'object') {
          stringValue = JSON.stringify(value);
        } else if (typeof value === 'boolean') {
          stringValue = value ? 'true' : 'false';
        } else {
          stringValue = String(value);
        }

        await connection.execute(
          `UPDATE app_settings SET setting_value = ? WHERE setting_key = ?`,
          [stringValue, key]
        );
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Create a new setting
  static async create(key, value, type = 'string', description = '') {
    let stringValue = value;
    if (typeof value === 'object') {
      stringValue = JSON.stringify(value);
    } else if (typeof value === 'boolean') {
      stringValue = value ? 'true' : 'false';
    } else {
      stringValue = String(value);
    }

    const [result] = await pool.execute(
      `INSERT INTO app_settings (setting_key, setting_value, setting_type, description)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [key, stringValue, type, description]
    );

    return result.insertId || result.affectedRows > 0;
  }

  // Delete a setting
  static async delete(key) {
    const [result] = await pool.execute(
      `DELETE FROM app_settings WHERE setting_key = ?`,
      [key]
    );

    return result.affectedRows > 0;
  }

  // Get OneSignal configuration
  static async getOneSignalConfig() {
    const [rows] = await pool.execute(
      `SELECT setting_key, setting_value FROM app_settings
       WHERE setting_key IN ('onesignal_app_id', 'onesignal_api_key', 'onesignal_enabled')`
    );

    const config = {};
    rows.forEach(row => {
      if (row.setting_key === 'onesignal_enabled') {
        config[row.setting_key] = row.setting_value === 'true';
      } else {
        config[row.setting_key] = row.setting_value;
      }
    });

    return config;
  }
}

module.exports = Setting;
