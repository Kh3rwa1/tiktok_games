/**
 * TikTok Games Backend Server
 * Optimized for 1 Million+ Users
 * AAA+ Premium Quality Infrastructure
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const Redis = require('ioredis');
const cluster = require('cluster');
const os = require('os');

// Load environment variables
dotenv.config();

// Redis client for caching
let redis;
try {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  redis.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  redis.on('error', (err) => {
    console.log('⚠️ Redis connection error (caching disabled):', err.message);
  });
} catch (error) {
  console.log('⚠️ Redis not available, running without cache');
  redis = null;
}

// Cluster mode for production (utilize all CPU cores)
const numCPUs = os.cpus().length;
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && cluster.isMaster) {
  console.log(`🚀 Master ${process.pid} is running`);
  console.log(`🔧 Forking ${numCPUs} workers...`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`⚠️ Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });

  cluster.on('online', (worker) => {
    console.log(`✅ Worker ${worker.process.pid} is online`);
  });

} else {
  // Initialize Express app
  const app = express();

  // Trust proxy for load balancers
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for game iframes
    crossOriginEmbedderPolicy: false,
  }));

  // CORS configuration for scalability
  const corsOptions = {
    origin: (origin, callback) => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400, // 24 hours
  };
  app.use(cors(corsOptions));

  // Compression for faster responses
  app.use(compression({
    level: 6,
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
  }));

  // Request logging
  if (isProduction) {
    app.use(morgan('combined'));
  } else {
    app.use(morgan('dev'));
  }

  // Body parsing with size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Advanced rate limiting for 1M users
  const createRateLimiter = (windowMs, max, message) => rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.headers['x-forwarded-for'] || req.ip;
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    },
  });

  // Different rate limits for different endpoints
  const generalLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    1000, // 1000 requests per 15 minutes
    'Too many requests. Please try again later.'
  );

  const authLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    50, // 50 auth attempts per 15 minutes
    'Too many authentication attempts. Please try again later.'
  );

  const writeLimiter = createRateLimiter(
    60 * 1000, // 1 minute
    30, // 30 writes per minute
    'Too many write operations. Please slow down.'
  );

  // Apply rate limiters
  app.use('/api/', generalLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/games', (req, res, next) => {
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      return writeLimiter(req, res, next);
    }
    next();
  });

  // Cache middleware
  const cacheMiddleware = (duration = 60) => async (req, res, next) => {
    if (!redis || req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;

    try {
      const cached = await redis.get(key);
      if (cached) {
        const data = JSON.parse(cached);
        res.set('X-Cache', 'HIT');
        return res.json(data);
      }

      // Store original json method
      const originalJson = res.json.bind(res);

      res.json = (data) => {
        // Cache the response
        redis.setex(key, duration, JSON.stringify(data)).catch(() => {});
        res.set('X-Cache', 'MISS');
        return originalJson(data);
      };

      next();
    } catch (error) {
      next();
    }
  };

  // Cache invalidation helper
  const invalidateCache = async (pattern) => {
    if (!redis) return;

    try {
      const keys = await redis.keys(`cache:${pattern}`);
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  };

  // Make cache helpers available to routes
  app.use((req, res, next) => {
    req.redis = redis;
    req.invalidateCache = invalidateCache;
    req.cacheMiddleware = cacheMiddleware;
    next();
  });

  // Routes with caching
  app.use('/api/auth', require('./routes/auth'));

  // Games routes with smart caching
  const gamesRouter = require('./routes/games');
  app.use('/api/games/trending', cacheMiddleware(300), gamesRouter); // 5 min cache
  app.use('/api/games/recommended', cacheMiddleware(300), gamesRouter); // 5 min cache
  app.use('/api/games', gamesRouter);

  app.use('/api/admin', require('./routes/admin'));

  // Health check endpoint with detailed info
  app.get('/health', async (req, res) => {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    // Check Redis connection
    if (redis) {
      try {
        await redis.ping();
        healthData.redis = 'connected';
      } catch {
        healthData.redis = 'disconnected';
      }
    } else {
      healthData.redis = 'not configured';
    }

    res.status(200).json(healthData);
  });

  // Readiness check for Kubernetes/Load Balancers
  app.get('/ready', (req, res) => {
    res.status(200).json({ ready: true });
  });

  // Metrics endpoint for monitoring
  app.get('/metrics', (req, res) => {
    const metrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      timestamp: Date.now(),
    };
    res.json(metrics);
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Route not found',
      path: req.path,
      method: req.method
    });
  });

  // Global error handler with detailed logging
  app.use((err, req, res, next) => {
    // Log error details
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });

    // Send appropriate response
    const statusCode = err.status || err.statusCode || 500;
    const response = {
      error: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
    };

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      response.stack = err.stack;
    }

    res.status(statusCode).json(response);
  });

  // Start server
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`📊 Worker PID: ${process.pid}`);
    console.log(`💾 Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  });

  // Configure server timeouts for long-running requests
  server.timeout = 30000; // 30 seconds
  server.keepAliveTimeout = 65000; // 65 seconds
  server.headersTimeout = 66000; // 66 seconds

  // Graceful shutdown
  const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} signal received: closing HTTP server`);

    server.close(async () => {
      console.log('HTTP server closed');

      // Close Redis connection
      if (redis) {
        await redis.quit();
        console.log('Redis connection closed');
      }

      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  module.exports = app;
}
