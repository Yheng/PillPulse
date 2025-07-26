import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import { queryOne, execute, query as queryAll } from '../models/database.js'
import { generateToken, authenticateToken, verifyResetToken } from '../middleware/auth.js'
import { asyncHandler, createValidationError } from '../middleware/errorHandler.js'
import { encryptApiKey, decryptApiKey } from '../utils/encryption.js'

/**
 * User Routes
 * Handles user authentication, registration, and profile management
 * Provides endpoints for login, registration, profile updates, and API key management
 */

const router = express.Router()

/**
 * Validation Rules
 * Express-validator rules for user data validation
 */

// Registration validation
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
]

// Login validation
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
]

// Profile update validation
const profileUpdateValidation = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
]

// Password change validation
const passwordChangeValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
]

// API key update validation
const apiKeyValidation = [
  body('apiKey')
    .optional({ nullable: true })
    .custom((value) => {
      if (value !== null && value !== '' && !value.startsWith('sk-')) {
        throw new Error('API key must start with "sk-" or be null/empty to remove')
      }
      return true
    })
]

// Password reset request validation
const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
]

// Password reset validation
const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
]

/**
 * Helper Functions
 */

/**
 * Check validation results and throw error if validation failed
 * @param {Request} req - Express request object
 */
function checkValidation(req) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    throw createValidationError(errors.array())
  }
}

/**
 * Format user data for response (removes sensitive information)
 * @param {Object} user - Raw user data from database
 * @returns {Object} Formatted user object without sensitive data
 */
function formatUserResponse(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    has_api_key: !!user.api_key,
    created_at: user.created_at,
    updated_at: user.updated_at
  }
}

/**
 * Generate password reset token
 * @param {Object} user - User object with id and email
 * @returns {string} Reset token string
 */
function generateResetToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    type: 'password-reset'
  }
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'pillpulse-dev-secret',
    { 
      expiresIn: '1h', // Reset tokens expire in 1 hour
      issuer: 'pillpulse-api',
      audience: 'pillpulse-client'
    }
  )
}

/**
 * POST /api/users/register
 * Register a new user account
 * Creates user with hashed password and returns JWT token
 */
router.post('/register',
  registerValidation,
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const { email, password } = req.body
    
    // Check if user already exists
    const existingUser = await queryOne(
      'SELECT id FROM users WHERE email = ?',
      [email]
    )
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists',
        data: null
      })
    }
    
    // Hash password with salt
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)
    
    // Create new user
    const result = await execute(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
      [email, hashedPassword, 'user']
    )
    
    // Fetch the newly created user
    const newUser = await queryOne(
      'SELECT * FROM users WHERE id = ?',
      [result.lastID]
    )
    
    // Generate JWT token
    const token = generateToken(newUser)
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: formatUserResponse(newUser),
        token
      }
    })
  })
)

/**
 * POST /api/users/login
 * Authenticate user and return JWT token
 * Validates credentials and returns user data with token
 */
router.post('/login',
  loginValidation,
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const { email, password } = req.body
    
    // Find user by email
    const user = await queryOne(
      'SELECT * FROM users WHERE email = ?',
      [email]
    )
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        data: null
      })
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        data: null
      })
    }
    
    // Note: We don't update updated_at on login to avoid invalidating the token
    // Only actual profile changes should update the updated_at field
    
    // Generate JWT token
    const token = generateToken(user)
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: formatUserResponse(user),
        token
      }
    })
  })
)

/**
 * GET /api/users/profile
 * Get current user's profile information
 * Requires authentication
 */
router.get('/profile',
  authenticateToken,
  asyncHandler(async (req, res) => {
    // User data is already attached by authenticateToken middleware
    const user = req.user
    
    // Fetch fresh user data from database
    const currentUser = await queryOne(
      'SELECT * FROM users WHERE id = ?',
      [user.id]
    )
    
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        data: null
      })
    }
    
    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: formatUserResponse(currentUser)
    })
  })
)

/**
 * PUT /api/users/profile
 * Update user profile information
 * Allows updating email address
 */
router.put('/profile',
  authenticateToken,
  profileUpdateValidation,
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const userId = req.user.id
    const { email } = req.body
    
    // Check if email is being updated
    if (email) {
      // Check if new email is already taken by another user
      const existingUser = await queryOne(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      )
      
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Email address is already in use by another account',
          data: null
        })
      }
      
      // Update email
      await execute(
        'UPDATE users SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [email, userId]
      )
    }
    
    // Fetch updated user data
    const updatedUser = await queryOne(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    )
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: formatUserResponse(updatedUser)
    })
  })
)

/**
 * PUT /api/users/password
 * Change user password
 * Requires current password verification
 */
router.put('/password',
  authenticateToken,
  passwordChangeValidation,
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const userId = req.user.id
    const { currentPassword, newPassword } = req.body
    
    // Fetch current user data including password hash
    const user = await queryOne(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    )
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        data: null
      })
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect',
        data: null
      })
    }
    
    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password)
    
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        error: 'New password must be different from current password',
        data: null
      })
    }
    
    // Hash new password
    const saltRounds = 12
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds)
    
    // Update password in database
    await execute(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedNewPassword, userId]
    )
    
    res.json({
      success: true,
      message: 'Password changed successfully',
      data: null
    })
  })
)

/**
 * PUT /api/users/api-key
 * Update user's OpenAI API key
 * Encrypts and stores API key securely
 */
router.put('/api-key',
  authenticateToken,
  apiKeyValidation,
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const userId = req.user.id
    let { apiKey } = req.body
    
    // Handle API key removal
    if (!apiKey || apiKey === '') {
      await execute(
        'UPDATE users SET api_key = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [userId]
      )
      
      return res.json({
        success: true,
        message: 'API key removed successfully',
        data: { has_api_key: false }
      })
    }
    
    // Encrypt API key before storing
    const encryptedApiKey = encryptApiKey(apiKey)
    
    // Update API key in database
    await execute(
      'UPDATE users SET api_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [encryptedApiKey, userId]
    )
    
    res.json({
      success: true,
      message: 'API key updated successfully',
      data: { has_api_key: true }
    })
  })
)

/**
 * GET /api/users/api-key
 * Get user's decrypted API key (for settings display)
 * Returns masked version for security
 */
router.get('/api-key',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    
    // Fetch encrypted API key
    const user = await queryOne(
      'SELECT api_key FROM users WHERE id = ?',
      [userId]
    )
    
    if (!user || !user.api_key) {
      return res.json({
        success: true,
        message: 'No API key found',
        data: { has_api_key: false, masked_key: null }
      })
    }
    
    try {
      // Decrypt API key
      const decryptedKey = decryptApiKey(user.api_key)
      
      // Return masked version (show first 7 chars and last 4 chars)
      const maskedKey = decryptedKey.substring(0, 7) + 
                       '*'.repeat(Math.max(0, decryptedKey.length - 11)) +
                       decryptedKey.substring(decryptedKey.length - 4)
      
      res.json({
        success: true,
        message: 'API key retrieved successfully',
        data: {
          has_api_key: true,
          masked_key: maskedKey
        }
      })
    } catch (error) {
      console.error('❌ API key decryption error:', error)
      
      res.json({
        success: true,
        message: 'API key found but could not be decrypted',
        data: {
          has_api_key: true,
          masked_key: 'sk-****...****'
        }
      })
    }
  })
)

/**
 * DELETE /api/users/account
 * Delete user account and all associated data
 * Requires password confirmation for security
 */
router.delete('/account',
  authenticateToken,
  body('password').notEmpty().withMessage('Password confirmation required'),
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const userId = req.user.id
    const { password } = req.body
    
    // Fetch user data for password verification
    const user = await queryOne(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    )
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        data: null
      })
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Password confirmation failed',
        data: null
      })
    }
    
    // Delete user account (CASCADE will handle related data)
    await execute(
      'DELETE FROM users WHERE id = ?',
      [userId]
    )
    
    res.json({
      success: true,
      message: 'Account deleted successfully',
      data: null
    })
  })
)

/**
 * POST /api/users/logout
 * Logout endpoint (token invalidation would be handled client-side)
 * This endpoint exists for consistency and potential future token blacklisting
 */
router.post('/logout',
  authenticateToken,
  asyncHandler(async (req, res) => {
    // In JWT-based auth, logout is typically handled client-side
    // by removing the token from storage
    // This endpoint can be extended to maintain a token blacklist if needed
    
    res.json({
      success: true,
      message: 'Logout successful',
      data: null
    })
  })
)

/**
 * GET /api/users/notification-settings
 * Get user's notification preferences
 * Returns push, email, SMS settings and reminder frequency
 */
router.get('/notification-settings',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    
    // Get notification settings from database
    const settings = await queryOne(
      'SELECT push_notifications, email_notifications, sms_notifications, reminder_frequency, timezone FROM users WHERE id = ?',
      [userId]
    )
    
    // Return default settings if not found
    const defaultSettings = {
      push_notifications: true,
      email_notifications: true,
      sms_notifications: false,
      reminder_frequency: 30,
      timezone: 'America/New_York'
    }
    
    res.json({
      success: true,
      message: 'Notification settings retrieved successfully',
      data: settings || defaultSettings
    })
  })
)

/**
 * PUT /api/users/notification-settings
 * Update user's notification preferences
 * Allows updating push, email, SMS settings and reminder frequency
 */
router.put('/notification-settings',
  authenticateToken,
  [
    body('push_notifications').optional().isBoolean().withMessage('Push notifications must be boolean'),
    body('email_notifications').optional().isBoolean().withMessage('Email notifications must be boolean'),
    body('sms_notifications').optional().isBoolean().withMessage('SMS notifications must be boolean'),
    body('reminder_frequency').optional().isInt({ min: 1, max: 60 }).withMessage('Reminder frequency must be between 1 and 60 minutes'),
  body('timezone').optional().isString().withMessage('Timezone must be a valid string')
  ],
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const userId = req.user.id
    const { 
      push_notifications, 
      email_notifications, 
      sms_notifications, 
      reminder_frequency,
      timezone
    } = req.body
    
    // Build update query dynamically based on provided fields
    const updateFields = []
    const updateValues = []
    
    if (typeof push_notifications === 'boolean') {
      updateFields.push('push_notifications = ?')
      updateValues.push(push_notifications ? 1 : 0)
    }
    
    if (typeof email_notifications === 'boolean') {
      updateFields.push('email_notifications = ?')
      updateValues.push(email_notifications ? 1 : 0)
    }
    
    if (typeof sms_notifications === 'boolean') {
      updateFields.push('sms_notifications = ?')
      updateValues.push(sms_notifications ? 1 : 0)
    }
    
    if (reminder_frequency) {
      updateFields.push('reminder_frequency = ?')
      updateValues.push(reminder_frequency)
    }
    
    if (timezone) {
      updateFields.push('timezone = ?')
      updateValues.push(timezone)
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid notification settings provided',
        data: null
      })
    }
    
    // Add updated_at and user ID
    updateFields.push('updated_at = CURRENT_TIMESTAMP')
    updateValues.push(userId)
    
    // Update notification settings
    await execute(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    )
    
    // Fetch updated settings
    const updatedSettings = await queryOne(
      'SELECT push_notifications, email_notifications, sms_notifications, reminder_frequency, timezone FROM users WHERE id = ?',
      [userId]
    )
    
    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      data: {
        push_notifications: !!updatedSettings.push_notifications,
        email_notifications: !!updatedSettings.email_notifications,
        sms_notifications: !!updatedSettings.sms_notifications,
        reminder_frequency: updatedSettings.reminder_frequency || 30,
        timezone: updatedSettings.timezone || 'America/New_York'
      }
    })
  })
)

/**
 * POST /api/users/forgot-password
 * Request password reset token
 * Sends reset token (in production, this would be emailed)
 */
router.post('/forgot-password',
  forgotPasswordValidation,
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const { email } = req.body
    
    // Find user by email
    const user = await queryOne(
      'SELECT id, email FROM users WHERE email = ?',
      [email]
    )
    
    // Always return success to prevent email enumeration
    // In production, this would send an email with the reset link
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
        data: null
      })
    }
    
    // Generate reset token
    const resetToken = generateResetToken(user)
    
    // In production, send email here
    // For development, return the token in the response
    console.log(`🔑 Password reset token for ${email}: ${resetToken}`)
    
    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
      data: {
        // Remove this in production - token should only be sent via email
        reset_token: resetToken,
        dev_note: 'In production, this token would be sent via email only'
      }
    })
  })
)

/**
 * GET /api/users/notifications
 * Get user's recent notifications
 * Returns paginated list of notifications
 */
router.get('/notifications',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const limit = parseInt(req.query.limit) || 20
    const offset = parseInt(req.query.offset) || 0
    const unreadOnly = req.query.unread_only === 'true'
    
    try {
      // Build query based on filters
      let whereClause = 'WHERE user_id = ?'
      let params = [userId]
      
      if (unreadOnly) {
        whereClause += ' AND read_at IS NULL'
      }
      
      // Get notifications with pagination
      const notifications = await queryAll(`
        SELECT 
          id,
          schedule_id,
          type,
          title,
          message,
          sent_at,
          read_at,
          ai_generated
        FROM notifications
        ${whereClause}
        ORDER BY sent_at DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset])
      
      // Get total count
      const countResult = await queryOne(`
        SELECT COUNT(*) as total
        FROM notifications
        ${whereClause}
      `, params)
      
      const total = countResult?.total || 0
      
      res.json({
        success: true,
        message: 'Notifications retrieved successfully',
        data: {
          notifications,
          pagination: {
            total,
            limit,
            offset,
            has_more: offset + notifications.length < total
          }
        }
      })
    } catch (err) {
      console.error('❌ Failed to get notifications:', err)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve notifications',
        data: null
      })
    }
  })
)

/**
 * PUT /api/users/notifications/:id/read
 * Mark a notification as read
 */
router.put('/notifications/:id/read',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const notificationId = parseInt(req.params.id)
    
    if (!notificationId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification ID',
        data: null
      })
    }
    
    try {
      // Verify notification belongs to user and mark as read
      const result = await execute(`
        UPDATE notifications
        SET read_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ? AND read_at IS NULL
      `, [notificationId, userId])
      
      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found or already read',
          data: null
        })
      }
      
      res.json({
        success: true,
        message: 'Notification marked as read',
        data: null
      })
    } catch (err) {
      console.error('❌ Failed to mark notification as read:', err)
      res.status(500).json({
        success: false,
        error: 'Failed to mark notification as read',
        data: null
      })
    }
  })
)

/**
 * POST /api/users/reset-password
 * Reset password using reset token
 * Updates user password after verifying reset token
 */
router.post('/reset-password',
  resetPasswordValidation,
  verifyResetToken,
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const { newPassword } = req.body
    const user = req.resetUser // Set by verifyResetToken middleware
    
    // Hash new password
    const saltRounds = 12
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds)
    
    // Update password in database
    await execute(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedNewPassword, user.id]
    )
    
    res.json({
      success: true,
      message: 'Password reset successfully',
      data: null
    })
  })
)

export default router