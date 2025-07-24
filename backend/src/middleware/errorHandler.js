/**
 * Error Handling Middleware
 * Centralized error handling for the PillPulse API
 * Provides consistent error responses and logging
 */

/**
 * Global Error Handler Middleware
 * Catches all errors and formats them into consistent API responses
 * Logs errors for debugging and monitoring
 * 
 * @param {Error} err - Error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const errorHandler = (err, req, res, next) => {
  // Log error details for debugging
  console.error('❌ API Error:', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    body: req.body,
    user: req.user?.id || 'anonymous',
    timestamp: new Date().toISOString()
  })

  // Default error response
  let statusCode = 500
  let message = 'Internal server error'
  let details = null

  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Express-validator errors
    statusCode = 400
    message = 'Validation failed'
    details = err.errors?.map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    })) || null
  } else if (err.name === 'JsonWebTokenError') {
    // JWT authentication errors
    statusCode = 401
    message = 'Invalid authentication token'
  } else if (err.name === 'TokenExpiredError') {
    // JWT token expiration
    statusCode = 401
    message = 'Authentication token expired'
  } else if (err.code === 'SQLITE_CONSTRAINT') {
    // SQLite constraint violations
    statusCode = 409
    message = 'Data constraint violation'
    
    if (err.message.includes('UNIQUE constraint failed')) {
      if (err.message.includes('users.email')) {
        message = 'Email address already registered'
      } else {
        message = 'Duplicate entry found'
      }
    } else if (err.message.includes('FOREIGN KEY constraint failed')) {
      message = 'Referenced data not found'
    }
  } else if (err.code === 'SQLITE_BUSY') {
    // Database busy errors
    statusCode = 503
    message = 'Database temporarily unavailable'
  } else if (err.statusCode || err.status) {
    // Custom errors with status codes
    statusCode = err.statusCode || err.status
    message = err.message || message
  } else if (err.message === 'Not Found') {
    // 404 errors
    statusCode = 404
    message = 'Resource not found'
  } else if (err.type === 'entity.parse.failed') {
    // JSON parsing errors
    statusCode = 400
    message = 'Invalid JSON in request body'
  } else if (err.type === 'entity.too.large') {
    // Payload too large errors
    statusCode = 413
    message = 'Request payload too large'
  }

  // In development, include more error details
  if (process.env.NODE_ENV === 'development') {
    details = {
      ...details,
      stack: err.stack,
      name: err.name,
      code: err.code
    }
  }

  // Send error response in consistent format
  res.status(statusCode).json({
    success: false,
    error: message,
    data: null,
    ...(details && { details })
  })
}

/**
 * Async Error Handler Wrapper
 * Wraps async route handlers to catch and forward errors
 * Eliminates need for try-catch blocks in every async route
 * 
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Custom Error Classes
 * Specific error types for different scenarios
 */

/**
 * Validation Error
 * For input validation failures
 */
export class ValidationError extends Error {
  constructor(message, errors = null) {
    super(message)
    this.name = 'ValidationError'
    this.statusCode = 400
    this.errors = errors
  }
}

/**
 * Authentication Error
 * For authentication failures
 */
export class AuthenticationError extends Error {
  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
    this.statusCode = 401
  }
}

/**
 * Authorization Error
 * For insufficient permissions
 */
export class AuthorizationError extends Error {
  constructor(message = 'Insufficient permissions') {
    super(message)
    this.name = 'AuthorizationError'
    this.statusCode = 403
  }
}

/**
 * Not Found Error
 * For resource not found scenarios
 */
export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
    this.statusCode = 404
  }
}

/**
 * Conflict Error
 * For data conflicts (duplicate entries, etc.)
 */
export class ConflictError extends Error {
  constructor(message = 'Data conflict') {
    super(message)
    this.name = 'ConflictError'
    this.statusCode = 409
  }
}

/**
 * Rate Limit Error
 * For rate limiting scenarios
 */
export class RateLimitError extends Error {
  constructor(message = 'Rate limit exceeded') {
    super(message)
    this.name = 'RateLimitError'
    this.statusCode = 429
  }
}

/**
 * Database Error Handler
 * Specific handler for database-related errors
 * 
 * @param {Error} err - Database error
 * @returns {Error} Processed error with appropriate message
 */
export const handleDatabaseError = (err) => {
  console.error('❌ Database Error:', err)

  // SQLite specific error handling
  if (err.code === 'SQLITE_CONSTRAINT') {
    if (err.message.includes('UNIQUE constraint failed')) {
      return new ConflictError('Duplicate entry found')
    } else if (err.message.includes('FOREIGN KEY constraint failed')) {
      return new ValidationError('Referenced data not found')
    }
    return new ValidationError('Data constraint violation')
  }

  if (err.code === 'SQLITE_BUSY') {
    return new Error('Database temporarily unavailable')
  }

  if (err.code === 'SQLITE_LOCKED') {
    return new Error('Database locked')
  }

  if (err.code === 'SQLITE_READONLY') {
    return new Error('Database is read-only')
  }

  // Return original error if not specifically handled
  return err
}

/**
 * API Response Error Creator
 * Creates standardized error responses for API endpoints
 * 
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} details - Additional error details
 * @returns {Error} Formatted error object
 */
export const createApiError = (message, statusCode = 500, details = null) => {
  const error = new Error(message)
  error.statusCode = statusCode
  error.details = details
  return error
}

/**
 * Validation Error Creator
 * Creates validation errors from express-validator results
 * 
 * @param {Array} validationResults - Express-validator results
 * @returns {ValidationError} Formatted validation error
 */
export const createValidationError = (validationResults) => {
  const errors = validationResults.map(result => ({
    field: result.param,
    message: result.msg,
    value: result.value,
    location: result.location
  }))

  return new ValidationError('Validation failed', errors)
}