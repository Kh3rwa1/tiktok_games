/**
 * Enhanced Security Middleware
 * Provides comprehensive security features
 */

const crypto = require('crypto');
const { config } = require('../config');

/**
 * Generate CSRF token
 */
const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * CSRF Protection Middleware
 */
const csrfProtection = (req, res, next) => {
  // Skip for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip for API requests with Bearer token (already authenticated)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || token !== sessionToken) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      code: 'CSRF_ERROR'
    });
  }

  next();
};

/**
 * Security Headers Middleware
 */
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');

  // HSTS for production
  if (config.env === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
};

/**
 * Maintenance Mode Middleware
 */
const maintenanceMode = (req, res, next) => {
  if (config.maintenance.enabled) {
    // Allow admin endpoints
    if (req.path.startsWith('/api/admin') || req.path === '/api/auth/login') {
      return next();
    }

    return res.status(503).json({
      error: 'Service Unavailable',
      message: config.maintenance.message,
      code: 'MAINTENANCE_MODE'
    });
  }
  next();
};

/**
 * Request Sanitization Middleware
 */
const sanitizeRequest = (req, res, next) => {
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key]);
      }
    });
  }

  // Sanitize body (for POST/PUT requests)
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  next();
};

/**
 * Sanitize string to prevent XSS
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;

  return str
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Recursively sanitize object
 */
const sanitizeObject = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (obj && typeof obj === 'object') {
    const sanitized = {};
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'string') {
        sanitized[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object') {
        sanitized[key] = sanitizeObject(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    });
    return sanitized;
  }

  return obj;
};

/**
 * IP Whitelist/Blacklist Middleware
 */
const ipFilter = (options = {}) => {
  const { whitelist = [], blacklist = [] } = options;

  return (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress;

    // Check blacklist first
    if (blacklist.length > 0 && blacklist.includes(clientIp)) {
      return res.status(403).json({
        error: 'Access denied',
        code: 'IP_BLOCKED'
      });
    }

    // Check whitelist (if configured)
    if (whitelist.length > 0 && !whitelist.includes(clientIp)) {
      return res.status(403).json({
        error: 'Access denied',
        code: 'IP_NOT_WHITELISTED'
      });
    }

    next();
  };
};

/**
 * Request Size Limiter
 */
const requestSizeLimiter = (maxSize) => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);

    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'Request too large',
        maxSize: maxSize,
        code: 'REQUEST_TOO_LARGE'
      });
    }

    next();
  };
};

/**
 * API Key Authentication (for external integrations)
 */
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required',
      code: 'API_KEY_REQUIRED'
    });
  }

  // Validate API key (implement your own validation logic)
  // For now, this is a placeholder
  // You can store API keys in database and validate against them

  next();
};

/**
 * Request Logger with Security Info
 */
const securityLogger = (req, res, next) => {
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id || 'anonymous'
  };

  // Log suspicious activities
  if (isSuspiciousRequest(req)) {
    console.warn('Suspicious request detected:', logData);
  }

  next();
};

/**
 * Check for suspicious request patterns
 */
const isSuspiciousRequest = (req) => {
  const suspiciousPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i, // SQL injection
    /<script[^>]*>[\s\S]*?<\/script[^>]*>/i, // XSS
    /(\.\.\/)|(\.\.\\)/i, // Path traversal
    /\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b/i // SQL keywords
  ];

  const fullUrl = req.originalUrl || req.url;
  const body = JSON.stringify(req.body || {});

  return suspiciousPatterns.some(pattern =>
    pattern.test(fullUrl) || pattern.test(body)
  );
};

/**
 * Content-Type Validation
 */
const validateContentType = (allowedTypes = ['application/json']) => {
  return (req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.headers['content-type'] || '';

      // Allow multipart for file uploads
      if (contentType.includes('multipart/form-data')) {
        return next();
      }

      const isValid = allowedTypes.some(type => contentType.includes(type));

      if (!isValid) {
        return res.status(415).json({
          error: 'Unsupported Media Type',
          allowed: allowedTypes,
          code: 'INVALID_CONTENT_TYPE'
        });
      }
    }

    next();
  };
};

/**
 * Slow Down Middleware (exponential backoff for repeated requests)
 */
const slowDown = (options = {}) => {
  const { windowMs = 60000, delayAfter = 10, delayMs = 500 } = options;
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();

    // Clean old entries
    if (!requests.has(key)) {
      requests.set(key, { count: 0, startTime: now });
    }

    const entry = requests.get(key);

    // Reset if window expired
    if (now - entry.startTime > windowMs) {
      entry.count = 0;
      entry.startTime = now;
    }

    entry.count++;

    // Apply delay if threshold exceeded
    if (entry.count > delayAfter) {
      const delay = (entry.count - delayAfter) * delayMs;
      setTimeout(next, Math.min(delay, 10000)); // Max 10 second delay
    } else {
      next();
    }
  };
};

module.exports = {
  generateCsrfToken,
  csrfProtection,
  securityHeaders,
  maintenanceMode,
  sanitizeRequest,
  sanitizeString,
  sanitizeObject,
  ipFilter,
  requestSizeLimiter,
  apiKeyAuth,
  securityLogger,
  validateContentType,
  slowDown
};
