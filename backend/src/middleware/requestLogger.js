/**
 * Request Logging Middleware
 * Logs HTTP requests for debugging and monitoring
 * Provides detailed request/response information in development
 */

/**
 * Request Logger Middleware
 * Logs incoming HTTP requests with timing and response information
 * Useful for debugging API calls and monitoring performance
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const requestLogger = (req, res, next) => {
  // Record request start time
  const startTime = Date.now()
  
  // Get client IP address (consider proxy headers)
  const clientIP = req.ip || 
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null)

  // Create request ID for tracking
  const requestId = generateRequestId()
  req.requestId = requestId

  // Log request start
  console.log(`🔵 [${requestId}] ${req.method} ${req.originalUrl} - ${clientIP}`)
  
  // In development, log request details
  if (process.env.NODE_ENV === 'development') {
    console.log(`📋 [${requestId}] Headers:`, JSON.stringify(req.headers, null, 2))
    
    if (req.body && Object.keys(req.body).length > 0) {
      // Log body but mask sensitive fields
      const safeBody = maskSensitiveFields(req.body)
      console.log(`📦 [${requestId}] Body:`, JSON.stringify(safeBody, null, 2))
    }
    
    if (req.query && Object.keys(req.query).length > 0) {
      console.log(`❓ [${requestId}] Query:`, JSON.stringify(req.query, null, 2))
    }
  }

  // Override res.json to log response
  const originalJson = res.json
  res.json = function(data) {
    // Calculate response time
    const responseTime = Date.now() - startTime
    
    // Log response
    const statusCode = res.statusCode
    const statusEmoji = getStatusEmoji(statusCode)
    
    console.log(`${statusEmoji} [${requestId}] ${statusCode} ${req.method} ${req.originalUrl} - ${responseTime}ms`)
    
    // In development, log response data (truncated if large)
    if (process.env.NODE_ENV === 'development') {
      const responseData = typeof data === 'object' ? JSON.stringify(data, null, 2) : data
      const truncatedData = responseData.length > 1000 
        ? responseData.substring(0, 1000) + '...[truncated]'
        : responseData
      
      console.log(`📤 [${requestId}] Response:`, truncatedData)
    }
    
    // Add response headers for debugging
    res.set('X-Request-ID', requestId)
    res.set('X-Response-Time', `${responseTime}ms`)
    
    // Call original json method
    return originalJson.call(this, data)
  }

  // Override res.send to log non-JSON responses
  const originalSend = res.send
  res.send = function(data) {
    const responseTime = Date.now() - startTime
    const statusCode = res.statusCode
    const statusEmoji = getStatusEmoji(statusCode)
    
    console.log(`${statusEmoji} [${requestId}] ${statusCode} ${req.method} ${req.originalUrl} - ${responseTime}ms`)
    
    res.set('X-Request-ID', requestId)
    res.set('X-Response-Time', `${responseTime}ms`)
    
    return originalSend.call(this, data)
  }

  next()
}

/**
 * Generate Request ID
 * Creates a unique identifier for each request
 * 
 * @returns {string} Unique request identifier
 */
function generateRequestId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

/**
 * Get Status Emoji
 * Returns appropriate emoji based on HTTP status code
 * 
 * @param {number} statusCode - HTTP status code
 * @returns {string} Emoji representing status
 */
function getStatusEmoji(statusCode) {
  if (statusCode >= 200 && statusCode < 300) {
    return '✅' // Success
  } else if (statusCode >= 300 && statusCode < 400) {
    return '🔄' // Redirect
  } else if (statusCode >= 400 && statusCode < 500) {
    return '⚠️'  // Client error
  } else if (statusCode >= 500) {
    return '❌' // Server error
  } else {
    return '🔵' // Other
  }
}

/**
 * Mask Sensitive Fields
 * Removes or masks sensitive information from request data
 * Prevents logging of passwords, API keys, etc.
 * 
 * @param {Object} data - Request data object
 * @returns {Object} Data with sensitive fields masked
 */
function maskSensitiveFields(data) {
  if (!data || typeof data !== 'object') {
    return data
  }

  const sensitiveFields = [
    'password',
    'confirmPassword',
    'currentPassword',
    'newPassword',
    'api_key',
    'apiKey',
    'token',
    'refresh_token',
    'secret',
    'authorization'
  ]

  const masked = { ...data }

  // Recursively mask sensitive fields
  function maskObject(obj) {
    if (!obj || typeof obj !== 'object') {
      return obj
    }

    const result = Array.isArray(obj) ? [] : {}

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase()
      
      // Check if field is sensitive
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        result[key] = value ? '[MASKED]' : value
      } else if (typeof value === 'object' && value !== null) {
        // Recursively mask nested objects
        result[key] = maskObject(value)
      } else {
        result[key] = value
      }
    }

    return result
  }

  return maskObject(masked)
}

/**
 * Performance Logger Middleware
 * Logs slow requests for performance monitoring
 * 
 * @param {number} threshold - Threshold in milliseconds for slow requests
 * @returns {Function} Express middleware function
 */
export const performanceLogger = (threshold = 1000) => {
  return (req, res, next) => {
    const startTime = Date.now()
    
    // Override response end to check timing
    const originalEnd = res.end
    res.end = function(...args) {
      const responseTime = Date.now() - startTime
      
      // Log slow requests
      if (responseTime > threshold) {
        console.warn(`🐌 SLOW REQUEST [${req.requestId || 'unknown'}] ${req.method} ${req.originalUrl} - ${responseTime}ms (threshold: ${threshold}ms)`)
      }
      
      originalEnd.apply(this, args)
    }
    
    next()
  }
}

/**
 * Error Request Logger
 * Specifically logs requests that result in errors
 * 
 * @param {Error} err - Error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const errorLogger = (err, req, res, next) => {
  // Log error with request context
  console.error(`❌ ERROR [${req.requestId || 'unknown'}] ${req.method} ${req.originalUrl}:`, {
    error: err.message,
    stack: err.stack,
    user: req.user?.id || 'anonymous',
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  })
  
  next(err)
}

/**
 * User Activity Logger
 * Logs user-specific actions for audit trail
 * 
 * @param {string} action - Action being performed
 * @returns {Function} Express middleware function
 */
export const userActivityLogger = (action) => {
  return (req, res, next) => {
    // Only log if user is authenticated
    if (req.user) {
      console.log(`👤 USER ACTION [${req.requestId || 'unknown'}] User ${req.user.id} (${req.user.email}) - ${action}`)
    }
    
    next()
  }
}

/**
 * API Analytics Logger
 * Logs API usage statistics for analytics
 * Can be extended to send data to analytics services
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const analyticsLogger = (req, res, next) => {
  const startTime = Date.now()
  
  // Override response to capture analytics data
  const originalJson = res.json
  res.json = function(data) {
    const responseTime = Date.now() - startTime
    
    // Log analytics data (in production, send to analytics service)
    const analyticsData = {
      method: req.method,
      path: req.route?.path || req.originalUrl,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || null,
      timestamp: new Date().toISOString()
    }
    
    // In development, just log to console
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 ANALYTICS:`, analyticsData)
    }
    
    // TODO: In production, send to analytics service
    // analyticsService.track(analyticsData)
    
    return originalJson.call(this, data)
  }
  
  next()
}