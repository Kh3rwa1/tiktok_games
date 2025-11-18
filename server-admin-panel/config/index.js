/**
 * Configuration Loader with Validation
 * Centralizes all environment variables and provides defaults
 */

const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

/**
 * Validate required environment variables
 */
const validateConfig = () => {
  const required = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(key => console.error(`  - ${key}`));
    console.error('\nPlease check your .env file');
    process.exit(1);
  }

  // Warn about insecure JWT secret
  if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
    console.warn('\n⚠️  WARNING: Using default JWT_SECRET. Please change this in production!\n');
  }

  // Warn about maintenance mode
  if (process.env.MAINTENANCE_MODE === 'true') {
    console.warn('\n⚠️  WARNING: Server is running in MAINTENANCE MODE\n');
  }
};

/**
 * Parse boolean environment variable
 */
const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return value === 'true' || value === '1';
};

/**
 * Parse integer environment variable
 */
const parseInt = (value, defaultValue) => {
  const parsed = Number.parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Parse comma-separated list
 */
const parseList = (value, defaultValue = []) => {
  if (!value) return defaultValue;
  return value.split(',').map(item => item.trim()).filter(Boolean);
};

/**
 * Configuration object
 */
const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 5000),
  domain: process.env.DOMAIN || `http://localhost:${process.env.PORT || 5000}`,
  adminPanelUrl: process.env.ADMIN_PANEL_URL || `http://localhost:${process.env.PORT || 5000}`,

  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10),
    queueLimit: parseInt(process.env.DB_QUEUE_LIMIT, 0),
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '90d',
  },

  // Session & Cookies
  session: {
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    cookie: {
      secure: parseBoolean(process.env.COOKIE_SECURE, process.env.NODE_ENV === 'production'),
      httpOnly: parseBoolean(process.env.COOKIE_HTTPONLY, true),
      sameSite: process.env.COOKIE_SAMESITE || 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 1000),
    auth: {
      windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
      maxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 50),
    },
  },

  // CORS
  cors: {
    allowedOrigins: parseList(process.env.ALLOWED_ORIGINS, ['*']),
  },

  // Admin
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'changeme123!',
  },

  // File Uploads
  uploads: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 100 * 1024 * 1024), // 100MB
    maxGameZipSize: parseInt(process.env.MAX_GAME_ZIP_SIZE, 100 * 1024 * 1024),
    maxThumbnailSize: parseInt(process.env.MAX_THUMBNAIL_SIZE, 5 * 1024 * 1024),
    maxAvatarSize: parseInt(process.env.MAX_AVATAR_SIZE, 2 * 1024 * 1024),
    allowedGameTypes: parseList(process.env.ALLOWED_GAME_TYPES, ['.zip']),
    allowedImageTypes: parseList(process.env.ALLOWED_IMAGE_TYPES, ['.jpg', '.jpeg', '.png', '.gif', '.webp']),
    uploadDir: path.resolve(process.env.UPLOAD_DIR || './public/uploads'),
    gamesDir: path.resolve(process.env.GAMES_DIR || './public/games'),
    thumbnailsDir: path.resolve(process.env.THUMBNAILS_DIR || './public/thumbnails'),
  },

  // OneSignal
  onesignal: {
    enabled: parseBoolean(process.env.ONESIGNAL_ENABLED, false),
    appId: process.env.ONESIGNAL_APP_ID || '',
    apiKey: process.env.ONESIGNAL_API_KEY || '',
  },

  // Email
  email: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 587),
    secure: parseBoolean(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@example.com',
    fromName: process.env.SMTP_FROM_NAME || 'TikTok Games',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/server.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES, 5),
  },

  // Analytics
  analytics: {
    enabled: parseBoolean(process.env.ANALYTICS_ENABLED, false),
    googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID || '',
  },

  // Maintenance
  maintenance: {
    enabled: parseBoolean(process.env.MAINTENANCE_MODE, false),
    message: process.env.MAINTENANCE_MESSAGE || 'We are currently performing scheduled maintenance. Please try again later.',
  },

  // App Settings
  app: {
    name: process.env.APP_NAME || 'TikTok Games',
    version: process.env.APP_VERSION || '4.0.0',
    description: process.env.APP_DESCRIPTION || 'Play amazing HTML5 games',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com',
    privacyPolicyUrl: process.env.PRIVACY_POLICY_URL || '',
    termsOfServiceUrl: process.env.TERMS_OF_SERVICE_URL || '',
  },

  // Features
  features: {
    registrationEnabled: parseBoolean(process.env.REGISTRATION_ENABLED, true),
    socialLoginEnabled: parseBoolean(process.env.SOCIAL_LOGIN_ENABLED, false),
    guestPlayEnabled: parseBoolean(process.env.GUEST_PLAY_ENABLED, true),
    commentsEnabled: parseBoolean(process.env.COMMENTS_ENABLED, true),
    ratingsEnabled: parseBoolean(process.env.RATINGS_ENABLED, true),
  },

  // Cache
  cache: {
    enabled: parseBoolean(process.env.CACHE_ENABLED, false),
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 6379),
      password: process.env.REDIS_PASSWORD || '',
    },
  },

  // CDN
  cdn: {
    enabled: parseBoolean(process.env.CDN_ENABLED, false),
    url: process.env.CDN_URL || '',
  },

  // Backup
  backup: {
    enabled: parseBoolean(process.env.BACKUP_ENABLED, false),
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS, 30),
  },
};

// Ensure upload directories exist
const ensureDirectories = () => {
  const dirs = [
    config.uploads.uploadDir,
    config.uploads.gamesDir,
    config.uploads.thumbnailsDir,
    path.dirname(config.logging.file),
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Get asset URL (with CDN support)
const getAssetUrl = (relativePath) => {
  if (config.cdn.enabled && config.cdn.url) {
    return `${config.cdn.url}/${relativePath}`;
  }
  return `${config.domain}/${relativePath}`;
};

// Format file size for display
const formatFileSize = (bytes) => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

module.exports = {
  config,
  validateConfig,
  ensureDirectories,
  getAssetUrl,
  formatFileSize,
};
