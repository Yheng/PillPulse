import express from 'express'
import bcrypt from 'bcrypt'
import { body, validationResult } from 'express-validator'
import { queryOne, execute } from '../models/database.js'
import { generateToken, authenticateToken } from '../middleware/auth.js'
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
    
    // Update last login timestamp
    await execute(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    )
    
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

export default router