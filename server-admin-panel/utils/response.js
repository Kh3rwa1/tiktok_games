/**
 * Standardized API Response Utilities
 * Ensures consistent response format across all endpoints
 */

/**
 * Success response wrapper
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Optional success message
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {Object} meta - Additional metadata (pagination, etc.)
 */
const success = (res, data, message = null, statusCode = 200, meta = {}) => {
  const response = {
    success: true,
    data
  };

  if (message) {
    response.message = message;
  }

  // Add pagination if present
  if (meta.pagination) {
    response.pagination = meta.pagination;
  }

  // Add other meta fields
  Object.keys(meta).forEach(key => {
    if (key !== 'pagination') {
      response[key] = meta[key];
    }
  });

  return res.status(statusCode).json(response);
};

/**
 * Error response wrapper
 * @param {Object} res - Express response object
 * @param {string} error - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} code - Error code for client handling
 * @param {Object} details - Additional error details
 */
const error = (res, errorMessage, statusCode = 500, code = 'SERVER_ERROR', details = null) => {
  const response = {
    success: false,
    error: errorMessage,
    code
  };

  if (details) {
    response.details = details;
  }

  // Add request ID if available
  if (res.req && res.req.id) {
    response.requestId = res.req.id;
  }

  return res.status(statusCode).json(response);
};

/**
 * Created response (201)
 */
const created = (res, data, message = 'Resource created successfully') => {
  return success(res, data, message, 201);
};

/**
 * No content response (204)
 */
const noContent = (res) => {
  return res.status(204).send();
};

/**
 * Bad request error (400)
 */
const badRequest = (res, message = 'Bad request', code = 'BAD_REQUEST', details = null) => {
  return error(res, message, 400, code, details);
};

/**
 * Unauthorized error (401)
 */
const unauthorized = (res, message = 'Unauthorized', code = 'UNAUTHORIZED') => {
  return error(res, message, 401, code);
};

/**
 * Forbidden error (403)
 */
const forbidden = (res, message = 'Forbidden', code = 'FORBIDDEN') => {
  return error(res, message, 403, code);
};

/**
 * Not found error (404)
 */
const notFound = (res, message = 'Resource not found', code = 'NOT_FOUND') => {
  return error(res, message, 404, code);
};

/**
 * Conflict error (409)
 */
const conflict = (res, message = 'Resource conflict', code = 'CONFLICT') => {
  return error(res, message, 409, code);
};

/**
 * Validation error (422)
 */
const validationError = (res, errors, message = 'Validation failed') => {
  return error(res, message, 422, 'VALIDATION_ERROR', { errors });
};

/**
 * Internal server error (500)
 */
const serverError = (res, message = 'Internal server error', code = 'SERVER_ERROR') => {
  return error(res, message, 500, code);
};

/**
 * Service unavailable (503)
 */
const serviceUnavailable = (res, message = 'Service temporarily unavailable', code = 'SERVICE_UNAVAILABLE') => {
  return error(res, message, 503, code);
};

/**
 * Paginated response helper
 */
const paginated = (res, data, pagination, message = null) => {
  return success(res, data, message, 200, { pagination });
};

module.exports = {
  success,
  error,
  created,
  noContent,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  validationError,
  serverError,
  serviceUnavailable,
  paginated
};
