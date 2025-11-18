/**
 * TikTok Games Backend Server
 * Production-ready with enhanced security
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Load configuration
const { config, validateConfig, ensureDirectories } = require('./config');

// Validate required configuration
validateConfig();

// Ensure required directories exist
ensureDirectories();

// Database connection
const { testConnection, initDatabase } = require('./config/database');

// Security middleware
const {
  securityHeaders,
  maintenanceMode,
  sanitizeRequest,
  validateContentType
} = require('./middleware/security');

// Initialize Express app
const app = express();

// Trust proxy for load balancers
app.set('trust proxy', 1);

// Security headers
app.use(securityHeaders);

// Helmet security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.onesignal.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://onesignal.com", "https://api.onesignal.com"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: config.env === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = config.cors.allowedOrigins;
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Limit'],
  maxAge: 86400, // 24 hours
};
app.use(cors(corsOptions));

// Compression
app.use(compression());

// Request logging
if (config.env === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Maintenance mode check
app.use(maintenanceMode);

// Body parsing with size limits from config
app.use(express.json({ limit: `${Math.ceil(config.uploads.maxFileSize / (1024 * 1024))}mb` }));
app.use(express.urlencoded({ extended: true, limit: `${Math.ceil(config.uploads.maxFileSize / (1024 * 1024))}mb` }));

// Content type validation
app.use('/api/', validateContentType(['application/json', 'multipart/form-data']));

// Request sanitization
app.use(sanitizeRequest);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Auth rate limiter (stricter)
const authLimiter = rateLimit({
  windowMs: config.rateLimit.auth.windowMs,
  max: config.rateLimit.auth.maxRequests,
  message: {
    error: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil(config.rateLimit.auth.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/games', require('./routes/games'));
app.use('/api/admin', require('./routes/admin'));

// Serve static files (admin panel and game assets)
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: config.env === 'production' ? '1d' : 0,
  etag: true,
  lastModified: true,
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: config.app.version,
    environment: config.env,
    maintenance: config.maintenance.enabled
  });
});

// Server info endpoint (for admin panel)
app.get('/api/server-info', (req, res) => {
  res.json({
    name: config.app.name,
    version: config.app.version,
    environment: config.env,
    features: config.features,
    uploads: {
      maxFileSize: config.uploads.maxFileSize,
      maxGameZipSize: config.uploads.maxGameZipSize,
      maxThumbnailSize: config.uploads.maxThumbnailSize,
      allowedImageTypes: config.uploads.allowedImageTypes
    }
  });
});

// SPA fallback for admin panel
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    code: 'NOT_FOUND'
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Error:', err.message);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: err.message,
      code: 'VALIDATION_ERROR'
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS policy violation',
      code: 'CORS_ERROR'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: config.env === 'production' ? 'Internal server error' : err.message,
    code: 'SERVER_ERROR'
  });
});

// Start server
const PORT = config.port;

const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Initialize database tables
    await initDatabase();

    app.listen(PORT, () => {
      console.log('\n========================================');
      console.log(`  ${config.app.name} Server Started`);
      console.log('========================================');
      console.log(`  Port: ${PORT}`);
      console.log(`  Environment: ${config.env}`);
      console.log(`  Version: ${config.app.version}`);
      console.log(`  Domain: ${config.domain}`);
      if (config.maintenance.enabled) {
        console.log(`  Mode: MAINTENANCE`);
      }
      console.log('========================================\n');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

startServer();

module.exports = app;
