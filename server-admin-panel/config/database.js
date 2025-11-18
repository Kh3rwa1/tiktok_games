/**
 * MySQL Database Configuration
 * Uses centralized config for easy deployment
 */

const mysql = require('mysql2/promise');
const { config } = require('./index');

// Create connection pool with config values
const pool = mysql.createPool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,
  waitForConnections: true,
  connectionLimit: config.database.connectionLimit,
  queueLimit: config.database.queueLimit,
  // Additional security options
  multipleStatements: false, // Prevent SQL injection via multiple statements
  charset: 'utf8mb4',
  timezone: 'Z', // Use UTC
});

// Test connection with retry logic
const testConnection = async (retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const connection = await pool.getConnection();
      console.log('Database connected successfully');
      console.log(`  Host: ${config.database.host}:${config.database.port}`);
      console.log(`  Database: ${config.database.name}`);
      connection.release();
      return true;
    } catch (error) {
      console.error(`Database connection attempt ${attempt}/${retries} failed:`, error.message);
      if (attempt < retries) {
        const delay = attempt * 2000;
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('All database connection attempts failed');
        throw error;
      }
    }
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
        last_login TIMESTAMP NULL,
        password_changed_at TIMESTAMP NULL,
        failed_login_attempts INT DEFAULT 0,
        locked_until TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
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
        INDEX idx_active (is_active),
        FULLTEXT idx_search (title, description)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create game_likes table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS game_likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        game_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_like (game_id, user_id),
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create app_settings table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
        description VARCHAR(500),
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_key (setting_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create notifications table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('info', 'warning', 'success', 'error', 'promotion') DEFAULT 'info',
        target_audience ENUM('all', 'users', 'admins') DEFAULT 'all',
        is_active BOOLEAN DEFAULT TRUE,
        priority INT DEFAULT 0,
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP NULL,
        action_url VARCHAR(500),
        image_url VARCHAR(500),
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_active (is_active, start_date, end_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create notification_reads table for tracking read status
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notification_reads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        notification_id INT NOT NULL,
        user_id INT NOT NULL,
        read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_read (notification_id, user_id),
        FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_notifications (user_id, notification_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create push_notifications table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS push_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSON,
        segment VARCHAR(100) DEFAULT 'All',
        onesignal_id VARCHAR(100),
        status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
        error_message TEXT,
        sent_at TIMESTAMP NULL,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create audit_log table for security tracking
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id INT,
        details JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user (user_id),
        INDEX idx_action (action),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create game_comments table for TikTok-style comments
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS game_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        game_id INT NOT NULL,
        user_id INT NOT NULL,
        parent_id INT DEFAULT NULL,
        content TEXT NOT NULL,
        likes INT DEFAULT 0,
        is_pinned BOOLEAN DEFAULT FALSE,
        is_hidden BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES game_comments(id) ON DELETE CASCADE,
        INDEX idx_game_comments (game_id, created_at DESC),
        INDEX idx_user_comments (user_id),
        INDEX idx_parent (parent_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create comment_likes table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS comment_likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        comment_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_comment_like (comment_id, user_id),
        FOREIGN KEY (comment_id) REFERENCES game_comments(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create user_follows table for TikTok-style following
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_follows (
        id INT AUTO_INCREMENT PRIMARY KEY,
        follower_id INT NOT NULL,
        following_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_follow (follower_id, following_id),
        FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_follower (follower_id),
        INDEX idx_following (following_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create game_shares table for tracking shares
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS game_shares (
        id INT AUTO_INCREMENT PRIMARY KEY,
        game_id INT NOT NULL,
        user_id INT,
        platform VARCHAR(50) DEFAULT 'link',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_game_shares (game_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add follower/following counts to users table
    await connection.execute(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS followers_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS following_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS games_count INT DEFAULT 0
    `).catch(() => {
      // Columns may already exist
    });

    // Add comments_count to games table
    await connection.execute(`
      ALTER TABLE games
      ADD COLUMN IF NOT EXISTS comments_count INT DEFAULT 0
    `).catch(() => {
      // Column may already exist
    });

    // Insert default app settings
    await connection.execute(`
      INSERT IGNORE INTO app_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
      ('app_name', '${config.app.name}', 'string', 'Application name displayed to users', true),
      ('app_description', '${config.app.description}', 'string', 'Application description', true),
      ('app_version', '${config.app.version}', 'string', 'Current application version', true),
      ('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', false),
      ('onesignal_app_id', '', 'string', 'OneSignal App ID for push notifications', false),
      ('onesignal_api_key', '', 'string', 'OneSignal REST API Key', false),
      ('onesignal_enabled', 'false', 'boolean', 'Enable OneSignal push notifications', false),
      ('max_upload_size', '100', 'number', 'Maximum game upload size in MB', false),
      ('max_thumbnail_size', '5', 'number', 'Maximum thumbnail size in MB', false),
      ('allowed_game_types', '["zip"]', 'json', 'Allowed game file types', false),
      ('featured_games_count', '10', 'number', 'Number of featured games to display', false),
      ('analytics_enabled', 'true', 'boolean', 'Enable analytics tracking', false),
      ('support_email', '${config.app.supportEmail}', 'string', 'Support contact email', true),
      ('privacy_policy_url', '', 'string', 'Privacy policy URL', true),
      ('terms_url', '', 'string', 'Terms of service URL', true),
      ('registration_enabled', 'true', 'boolean', 'Allow new user registrations', false),
      ('guest_play_enabled', 'true', 'boolean', 'Allow guest gameplay', false),
      ('comments_enabled', 'true', 'boolean', 'Enable game comments', false),
      ('ratings_enabled', 'true', 'boolean', 'Enable game ratings', false)
    `);

    connection.release();
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error.message);
    throw error;
  }
};

// Log audit event
const logAudit = async (userId, action, resourceType, resourceId, details, req) => {
  try {
    await pool.execute(
      `INSERT INTO audit_log (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        action,
        resourceType,
        resourceId,
        JSON.stringify(details),
        req?.ip || null,
        req?.headers?.['user-agent'] || null
      ]
    );
  } catch (error) {
    console.error('Audit log error:', error.message);
  }
};

module.exports = { pool, testConnection, initDatabase, logAudit };
