import express from 'express'
import { body, query, param, validationResult } from 'express-validator'
import { 
  query as dbQuery, 
  queryOne, 
  execute, 
  beginTransaction, 
  commitTransaction, 
  rollbackTransaction 
} from '../models/database.js'
import { authenticateToken, requireOwnership } from '../middleware/auth.js'
import { asyncHandler, createValidationError } from '../middleware/errorHandler.js'

/**
 * Schedule Routes
 * Handles all medication schedule-related API endpoints
 * Provides CRUD operations for user medication schedules
 * All routes require authentication and user ownership validation
 */

const router = express.Router()

/**
 * Validation Rules
 * Express-validator rules for schedule data validation
 */

// Schedule creation validation
const createScheduleValidation = [
  body('medication_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Medication name must be between 1 and 100 characters'),
  
  body('dosage')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Dosage must be between 1 and 50 characters'),
  
  body('time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format (24-hour)'),
  
  body('frequency')
    .isIn(['daily', 'weekly', 'monthly', 'as-needed'])
    .withMessage('Frequency must be daily, weekly, monthly, or as-needed'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters')
]

// Schedule update validation (same as create but all fields optional)
const updateScheduleValidation = [
  body('medication_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Medication name must be between 1 and 100 characters'),
  
  body('dosage')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Dosage must be between 1 and 50 characters'),
  
  body('time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format (24-hour)'),
  
  body('frequency')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'as-needed'])
    .withMessage('Frequency must be daily, weekly, monthly, or as-needed'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters')
]

// Query parameter validation for filtering schedules
const scheduleQueryValidation = [
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in ISO 8601 format (YYYY-MM-DD)'),
  
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be in ISO 8601 format (YYYY-MM-DD)'),
  
  query('frequency')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'as-needed'])
    .withMessage('Frequency filter must be daily, weekly, monthly, or as-needed'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
]

// Route parameter validation
const scheduleParamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Schedule ID must be a positive integer')
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
 * Format schedule data for response
 * Ensures consistent data format in API responses
 * @param {Object} schedule - Raw schedule data from database
 * @returns {Object} Formatted schedule object
 */
function formatScheduleResponse(schedule) {
  return {
    id: schedule.id,
    user_id: schedule.user_id,
    medication_name: schedule.medication_name,
    dosage: schedule.dosage,
    time: schedule.time,
    frequency: schedule.frequency,
    notes: schedule.notes,
    created_at: schedule.created_at,
    updated_at: schedule.updated_at
  }
}

/**
 * GET /api/schedules
 * Retrieve user's medication schedules with optional filtering
 * Supports date range filtering, frequency filtering, and pagination
 */
router.get('/', 
  authenticateToken,
  scheduleQueryValidation,
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const { start_date, end_date, frequency, limit = 50, offset = 0 } = req.query
    const userId = req.user.id
    
    // Build dynamic query based on filters
    let whereConditions = ['user_id = ?']
    let queryParams = [userId]
    
    // Add date range filter if provided
    if (start_date) {
      whereConditions.push('created_at >= ?')
      queryParams.push(start_date + ' 00:00:00')
    }
    
    if (end_date) {
      whereConditions.push('created_at <= ?')
      queryParams.push(end_date + ' 23:59:59')
    }
    
    // Add frequency filter if provided
    if (frequency) {
      whereConditions.push('frequency = ?')
      queryParams.push(frequency)
    }
    
    // Construct final query with pagination
    const whereClause = whereConditions.join(' AND ')
    const schedulesQuery = `
      SELECT * FROM schedules 
      WHERE ${whereClause}
      ORDER BY time ASC, medication_name ASC
      LIMIT ? OFFSET ?
    `
    queryParams.push(parseInt(limit), parseInt(offset))
    
    // Get total count for pagination metadata
    const countQuery = `
      SELECT COUNT(*) as total FROM schedules 
      WHERE ${whereClause}
    `
    const countParams = queryParams.slice(0, -2) // Remove limit and offset
    
    // Execute both queries
    const [schedules, countResult] = await Promise.all([
      dbQuery(schedulesQuery, queryParams),
      queryOne(countQuery, countParams)
    ])
    
    // Format response data
    const formattedSchedules = schedules.map(formatScheduleResponse)
    const total = countResult.total
    
    res.json({
      success: true,
      message: 'Schedules retrieved successfully',
      data: {
        schedules: formattedSchedules,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: (parseInt(offset) + formattedSchedules.length) < total
        },
        filters: {
          start_date,
          end_date,
          frequency
        }
      }
    })
  })
)

/**
 * GET /api/schedules/:id
 * Retrieve a specific medication schedule by ID
 * Requires schedule ownership or admin privileges
 */
router.get('/:id',
  authenticateToken,
  scheduleParamValidation,
  requireOwnership('schedule'),
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const scheduleId = req.params.id
    
    // Fetch schedule from database
    const schedule = await queryOne(
      'SELECT * FROM schedules WHERE id = ?',
      [scheduleId]
    )
    
    // Schedule existence is already verified by requireOwnership middleware
    res.json({
      success: true,
      message: 'Schedule retrieved successfully',
      data: formatScheduleResponse(schedule)
    })
  })
)

/**
 * POST /api/schedules
 * Create a new medication schedule
 * Associates schedule with authenticated user
 */
router.post('/',
  authenticateToken,
  createScheduleValidation,
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const { medication_name, dosage, time, frequency, notes } = req.body
    const userId = req.user.id
    
    // Insert new schedule into database
    const result = await execute(
      `INSERT INTO schedules (user_id, medication_name, dosage, time, frequency, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, medication_name, dosage, time, frequency, notes || null]
    )
    
    // Fetch the newly created schedule with all fields
    const newSchedule = await queryOne(
      'SELECT * FROM schedules WHERE id = ?',
      [result.lastID]
    )
    
    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      data: formatScheduleResponse(newSchedule)
    })
  })
)

/**
 * PUT /api/schedules/:id
 * Update an existing medication schedule
 * Requires schedule ownership or admin privileges
 * Supports partial updates (only provided fields are updated)
 */
router.put('/:id',
  authenticateToken,
  scheduleParamValidation,
  updateScheduleValidation,
  requireOwnership('schedule'),
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const scheduleId = req.params.id
    const updateFields = {}
    
    // Only include provided fields in update
    const allowedFields = ['medication_name', 'dosage', 'time', 'frequency', 'notes']
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field] === '' ? null : req.body[field]
      }
    })
    
    // Check if any fields to update
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields provided for update',
        data: null
      })
    }
    
    // Add updated timestamp
    updateFields.updated_at = new Date().toISOString()
    
    // Build dynamic update query
    const setClause = Object.keys(updateFields)
      .map(field => `${field} = ?`)
      .join(', ')
    
    const updateQuery = `UPDATE schedules SET ${setClause} WHERE id = ?`
    const updateParams = [...Object.values(updateFields), scheduleId]
    
    // Execute update
    await execute(updateQuery, updateParams)
    
    // Fetch updated schedule
    const updatedSchedule = await queryOne(
      'SELECT * FROM schedules WHERE id = ?',
      [scheduleId]
    )
    
    res.json({
      success: true,
      message: 'Schedule updated successfully',
      data: formatScheduleResponse(updatedSchedule)
    })
  })
)

/**
 * DELETE /api/schedules/:id
 * Delete a medication schedule
 * Requires schedule ownership or admin privileges
 * Also deletes associated adherence records (CASCADE)
 */
router.delete('/:id',
  authenticateToken,
  scheduleParamValidation,
  requireOwnership('schedule'),
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const scheduleId = req.params.id
    
    // Use transaction to ensure data consistency
    await beginTransaction()
    
    try {
      // Delete adherence records first (explicit deletion for logging)
      const adherenceDeleteResult = await execute(
        'DELETE FROM adherence_records WHERE schedule_id = ?',
        [scheduleId]
      )
      
      // Delete the schedule
      const scheduleDeleteResult = await execute(
        'DELETE FROM schedules WHERE id = ?',
        [scheduleId]
      )
      
      // Commit transaction
      await commitTransaction()
      
      res.json({
        success: true,
        message: 'Schedule deleted successfully',
        data: {
          deleted_schedule_id: parseInt(scheduleId),
          deleted_adherence_records: adherenceDeleteResult.changes
        }
      })
      
    } catch (error) {
      // Rollback transaction on error
      await rollbackTransaction()
      throw error
    }
  })
)

/**
 * POST /api/schedules/bulk
 * Create multiple medication schedules in bulk
 * Useful for importing schedules or setting up multiple medications
 */
router.post('/bulk',
  authenticateToken,
  body('schedules')
    .isArray({ min: 1, max: 10 })
    .withMessage('Schedules must be an array with 1-10 items'),
  body('schedules.*.medication_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each medication name must be between 1 and 100 characters'),
  body('schedules.*.dosage')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each dosage must be between 1 and 50 characters'),
  body('schedules.*.time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Each time must be in HH:MM format (24-hour)'),
  body('schedules.*.frequency')
    .isIn(['daily', 'weekly', 'monthly', 'as-needed'])
    .withMessage('Each frequency must be daily, weekly, monthly, or as-needed'),
  body('schedules.*.notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Each notes field must not exceed 500 characters'),
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const { schedules } = req.body
    const userId = req.user.id
    const createdSchedules = []
    
    // Use transaction for bulk creation
    await beginTransaction()
    
    try {
      // Create each schedule
      for (const schedule of schedules) {
        const { medication_name, dosage, time, frequency, notes } = schedule
        
        const result = await execute(
          `INSERT INTO schedules (user_id, medication_name, dosage, time, frequency, notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, medication_name, dosage, time, frequency, notes || null]
        )
        
        // Fetch the created schedule
        const newSchedule = await queryOne(
          'SELECT * FROM schedules WHERE id = ?',
          [result.lastID]
        )
        
        createdSchedules.push(formatScheduleResponse(newSchedule))
      }
      
      await commitTransaction()
      
      res.status(201).json({
        success: true,
        message: `${createdSchedules.length} schedules created successfully`,
        data: {
          schedules: createdSchedules,
          count: createdSchedules.length
        }
      })
      
    } catch (error) {
      await rollbackTransaction()
      throw error
    }
  })
)

/**
 * GET /api/schedules/today
 * Get today's medication schedules
 * Returns schedules that should be taken today based on frequency
 */
router.get('/today',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const today = new Date().toISOString().split('T')[0]
    
    // For this implementation, we'll return all daily schedules
    // In a more complex system, this would consider frequency patterns
    const todaySchedules = await dbQuery(
      `SELECT s.*, 
              ar.taken,
              ar.date as adherence_date
       FROM schedules s
       LEFT JOIN adherence_records ar ON s.id = ar.schedule_id AND ar.date = ?
       WHERE s.user_id = ? AND s.frequency = 'daily'
       ORDER BY s.time ASC`,
      [today, userId]
    )
    
    const formattedSchedules = todaySchedules.map(schedule => ({
      ...formatScheduleResponse(schedule),
      adherence_status: schedule.taken !== null ? schedule.taken : null,
      adherence_logged: schedule.adherence_date !== null
    }))
    
    res.json({
      success: true,
      message: "Today's schedules retrieved successfully",
      data: {
        schedules: formattedSchedules,
        date: today,
        total: formattedSchedules.length
      }
    })
  })
)

export default router