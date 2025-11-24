/**
 * Structured Logger Utility
 * Provides consistent log formatting with levels and context
 */

const { config } = require('../config');

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = LOG_LEVELS[config.logging?.level || 'info'] || LOG_LEVELS.info;

/**
 * Format log message with timestamp and level
 */
const formatLog = (level, message, context = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...context
  };

  // In production, output JSON for log aggregation
  if (config.env === 'production') {
    return JSON.stringify(logEntry);
  }

  // In development, output human-readable format
  let output = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  if (Object.keys(context).length > 0) {
    output += ` ${JSON.stringify(context)}`;
  }
  return output;
};

/**
 * Log error message
 */
const error = (message, context = {}) => {
  if (currentLevel >= LOG_LEVELS.error) {
    console.error(formatLog('error', message, context));
  }
};

/**
 * Log warning message
 */
const warn = (message, context = {}) => {
  if (currentLevel >= LOG_LEVELS.warn) {
    console.warn(formatLog('warn', message, context));
  }
};

/**
 * Log info message
 */
const info = (message, context = {}) => {
  if (currentLevel >= LOG_LEVELS.info) {
    console.log(formatLog('info', message, context));
  }
};

/**
 * Log debug message
 */
const debug = (message, context = {}) => {
  if (currentLevel >= LOG_LEVELS.debug) {
    console.log(formatLog('debug', message, context));
  }
};

/**
 * Log HTTP request
 */
const request = (req, responseTime, statusCode) => {
  const context = {
    method: req.method,
    path: req.path,
    statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.id,
    userId: req.user?.id
  };

  if (statusCode >= 500) {
    error('Request failed', context);
  } else if (statusCode >= 400) {
    warn('Request error', context);
  } else {
    info('Request completed', context);
  }
};

/**
 * Log security event
 */
const security = (event, req, details = {}) => {
  const context = {
    event,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    path: req.path,
    userId: req.user?.id,
    ...details
  };

  warn('Security event', context);
};

/**
 * Log database operation
 */
const database = (operation, table, duration, success = true) => {
  const level = success ? 'debug' : 'error';
  const context = {
    operation,
    table,
    duration: `${duration}ms`,
    success
  };

  if (success) {
    debug('Database operation', context);
  } else {
    error('Database operation failed', context);
  }
};

/**
 * Log audit event
 */
const audit = (userId, action, resourceType, resourceId, details = {}) => {
  const context = {
    userId,
    action,
    resourceType,
    resourceId,
    ...details
  };

  info('Audit event', context);
};

module.exports = {
  error,
  warn,
  info,
  debug,
  request,
  security,
  database,
  audit
};
