import express from 'express'
import { body, query, param, validationResult } from 'express-validator'
import { query as dbQuery, queryOne, execute } from '../models/database.js'
import { authenticateToken, requireOwnership } from '../middleware/auth.js'
import { asyncHandler, createValidationError } from '../middleware/errorHandler.js'

/**
 * Adherence Routes
 * Handles medication adherence tracking and logging
 * Provides endpoints for logging medication intake and retrieving adherence history
 */

const router = express.Router()

/**
 * Validation Rules
 * Express-validator rules for adherence data validation
 */

// Adherence logging validation
const logAdherenceValidation = [
  body('schedule_id')
    .isInt({ min: 1 })
    .withMessage('Schedule ID must be a positive integer'),
  
  body('date')
    .isISO8601()
    .withMessage('Date must be in ISO 8601 format (YYYY-MM-DD)')
    .custom((value) => {
      const date = new Date(value)
      const today = new Date()
      const maxPastDays = 30 // Allow logging up to 30 days in the past
      const minDate = new Date(today.getTime() - (maxPastDays * 24 * 60 * 60 * 1000))
      
      if (date > today) {
        throw new Error('Cannot log adherence for future dates')
      }
      if (date < minDate) {
        throw new Error(`Cannot log adherence more than ${maxPastDays} days in the past`)
      }
      return true
    }),
  
  body('taken')
    .isBoolean()
    .withMessage('Taken status must be true or false'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters')
]

// Adherence history query validation
const adherenceQueryValidation = [
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in ISO 8601 format (YYYY-MM-DD)'),
  
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be in ISO 8601 format (YYYY-MM-DD)')
    .custom((endDate, { req }) => {
      if (req.query.start_date && endDate) {
        const start = new Date(req.query.start_date)
        const end = new Date(endDate)
        if (end < start) {
          throw new Error('End date must be after start date')
        }
      }
      return true
    }),
  
  query('schedule_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Schedule ID must be a positive integer'),
  
  query('taken')
    .optional()
    .isBoolean()
    .withMessage('Taken filter must be true or false'),
  
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
const adherenceParamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Adherence record ID must be a positive integer')
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
 * Format adherence data for response
 * @param {Object} adherence - Raw adherence data from database
 * @returns {Object} Formatted adherence object
 */
function formatAdherenceResponse(adherence) {
  return {
    id: adherence.id,
    schedule_id: adherence.schedule_id,
    date: adherence.date,
    taken: adherence.taken,
    notes: adherence.notes,
    created_at: adherence.created_at,
    // Include schedule information if joined
    ...(adherence.medication_name && {
      schedule: {
        medication_name: adherence.medication_name,
        dosage: adherence.dosage,
        time: adherence.time,
        frequency: adherence.frequency
      }
    })
  }
}

/**
 * Verify user owns the schedule associated with adherence record
 * @param {number} scheduleId - Schedule ID to verify
 * @param {number} userId - User ID to check ownership
 * @returns {Promise<boolean>} True if user owns the schedule
 */
async function verifyScheduleOwnership(scheduleId, userId) {
  const schedule = await queryOne(
    'SELECT user_id FROM schedules WHERE id = ?',
    [scheduleId]
  )
  
  return schedule && schedule.user_id === userId
}

/**
 * POST /api/adherence
 * Log medication adherence (taken/not taken)
 * Creates or updates adherence record for a specific date and schedule
 */
router.post('/',
  authenticateToken,
  logAdherenceValidation,
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const { schedule_id, date, taken, notes } = req.body
    const userId = req.user.id
    
    // Verify user owns the schedule
    const ownsSchedule = await verifyScheduleOwnership(schedule_id, userId)
    if (!ownsSchedule) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - you can only log adherence for your own schedules',
        data: null
      })
    }
    
    // Check if adherence record already exists for this date and schedule
    const existingRecord = await queryOne(
      'SELECT id FROM adherence_records WHERE schedule_id = ? AND date = ?',
      [schedule_id, date]
    )
    
    let adherenceRecord
    
    if (existingRecord) {
      // Update existing record
      await execute(
        'UPDATE adherence_records SET taken = ?, notes = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?',
        [taken, notes || null, existingRecord.id]
      )
      
      // Fetch updated record with schedule info
      adherenceRecord = await queryOne(
        `SELECT ar.*, s.medication_name, s.dosage, s.time, s.frequency
         FROM adherence_records ar
         JOIN schedules s ON ar.schedule_id = s.id
         WHERE ar.id = ?`,
        [existingRecord.id]
      )
      
      res.json({
        success: true,
        message: 'Adherence record updated successfully',
        data: formatAdherenceResponse(adherenceRecord)
      })
    } else {
      // Create new record
      const result = await execute(
        'INSERT INTO adherence_records (schedule_id, date, taken, notes) VALUES (?, ?, ?, ?)',
        [schedule_id, date, taken, notes || null]
      )
      
      // Fetch created record with schedule info
      adherenceRecord = await queryOne(
        `SELECT ar.*, s.medication_name, s.dosage, s.time, s.frequency
         FROM adherence_records ar
         JOIN schedules s ON ar.schedule_id = s.id
         WHERE ar.id = ?`,
        [result.lastID]
      )
      
      res.status(201).json({
        success: true,
        message: 'Adherence record logged successfully',
        data: formatAdherenceResponse(adherenceRecord)
      })
    }
  })
)

/**
 * GET /api/adherence
 * Retrieve adherence history with filtering options
 * Supports date range, schedule, and taken status filtering
 */
router.get('/',
  authenticateToken,
  adherenceQueryValidation,
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const { start_date, end_date, schedule_id, taken, limit = 50, offset = 0 } = req.query
    const userId = req.user.id
    
    // Build dynamic query with user's schedules only
    let whereConditions = ['s.user_id = ?']
    let queryParams = [userId]
    
    // Add date range filters
    if (start_date) {
      whereConditions.push('ar.date >= ?')
      queryParams.push(start_date)
    }
    
    if (end_date) {
      whereConditions.push('ar.date <= ?')
      queryParams.push(end_date)
    }
    
    // Add schedule filter
    if (schedule_id) {
      // Verify user owns this schedule
      const ownsSchedule = await verifyScheduleOwnership(schedule_id, userId)
      if (!ownsSchedule) {
        return res.status(403).json({
          success: false,
          error: 'Access denied - invalid schedule ID',
          data: null
        })
      }
      
      whereConditions.push('ar.schedule_id = ?')
      queryParams.push(schedule_id)
    }
    
    // Add taken status filter
    if (taken !== undefined) {
      whereConditions.push('ar.taken = ?')
      queryParams.push(taken === 'true')
    }
    
    // Construct query
    const whereClause = whereConditions.join(' AND ')
    const adherenceQuery = `
      SELECT ar.*, s.medication_name, s.dosage, s.time, s.frequency
      FROM adherence_records ar
      JOIN schedules s ON ar.schedule_id = s.id
      WHERE ${whereClause}
      ORDER BY ar.date DESC, s.time ASC
      LIMIT ? OFFSET ?
    `
    queryParams.push(parseInt(limit), parseInt(offset))
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM adherence_records ar
      JOIN schedules s ON ar.schedule_id = s.id
      WHERE ${whereClause}
    `
    const countParams = queryParams.slice(0, -2) // Remove limit and offset
    
    // Execute queries
    const [adherenceRecords, countResult] = await Promise.all([
      dbQuery(adherenceQuery, queryParams),
      queryOne(countQuery, countParams)
    ])
    
    // Format response
    const formattedRecords = adherenceRecords.map(formatAdherenceResponse)
    const total = countResult.total
    
    res.json({
      success: true,
      message: 'Adherence records retrieved successfully',
      data: {
        records: formattedRecords,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: (parseInt(offset) + formattedRecords.length) < total
        },
        filters: {
          start_date,
          end_date,
          schedule_id: schedule_id ? parseInt(schedule_id) : null,
          taken: taken !== undefined ? taken === 'true' : null
        }
      }
    })
  })
)

/**
 * GET /api/adherence/:id
 * Retrieve a specific adherence record by ID
 * Requires record ownership (via schedule ownership)
 */
router.get('/:id',
  authenticateToken,
  adherenceParamValidation,
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const adherenceId = req.params.id
    const userId = req.user.id
    
    // Fetch adherence record with schedule info and ownership check
    const adherenceRecord = await queryOne(
      `SELECT ar.*, s.medication_name, s.dosage, s.time, s.frequency, s.user_id
       FROM adherence_records ar
       JOIN schedules s ON ar.schedule_id = s.id
       WHERE ar.id = ?`,
      [adherenceId]
    )
    
    if (!adherenceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Adherence record not found',
        data: null
      })
    }
    
    // Check ownership
    if (adherenceRecord.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - insufficient permissions',
        data: null
      })
    }
    
    res.json({
      success: true,
      message: 'Adherence record retrieved successfully',
      data: formatAdherenceResponse(adherenceRecord)
    })
  })
)

/**
 * PUT /api/adherence/:id
 * Update an existing adherence record
 * Allows updating taken status and notes
 */
router.put('/:id',
  authenticateToken,
  adherenceParamValidation,
  body('taken').optional().isBoolean().withMessage('Taken status must be true or false'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters'),
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const adherenceId = req.params.id
    const userId = req.user.id
    const { taken, notes } = req.body
    
    // Verify record exists and user owns it
    const existingRecord = await queryOne(
      `SELECT ar.*, s.user_id
       FROM adherence_records ar
       JOIN schedules s ON ar.schedule_id = s.id
       WHERE ar.id = ?`,
      [adherenceId]
    )
    
    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        error: 'Adherence record not found',
        data: null
      })
    }
    
    if (existingRecord.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - insufficient permissions',
        data: null
      })
    }
    
    // Build update query with only provided fields
    const updateFields = {}
    if (taken !== undefined) updateFields.taken = taken
    if (notes !== undefined) updateFields.notes = notes || null
    
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields provided for update',
        data: null
      })
    }
    
    // Update record
    const setClause = Object.keys(updateFields).map(field => `${field} = ?`).join(', ')
    const updateQuery = `UPDATE adherence_records SET ${setClause}, created_at = CURRENT_TIMESTAMP WHERE id = ?`
    const updateParams = [...Object.values(updateFields), adherenceId]
    
    await execute(updateQuery, updateParams)
    
    // Fetch updated record with schedule info
    const updatedRecord = await queryOne(
      `SELECT ar.*, s.medication_name, s.dosage, s.time, s.frequency
       FROM adherence_records ar
       JOIN schedules s ON ar.schedule_id = s.id
       WHERE ar.id = ?`,
      [adherenceId]
    )
    
    res.json({
      success: true,
      message: 'Adherence record updated successfully',
      data: formatAdherenceResponse(updatedRecord)
    })
  })
)

/**
 * DELETE /api/adherence/:id
 * Delete an adherence record
 * Requires record ownership (via schedule ownership)
 */
router.delete('/:id',
  authenticateToken,
  adherenceParamValidation,
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const adherenceId = req.params.id
    const userId = req.user.id
    
    // Verify record exists and user owns it
    const existingRecord = await queryOne(
      `SELECT ar.*, s.user_id
       FROM adherence_records ar
       JOIN schedules s ON ar.schedule_id = s.id
       WHERE ar.id = ?`,
      [adherenceId]
    )
    
    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        error: 'Adherence record not found',
        data: null
      })
    }
    
    if (existingRecord.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - insufficient permissions',
        data: null
      })
    }
    
    // Delete record
    await execute('DELETE FROM adherence_records WHERE id = ?', [adherenceId])
    
    res.json({
      success: true,
      message: 'Adherence record deleted successfully',
      data: {
        deleted_record_id: parseInt(adherenceId)
      }
    })
  })
)

/**
 * GET /api/adherence/schedule/:scheduleId/streak
 * Get adherence streak for a specific schedule
 * Returns current streak, longest streak, and recent adherence pattern
 */
router.get('/schedule/:scheduleId/streak',
  authenticateToken,
  param('scheduleId').isInt({ min: 1 }).withMessage('Schedule ID must be a positive integer'),
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const scheduleId = req.params.scheduleId
    const userId = req.user.id
    
    // Verify schedule ownership
    const ownsSchedule = await verifyScheduleOwnership(scheduleId, userId)
    if (!ownsSchedule) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - invalid schedule ID',
        data: null
      })
    }
    
    // Get adherence records for the last 30 days, ordered by date
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]
    
    const adherenceRecords = await dbQuery(
      `SELECT date, taken FROM adherence_records 
       WHERE schedule_id = ? AND date >= ?
       ORDER BY date DESC`,
      [scheduleId, thirtyDaysAgo]
    )
    
    // Calculate streaks
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    
    // Process records from most recent to oldest
    for (let i = 0; i < adherenceRecords.length; i++) {
      const record = adherenceRecords[i]
      
      if (record.taken) {
        tempStreak++
        if (i === 0) currentStreak = tempStreak // Current streak only counts from today
        longestStreak = Math.max(longestStreak, tempStreak)
      } else {
        if (i === 0) currentStreak = 0 // Break current streak if today was missed
        tempStreak = 0
      }
    }
    
    // Calculate adherence rate for the period
    const totalRecords = adherenceRecords.length
    const takenRecords = adherenceRecords.filter(r => r.taken).length
    const adherenceRate = totalRecords > 0 ? Math.round((takenRecords / totalRecords) * 100) : 0
    
    res.json({
      success: true,
      message: 'Adherence streak calculated successfully',
      data: {
        schedule_id: parseInt(scheduleId),
        current_streak: currentStreak,
        longest_streak: longestStreak,
        adherence_rate: adherenceRate,
        period_days: 30,
        total_records: totalRecords,
        taken_records: takenRecords,
        missed_records: totalRecords - takenRecords
      }
    })
  })
)

export default router