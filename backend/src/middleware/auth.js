import jwt from 'jsonwebtoken'
import { queryOne } from '../models/database.js'

/**
 * Authentication Middleware
 * Handles JWT token verification and user authorization
 * Provides middleware functions for protecting routes and checking user roles
 */

/**
 * JWT Authentication Middleware
 * Verifies JWT token from Authorization header and attaches user data to request
 * Used to protect routes that require user authentication
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const authenticateToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        data: null
      })
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pillpulse-dev-secret')
    
    // Fetch user data from database to ensure user still exists
    const user = await queryOne(
      'SELECT id, email, role, created_at, updated_at FROM users WHERE id = ?',
      [decoded.userId]
    )
    
    // Check if user exists in database
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        data: null
      })
    }
    
    // Check if token is still valid (not expired based on user data)
    const tokenIssuedAt = new Date(decoded.iat * 1000)
    const userUpdatedAt = new Date(user.updated_at || user.created_at)
    
    // If user was updated after token was issued, token is invalid
    if (userUpdatedAt > tokenIssuedAt) {
      return res.status(401).json({
        success: false,
        error: 'Token expired due to account changes',
        data: null
      })
    }
    
    // Attach user data to request object for use in route handlers
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      created_at: user.created_at
    }
    
    // Continue to next middleware or route handler
    next()
    
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        data: null
      })
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        data: null
      })
    }
    
    // Handle database or other errors
    console.error('❌ Authentication error:', error)
    return res.status(500).json({
      success: false,
      error: 'Authentication service error',
      data: null
    })
  }
}

/**
 * Admin Role Authorization Middleware
 * Checks if authenticated user has admin role
 * Must be used after authenticateToken middleware
 * 
 * @param {Request} req - Express request object (must have req.user from auth middleware)
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const requireAdmin = (req, res, next) => {
  // Check if user is attached to request (from auth middleware)
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      data: null
    })
  }
  
  // Check if user has admin role
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      data: null
    })
  }
  
  // User is admin, continue to route handler
  next()
}

/**
 * Optional Authentication Middleware
 * Attempts to authenticate user but doesn't fail if no token provided
 * Useful for routes that work differently for authenticated vs anonymous users
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const optionalAuth = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    
    // If no token, continue without authentication
    if (!token) {
      req.user = null
      return next()
    }
    
    // Try to verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pillpulse-dev-secret')
    
    // Fetch user data from database
    const user = await queryOne(
      'SELECT id, email, role, created_at, updated_at FROM users WHERE id = ?',
      [decoded.userId]
    )
    
    // If user exists, attach to request
    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      }
    } else {
      req.user = null
    }
    
    next()
    
  } catch (error) {
    // If token is invalid, continue without authentication
    req.user = null
    next()
  }
}

/**
 * Resource Ownership Middleware Factory
 * Creates middleware to check if user owns a specific resource
 * Used for routes where users should only access their own data
 * 
 * @param {string} resourceType - Type of resource ('schedule', 'adherence', etc.)
 * @param {string} paramName - Name of route parameter containing resource ID
 * @returns {Function} Express middleware function
 */
export const requireOwnership = (resourceType, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          data: null
        })
      }
      
      // Admin users can access all resources
      if (req.user.role === 'admin') {
        return next()
      }
      
      const resourceId = req.params[paramName]
      
      // Check resource ownership based on type
      let ownershipQuery
      let params = [resourceId]
      
      switch (resourceType) {
        case 'schedule':
          ownershipQuery = 'SELECT user_id FROM schedules WHERE id = ?'
          break
        case 'adherence':
          ownershipQuery = `
            SELECT s.user_id 
            FROM adherence_records ar 
            JOIN schedules s ON ar.schedule_id = s.id 
            WHERE ar.id = ?
          `
          break
        default:
          return res.status(500).json({
            success: false,
            error: 'Invalid resource type for ownership check',
            data: null
          })
      }
      
      // Execute ownership query
      const resource = await queryOne(ownershipQuery, params)
      
      // Check if resource exists
      if (!resource) {
        return res.status(404).json({
          success: false,
          error: `${resourceType} not found`,
          data: null
        })
      }
      
      // Check if user owns the resource
      if (resource.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied - insufficient permissions',
          data: null
        })
      }
      
      // User owns the resource, continue
      next()
      
    } catch (error) {
      console.error(`❌ Ownership check error for ${resourceType}:`, error)
      return res.status(500).json({
        success: false,
        error: 'Authorization service error',
        data: null
      })
    }
  }
}

/**
 * Generate JWT Token
 * Utility function to create JWT tokens for authenticated users
 * 
 * @param {Object} user - User object with id and email
 * @param {string} expiresIn - Token expiration time (default: '24h')
 * @returns {string} JWT token string
 */
export const generateToken = (user, expiresIn = '24h') => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  }
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'pillpulse-dev-secret',
    { 
      expiresIn,
      issuer: 'pillpulse-api',
      audience: 'pillpulse-client'
    }
  )
}

/**
 * Verify Password Reset Token
 * Specialized middleware for password reset token verification
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const verifyResetToken = async (req, res, next) => {
  try {
    const { token } = req.body
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Reset token required',
        data: null
      })
    }
    
    // Verify reset token (shorter expiration than regular tokens)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pillpulse-dev-secret')
    
    // Check if this is a reset token
    if (decoded.type !== 'password-reset') {
      return res.status(400).json({
        success: false,
        error: 'Invalid reset token',
        data: null
      })
    }
    
    // Fetch user to ensure they still exist
    const user = await queryOne(
      'SELECT id, email FROM users WHERE id = ?',
      [decoded.userId]
    )
    
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'User not found',
        data: null
      })
    }
    
    // Attach user to request for password reset handler
    req.resetUser = user
    next()
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token',
        data: null
      })
    }
    
    console.error('❌ Reset token verification error:', error)
    return res.status(500).json({
      success: false,
      error: 'Token verification service error',
      data: null
    })
  }
}