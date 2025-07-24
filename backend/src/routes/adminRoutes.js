import express from 'express'
import { body, query, param, validationResult } from 'express-validator'
import { query as dbQuery, queryOne, execute } from '../models/database.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'
import { asyncHandler, createValidationError } from '../middleware/errorHandler.js'

/**
 * Admin Routes
 * Administrative endpoints for user management, system oversight, and configuration
 * All routes require admin authentication and role verification
 */

const router = express.Router()

// Apply admin authentication to all routes
router.use(authenticateToken)
router.use(requireAdmin)

/**
 * Validation Rules
 * Express-validator rules for admin operations
 */

// User management validation
const userUpdateValidation = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin'),
  
  body('api_key')
    .optional({ nullable: true })
    .custom((value) => {
      if (value !== null && value !== '' && !value.startsWith('sk-')) {
        throw new Error('API key must start with "sk-" or be null/empty to remove')
      }
      return true
    })
]

// Settings update validation
const settingsUpdateValidation = [
  body('reminder_frequency')
    .optional()
    .isIn(['hourly', 'daily', 'weekly'])
    .withMessage('Reminder frequency must be hourly, daily, or weekly'),
  
  body('reminder_format')
    .optional()
    .isIn(['text', 'email', 'both'])
    .withMessage('Reminder format must be text, email, or both')
]

// Query validation for list endpoints
const listQueryValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
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
 * Format user data for admin response (includes more details than regular user response)
 * @param {Object} user - Raw user data from database
 * @returns {Object} Formatted user object for admin view
 */
function formatAdminUserResponse(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    has_api_key: !!user.api_key,
    created_at: user.created_at,
    updated_at: user.updated_at,
    schedule_count: user.schedule_count || 0,
    last_activity: user.last_activity || null
  }
}

/**
 * GET /api/admin/users
 * List all users with filtering and pagination
 * Includes user statistics and activity information
 */
router.get('/users',
  listQueryValidation,
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const { limit = 50, offset = 0, search, role } = req.query
    
    // Build dynamic query
    let whereConditions = []
    let queryParams = []
    
    // Add search filter
    if (search) {
      whereConditions.push('u.email LIKE ?')
      queryParams.push(`%${search}%`)
    }
    
    // Add role filter
    if (role && ['user', 'admin'].includes(role)) {
      whereConditions.push('u.role = ?')
      queryParams.push(role)
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : ''
    
    // Get users with schedule counts
    const usersQuery = `
      SELECT 
        u.*,
        COUNT(s.id) as schedule_count,
        MAX(ar.created_at) as last_activity
      FROM users u
      LEFT JOIN schedules s ON u.id = s.user_id
      LEFT JOIN adherence_records ar ON s.id = ar.schedule_id
      ${whereClause}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `
    const usersParams = [...queryParams, parseInt(limit), parseInt(offset)]
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `
    
    // Execute queries
    const [users, countResult] = await Promise.all([
      dbQuery(usersQuery, usersParams),
      queryOne(countQuery, queryParams)
    ])
    
    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users: users.map(formatAdminUserResponse),
        pagination: {
          total: countResult.total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: (parseInt(offset) + users.length) < countResult.total
        },
        filters: {
          search,
          role
        }
      }
    })
  })
)

/**
 * GET /api/admin/users/:id
 * Get detailed information about a specific user
 * Includes schedules, adherence stats, and activity history
 */
router.get('/users/:id',
  param('id').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const userId = req.params.id
    
    // Get user details
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
    
    // Get user's schedules
    const schedules = await dbQuery(
      'SELECT * FROM schedules WHERE user_id = ? ORDER BY time ASC',
      [userId]
    )
    
    // Get user's adherence statistics
    const adherenceStats = await queryOne(`
      SELECT 
        COUNT(*) as total_records,
        SUM(CASE WHEN taken = 1 THEN 1 ELSE 0 END) as taken_count,
        SUM(CASE WHEN taken = 0 THEN 1 ELSE 0 END) as missed_count,
        ROUND(
          (SUM(CASE WHEN taken = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 
          2
        ) as adherence_rate
      FROM adherence_records ar
      JOIN schedules s ON ar.schedule_id = s.id
      WHERE s.user_id = ?
    `, [userId])
    
    // Get recent activity
    const recentActivity = await dbQuery(`
      SELECT 
        ar.date,
        ar.taken,
        s.medication_name,
        ar.created_at
      FROM adherence_records ar
      JOIN schedules s ON ar.schedule_id = s.id
      WHERE s.user_id = ?
      ORDER BY ar.created_at DESC
      LIMIT 10
    `, [userId])
    
    res.json({
      success: true,
      message: 'User details retrieved successfully',
      data: {
        user: formatAdminUserResponse(user),
        schedules: schedules,
        adherence_stats: {
          total_records: adherenceStats.total_records || 0,
          taken_count: adherenceStats.taken_count || 0,
          missed_count: adherenceStats.missed_count || 0,
          adherence_rate: adherenceStats.adherence_rate || 0
        },
        recent_activity: recentActivity
      }
    })
  })
)

/**
 * PUT /api/admin/users/:id
 * Update user information (admin privileges)
 * Allows updating email, role, and API key
 */
router.put('/users/:id',
  param('id').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
  userUpdateValidation,
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const userId = req.params.id
    const { email, role, api_key } = req.body
    
    // Check if user exists
    const existingUser = await queryOne(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    )
    
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        data: null
      })
    }
    
    // Prevent admins from changing their own role to user (security measure)
    if (role && role === 'user' && parseInt(userId) === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot change your own admin role',
        data: null
      })
    }
    
    // Check if new email is already taken
    if (email && email !== existingUser.email) {
      const emailTaken = await queryOne(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      )
      
      if (emailTaken) {
        return res.status(409).json({
          success: false,
          error: 'Email address is already in use',
          data: null
        })
      }
    }
    
    // Build update query
    const updateFields = {}
    if (email) updateFields.email = email
    if (role) updateFields.role = role
    if (api_key !== undefined) updateFields.api_key = api_key || null
    
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields provided for update',
        data: null
      })
    }
    
    updateFields.updated_at = new Date().toISOString()
    
    // Execute update
    const setClause = Object.keys(updateFields).map(field => `${field} = ?`).join(', ')
    const updateQuery = `UPDATE users SET ${setClause} WHERE id = ?`
    const updateParams = [...Object.values(updateFields), userId]
    
    await execute(updateQuery, updateParams)
    
    // Fetch updated user
    const updatedUser = await queryOne(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    )
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: formatAdminUserResponse(updatedUser)
    })
  })
)

/**
 * DELETE /api/admin/users/:id
 * Delete a user account (admin action)
 * Cascades to delete all associated data
 */
router.delete('/users/:id',
  param('id').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const userId = req.params.id
    
    // Prevent admins from deleting themselves
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own admin account',
        data: null
      })
    }
    
    // Check if user exists
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
    
    // Get counts before deletion for response
    const [scheduleCount, adherenceCount] = await Promise.all([
      queryOne('SELECT COUNT(*) as count FROM schedules WHERE user_id = ?', [userId]),
      queryOne(`
        SELECT COUNT(*) as count 
        FROM adherence_records ar 
        JOIN schedules s ON ar.schedule_id = s.id 
        WHERE s.user_id = ?
      `, [userId])
    ])
    
    // Delete user (CASCADE will handle related data)
    await execute('DELETE FROM users WHERE id = ?', [userId])
    
    res.json({
      success: true,
      message: 'User deleted successfully',
      data: {
        deleted_user: {
          id: parseInt(userId),
          email: user.email
        },
        deleted_schedules: scheduleCount.count,
        deleted_adherence_records: adherenceCount.count
      }
    })
  })
)

/**
 * GET /api/admin/schedules
 * List all schedules across all users
 * Includes user information and adherence statistics
 */
router.get('/schedules',
  listQueryValidation,
  query('user_id').optional().isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
  query('start_date').optional().isISO8601().withMessage('Start date must be in ISO format'),
  query('end_date').optional().isISO8601().withMessage('End date must be in ISO format'),
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const { limit = 50, offset = 0, search, user_id, start_date, end_date } = req.query
    
    // Build dynamic query
    let whereConditions = []
    let queryParams = []
    
    // Add user filter
    if (user_id) {
      whereConditions.push('s.user_id = ?')
      queryParams.push(user_id)
    }
    
    // Add search filter (medication name or user email)
    if (search) {
      whereConditions.push('(s.medication_name LIKE ? OR u.email LIKE ?)')
      queryParams.push(`%${search}%`, `%${search}%`)
    }
    
    // Add date filters
    if (start_date) {
      whereConditions.push('s.created_at >= ?')
      queryParams.push(start_date + ' 00:00:00')
    }
    
    if (end_date) {
      whereConditions.push('s.created_at <= ?')
      queryParams.push(end_date + ' 23:59:59')
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : ''
    
    // Get schedules with user info and adherence stats
    const schedulesQuery = `
      SELECT 
        s.*,
        u.email as user_email,
        u.role as user_role,
        COUNT(ar.id) as adherence_records,
        SUM(CASE WHEN ar.taken = 1 THEN 1 ELSE 0 END) as taken_count,
        ROUND(
          (SUM(CASE WHEN ar.taken = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(ar.id)), 
          2
        ) as adherence_rate
      FROM schedules s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN adherence_records ar ON s.id = ar.schedule_id
      ${whereClause}
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `
    const schedulesParams = [...queryParams, parseInt(limit), parseInt(offset)]
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM schedules s
      JOIN users u ON s.user_id = u.id
      ${whereClause}
    `
    
    const [schedules, countResult] = await Promise.all([
      dbQuery(schedulesQuery, schedulesParams),
      queryOne(countQuery, queryParams)
    ])
    
    res.json({
      success: true,
      message: 'Schedules retrieved successfully',
      data: {
        schedules: schedules.map(schedule => ({
          id: schedule.id,
          user_id: schedule.user_id,
          user_email: schedule.user_email,
          user_role: schedule.user_role,
          medication_name: schedule.medication_name,
          dosage: schedule.dosage,
          time: schedule.time,
          frequency: schedule.frequency,
          created_at: schedule.created_at,
          updated_at: schedule.updated_at,
          adherence_stats: {
            total_records: schedule.adherence_records || 0,
            taken_count: schedule.taken_count || 0,
            adherence_rate: schedule.adherence_rate || 0
          }
        })),
        pagination: {
          total: countResult.total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: (parseInt(offset) + schedules.length) < countResult.total
        },
        filters: {
          search,
          user_id: user_id ? parseInt(user_id) : null,
          start_date,
          end_date
        }
      }
    })
  })
)

/**
 * DELETE /api/admin/schedules/:id
 * Delete a schedule (admin action)
 * Removes schedule and associated adherence records
 */
router.delete('/schedules/:id',
  param('id').isInt({ min: 1 }).withMessage('Schedule ID must be a positive integer'),
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const scheduleId = req.params.id
    
    // Get schedule info before deletion
    const schedule = await queryOne(
      `SELECT s.*, u.email as user_email 
       FROM schedules s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.id = ?`,
      [scheduleId]
    )
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found',
        data: null
      })
    }
    
    // Get adherence count before deletion
    const adherenceCount = await queryOne(
      'SELECT COUNT(*) as count FROM adherence_records WHERE schedule_id = ?',
      [scheduleId]
    )
    
    // Delete schedule (CASCADE will handle adherence records)
    await execute('DELETE FROM schedules WHERE id = ?', [scheduleId])
    
    res.json({
      success: true,
      message: 'Schedule deleted successfully',
      data: {
        deleted_schedule: {
          id: parseInt(scheduleId),
          medication_name: schedule.medication_name,
          user_email: schedule.user_email
        },
        deleted_adherence_records: adherenceCount.count
      }
    })
  })
)

/**
 * GET /api/admin/settings
 * Get system settings
 */
router.get('/settings',
  asyncHandler(async (req, res) => {
    const settings = await queryOne(
      'SELECT * FROM settings WHERE admin_id = ?',
      [req.user.id]
    )
    
    if (!settings) {
      // Create default settings if none exist
      const result = await execute(
        'INSERT INTO settings (admin_id, reminder_frequency, reminder_format) VALUES (?, ?, ?)',
        [req.user.id, 'daily', 'text']
      )
      
      const newSettings = await queryOne(
        'SELECT * FROM settings WHERE id = ?',
        [result.lastID]
      )
      
      return res.json({
        success: true,
        message: 'Default settings created',
        data: newSettings
      })
    }
    
    res.json({
      success: true,
      message: 'Settings retrieved successfully',
      data: settings
    })
  })
)

/**
 * PUT /api/admin/settings
 * Update system settings
 */
router.put('/settings',
  settingsUpdateValidation,
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const { reminder_frequency, reminder_format } = req.body
    const adminId = req.user.id
    
    // Check if settings exist
    const existingSettings = await queryOne(
      'SELECT id FROM settings WHERE admin_id = ?',
      [adminId]
    )
    
    if (existingSettings) {
      // Update existing settings
      const updateFields = {}
      if (reminder_frequency) updateFields.reminder_frequency = reminder_frequency
      if (reminder_format) updateFields.reminder_format = reminder_format
      
      if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields provided for update',
          data: null
        })
      }
      
      updateFields.updated_at = new Date().toISOString()
      
      const setClause = Object.keys(updateFields).map(field => `${field} = ?`).join(', ')
      const updateQuery = `UPDATE settings SET ${setClause} WHERE admin_id = ?`
      const updateParams = [...Object.values(updateFields), adminId]
      
      await execute(updateQuery, updateParams)
    } else {
      // Create new settings
      await execute(
        'INSERT INTO settings (admin_id, reminder_frequency, reminder_format) VALUES (?, ?, ?)',
        [adminId, reminder_frequency || 'daily', reminder_format || 'text']
      )
    }
    
    // Fetch updated settings
    const updatedSettings = await queryOne(
      'SELECT * FROM settings WHERE admin_id = ?',
      [adminId]
    )
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedSettings
    })
  })
)

/**
 * GET /api/admin/stats
 * Get system-wide statistics
 */
router.get('/stats',
  asyncHandler(async (req, res) => {
    // Get various system statistics
    const [
      userStats,
      scheduleStats,
      adherenceStats,
      recentActivity
    ] = await Promise.all([
      // User statistics
      queryOne(`
        SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users,
          SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as regular_users,
          SUM(CASE WHEN api_key IS NOT NULL THEN 1 ELSE 0 END) as users_with_api_key
        FROM users
      `),
      
      // Schedule statistics
      queryOne(`
        SELECT 
          COUNT(*) as total_schedules,
          COUNT(DISTINCT user_id) as users_with_schedules,
          SUM(CASE WHEN frequency = 'daily' THEN 1 ELSE 0 END) as daily_schedules,
          SUM(CASE WHEN frequency = 'weekly' THEN 1 ELSE 0 END) as weekly_schedules,
          SUM(CASE WHEN frequency = 'monthly' THEN 1 ELSE 0 END) as monthly_schedules
        FROM schedules
      `),
      
      // Adherence statistics
      queryOne(`
        SELECT 
          COUNT(*) as total_adherence_records,
          SUM(CASE WHEN taken = 1 THEN 1 ELSE 0 END) as total_taken,
          SUM(CASE WHEN taken = 0 THEN 1 ELSE 0 END) as total_missed,
          ROUND(
            (SUM(CASE WHEN taken = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 
            2
          ) as overall_adherence_rate
        FROM adherence_records
      `),
      
      // Recent activity (last 7 days)
      dbQuery(`
        SELECT 
          DATE(ar.created_at) as date,
          COUNT(*) as records_logged,
          SUM(CASE WHEN ar.taken = 1 THEN 1 ELSE 0 END) as taken_count
        FROM adherence_records ar
        WHERE ar.created_at >= datetime('now', '-7 days')
        GROUP BY DATE(ar.created_at)
        ORDER BY date DESC
      `)
    ])
    
    res.json({
      success: true,
      message: 'System statistics retrieved successfully',
      data: {
        users: {
          total: userStats.total_users || 0,
          admins: userStats.admin_users || 0,
          regular: userStats.regular_users || 0,
          with_api_key: userStats.users_with_api_key || 0
        },
        schedules: {
          total: scheduleStats.total_schedules || 0,
          users_with_schedules: scheduleStats.users_with_schedules || 0,
          by_frequency: {
            daily: scheduleStats.daily_schedules || 0,
            weekly: scheduleStats.weekly_schedules || 0,
            monthly: scheduleStats.monthly_schedules || 0
          }
        },
        adherence: {
          total_records: adherenceStats.total_adherence_records || 0,
          total_taken: adherenceStats.total_taken || 0,
          total_missed: adherenceStats.total_missed || 0,
          overall_rate: adherenceStats.overall_adherence_rate || 0
        },
        recent_activity: recentActivity
      }
    })
  })
)

export default router