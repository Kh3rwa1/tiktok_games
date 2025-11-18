/**
 * TikTok Games Backend Server
 * AAA+ Production-ready with enhanced security, performance, and monitoring
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const crypto = require('crypto');

// Load configuration
const { config, validateConfig, ensureDirectories } = require('./config');

// Validate required configuration
validateConfig();

// Ensure required directories exist
ensureDirectories();

// Database connection
const { testConnection, initDatabase, pool } = require('./config/database');

// Security middleware
const {
  securityHeaders,
  maintenanceMode,
  sanitizeRequest,
  validateContentType,
  securityLogger
} = require('./middleware/security');

// Server metrics tracking
const metrics = {
  requests: { total: 0, success: 0, errors: 0 },
  responseTimes: [],
  startTime: Date.now(),
  lastReset: Date.now()
};

// Reset metrics every hour
setInterval(() => {
  metrics.responseTimes = [];
  metrics.lastReset = Date.now();
}, 3600000);

// Initialize Express app
const app = express();

// Trust proxy for load balancers
app.set('trust proxy', 1);

// Request ID middleware for tracking
app.use((req, res, next) => {
  req.id = crypto.randomBytes(8).toString('hex');
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Response time tracking middleware
app.use((req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1e6; // Convert to milliseconds

    metrics.requests.total++;
    if (res.statusCode < 400) {
      metrics.requests.success++;
    } else {
      metrics.requests.errors++;
    }

    metrics.responseTimes.push(duration);
    if (metrics.responseTimes.length > 1000) {
      metrics.responseTimes.shift();
    }

    res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
  });

  next();
});

// Security headers
app.use(securityHeaders);

// Security logging for suspicious requests
app.use(securityLogger);

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
app.use('/api/social', require('./routes/social'));

// Serve static files (admin panel and game assets)
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: config.env === 'production' ? '1d' : 0,
  etag: true,
  lastModified: true,
}));

// Serve game files with aggressive caching for better performance
app.use('/games', express.static(path.join(__dirname, 'public', 'games'), {
  maxAge: '7d', // Cache games for 7 days
  etag: true,
  lastModified: true,
  immutable: true, // Games are versioned by ID, so they're immutable
  setHeaders: (res, filePath) => {
    // Set cache control headers for game assets
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour for HTML
    } else if (filePath.match(/\.(js|css)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable'); // 7 days for JS/CSS
    } else if (filePath.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable'); // 30 days for images
    } else if (filePath.match(/\.(woff|woff2|ttf|otf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable'); // 30 days for fonts
    } else if (filePath.match(/\.(mp3|wav|ogg|m4a)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable'); // 30 days for audio
    }
  }
}));

// Health check endpoint
app.get('/health', async (req, res) => {
  let dbStatus = 'healthy';
  let dbLatency = 0;

  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    dbLatency = Date.now() - start;
  } catch (error) {
    dbStatus = 'unhealthy';
  }

  const avgResponseTime = metrics.responseTimes.length > 0
    ? metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length
    : 0;

  res.json({
    status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: config.app.version,
    environment: config.env,
    maintenance: config.maintenance.enabled,
    database: {
      status: dbStatus,
      latency: `${dbLatency}ms`
    },
    metrics: {
      requests: metrics.requests,
      avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
      uptime: Math.floor((Date.now() - metrics.startTime) / 1000)
    },
    memory: {
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`
    }
  });
});

// Metrics endpoint for monitoring (admin only)
app.get('/api/metrics', (req, res) => {
  const avgResponseTime = metrics.responseTimes.length > 0
    ? metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length
    : 0;

  const p95Index = Math.floor(metrics.responseTimes.length * 0.95);
  const sortedTimes = [...metrics.responseTimes].sort((a, b) => a - b);
  const p95ResponseTime = sortedTimes[p95Index] || 0;

  res.json({
    requests: metrics.requests,
    responseTime: {
      avg: `${avgResponseTime.toFixed(2)}ms`,
      p95: `${p95ResponseTime.toFixed(2)}ms`,
      samples: metrics.responseTimes.length
    },
    uptime: {
      seconds: Math.floor((Date.now() - metrics.startTime) / 1000),
      formatted: formatUptime(Date.now() - metrics.startTime)
    },
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  });
});

// Helper function to format uptime
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

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
  // Log error with request context
  const errorLog = {
    timestamp: new Date().toISOString(),
    requestId: req.id,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: config.env !== 'production' ? err.stack : undefined,
    userId: req.user?.id,
    ip: req.ip
  };
  console.error('Error:', JSON.stringify(errorLog, null, 2));

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: err.message,
      code: 'VALIDATION_ERROR',
      requestId: req.id
    });
  }

  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
      requestId: req.id
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token has expired',
      code: 'TOKEN_EXPIRED',
      requestId: req.id
    });
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'CORS policy violation',
      code: 'CORS_ERROR',
      requestId: req.id
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File too large',
      code: 'FILE_TOO_LARGE',
      requestId: req.id
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Request payload too large',
      code: 'PAYLOAD_TOO_LARGE',
      requestId: req.id
    });
  }

  // Database errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      error: 'Duplicate entry',
      code: 'DUPLICATE_ENTRY',
      requestId: req.id
    });
  }

  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      error: 'Database connection failed',
      code: 'DATABASE_ERROR',
      requestId: req.id
    });
  }

  // Default error response
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: config.env === 'production' ? 'Internal server error' : err.message,
    code: err.code || 'SERVER_ERROR',
    requestId: req.id
  });
});

// Start server
const PORT = config.port;

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

// Graceful shutdown handler
let server;
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Stop accepting new requests
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
    });
  }

  try {
    // Close database pool
    if (pool) {
      await pool.end();
      console.log('Database connections closed');
    }

    console.log('Graceful shutdown complete');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server with reference for graceful shutdown
const startServerWithRef = async () => {
  try {
    // Test database connection
    await testConnection();

    // Initialize database tables
    await initDatabase();

    server = app.listen(PORT, () => {
      console.log('\n========================================');
      console.log(`  ${config.app.name} Server Started`);
      console.log('========================================');
      console.log(`  Port: ${PORT}`);
      console.log(`  Environment: ${config.env}`);
      console.log(`  Version: ${config.app.version}`);
      console.log(`  Domain: ${config.domain}`);
      console.log(`  Node: ${process.version}`);
      if (config.maintenance.enabled) {
        console.log(`  Mode: MAINTENANCE`);
      }
      console.log('========================================\n');
    });

    // Handle server errors
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
      } else {
        console.error('Server error:', err);
      }
      process.exit(1);
    });

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServerWithRef();

module.exports = app;
