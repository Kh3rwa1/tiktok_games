/**
 * MySQL Database Configuration for cPanel/phpMyAdmin
 */

const mysql = require('mysql2/promise');

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tiktok_games',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ MySQL connection error:', error.message);
  }
};

// Initialize database tables
const initDatabase = async () => {
  try {
    const connection = await pool.getConnection();

    // Create users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(30) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar VARCHAR(500) DEFAULT 'https://via.placeholder.com/150',
        bio VARCHAR(200) DEFAULT '',
        total_games_played INT DEFAULT 0,
        total_play_time INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        role ENUM('user', 'admin') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_email (email)
      )
    `);

    // Create games table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS games (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        description VARCHAR(500) NOT NULL,
        thumbnail VARCHAR(500) NOT NULL,
        game_url VARCHAR(500) NOT NULL,
        category ENUM('action', 'puzzle', 'adventure', 'strategy', 'casual', 'arcade', 'racing', 'sports', 'other') DEFAULT 'casual',
        tags JSON,
        difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
        creator_id INT,
        views INT DEFAULT 0,
        plays INT DEFAULT 0,
        likes INT DEFAULT 0,
        shares INT DEFAULT 0,
        average_play_time INT DEFAULT 0,
        average_rating DECIMAL(3,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        is_featured BOOLEAN DEFAULT FALSE,
        version VARCHAR(20) DEFAULT '1.0.0',
        file_size INT DEFAULT 0,
        controls VARCHAR(300),
        requirements VARCHAR(200),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_category (category),
        INDEX idx_plays (plays DESC),
        INDEX idx_likes (likes DESC),
        INDEX idx_rating (average_rating DESC),
        INDEX idx_featured (is_featured, plays DESC),
        FULLTEXT idx_search (title, description)
      )
    `);

    // Create game_likes table (for tracking who liked what)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS game_likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        game_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_like (game_id, user_id),
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create game_ratings table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS game_ratings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        game_id INT NOT NULL,
        user_id INT NOT NULL,
        rating TINYINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_rating (game_id, user_id),
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create user_favorites table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        game_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_favorite (user_id, game_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
      )
    `);

    // Create play_history table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS play_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        game_id INT NOT NULL,
        duration INT DEFAULT 0,
        played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        INDEX idx_user_history (user_id, played_at DESC)
      )
    `);

    // Create app_settings table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_key (setting_key)
      )
    `);

    // Create notifications table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('info', 'success', 'warning', 'error', 'promo') DEFAULT 'info',
        target_audience ENUM('all', 'users', 'admins') DEFAULT 'all',
        is_active BOOLEAN DEFAULT TRUE,
        start_date TIMESTAMP NULL,
        end_date TIMESTAMP NULL,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_active (is_active, start_date, end_date)
      )
    `);

    // Create push_notifications table for OneSignal
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS push_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSON,
        segment VARCHAR(100) DEFAULT 'All',
        onesignal_id VARCHAR(100),
        status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
        sent_at TIMESTAMP NULL,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Insert default app settings if not exist
    await connection.execute(`
      INSERT IGNORE INTO app_settings (setting_key, setting_value, setting_type, description) VALUES
      ('app_name', 'TikTok Games', 'string', 'Application name displayed to users'),
      ('app_description', 'Play amazing HTML5 games', 'string', 'Application description'),
      ('app_version', '1.0.0', 'string', 'Current application version'),
      ('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode'),
      ('onesignal_app_id', '', 'string', 'OneSignal App ID for push notifications'),
      ('onesignal_api_key', '', 'string', 'OneSignal REST API Key'),
      ('max_upload_size', '50', 'number', 'Maximum upload size in MB'),
      ('allowed_game_formats', '["zip"]', 'json', 'Allowed game upload formats'),
      ('contact_email', '', 'string', 'Contact email address'),
      ('privacy_policy_url', '', 'string', 'Privacy policy URL'),
      ('terms_url', '', 'string', 'Terms of service URL')
    `);

    connection.release();
    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  }
};

module.exports = { pool, testConnection, initDatabase };
