import express from 'express'
import { query, param, validationResult } from 'express-validator'
import { query as dbQuery, queryOne } from '../models/database.js'
import { authenticateToken } from '../middleware/auth.js'
import { asyncHandler, createValidationError } from '../middleware/errorHandler.js'

/**
 * Analytics Routes
 * Provides comprehensive medication adherence analytics and reporting
 * Generates data for charts, statistics, and insights
 */

const router = express.Router()

/**
 * Validation Rules
 * Express-validator rules for analytics query parameters
 */

// Analytics query validation
const analyticsQueryValidation = [
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in ISO 8601 format (YYYY-MM-DD)')
    .custom((value) => {
      const date = new Date(value)
      const maxPastDays = 365 // Limit to 1 year of data
      const minDate = new Date(Date.now() - (maxPastDays * 24 * 60 * 60 * 1000))
      
      if (date < minDate) {
        throw new Error(`Start date cannot be more than ${maxPastDays} days in the past`)
      }
      return true
    }),
  
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be in ISO 8601 format (YYYY-MM-DD)')
    .custom((endDate, { req }) => {
      if (req.query.start_date && endDate) {
        const start = new Date(req.query.start_date)
        const end = new Date(endDate)
        const today = new Date()
        
        if (end < start) {
          throw new Error('End date must be after start date')
        }
        if (end > today) {
          throw new Error('End date cannot be in the future')
        }
        
        // Limit date range to prevent performance issues
        const daysDiff = (end - start) / (1000 * 60 * 60 * 24)
        if (daysDiff > 365) {
          throw new Error('Date range cannot exceed 365 days')
        }
      }
      return true
    }),
  
  query('medication_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Medication ID must be a positive integer'),
  
  query('group_by')
    .optional()
    .isIn(['day', 'week', 'month'])
    .withMessage('Group by must be day, week, or month')
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
 * Get default date range (last 30 days)
 * @returns {Object} Object with start_date and end_date
 */
function getDefaultDateRange() {
  const end_date = new Date().toISOString().split('T')[0]
  const start_date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]
  
  return { start_date, end_date }
}

/**
 * Verify user owns the medication/schedule
 * @param {number} medicationId - Schedule ID to verify
 * @param {number} userId - User ID to check ownership
 * @returns {Promise<boolean>} True if user owns the schedule
 */
async function verifyMedicationOwnership(medicationId, userId) {
  const schedule = await queryOne(
    'SELECT user_id FROM schedules WHERE id = ?',
    [medicationId]
  )
  
  return schedule && schedule.user_id === userId
}

/**
 * GET /api/analytics
 * Get comprehensive adherence analytics
 * Returns overall stats, trends, and breakdown by medication
 */
router.get('/',
  authenticateToken,
  analyticsQueryValidation,
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const userId = req.user.id
    const { medication_id, group_by = 'day' } = req.query
    
    // Use provided date range or default to last 30 days
    const { start_date, end_date } = req.query.start_date && req.query.end_date
      ? req.query
      : getDefaultDateRange()
    
    // Verify medication ownership if specific medication requested
    if (medication_id) {
      const ownsSchedule = await verifyMedicationOwnership(medication_id, userId)
      if (!ownsSchedule) {
        return res.status(403).json({
          success: false,
          error: 'Access denied - invalid medication ID',
          data: null
        })
      }
    }
    
    // Build base query conditions
    let whereConditions = ['s.user_id = ?', 'ar.date >= ?', 'ar.date <= ?']
    let queryParams = [userId, start_date, end_date]
    
    if (medication_id) {
      whereConditions.push('s.id = ?')
      queryParams.push(medication_id)
    }
    
    const whereClause = whereConditions.join(' AND ')
    
    // Get overall statistics
    const overallStats = await queryOne(`
      SELECT 
        COUNT(*) as total_records,
        SUM(CASE WHEN ar.taken = 1 THEN 1 ELSE 0 END) as taken_count,
        SUM(CASE WHEN ar.taken = 0 THEN 1 ELSE 0 END) as missed_count,
        ROUND(
          (SUM(CASE WHEN ar.taken = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 
          2
        ) as adherence_rate
      FROM adherence_records ar
      JOIN schedules s ON ar.schedule_id = s.id
      WHERE ${whereClause}
    `, queryParams)
    
    // Get adherence by medication
    const adherenceByMedication = await dbQuery(`
      SELECT 
        s.id as schedule_id,
        s.medication_name,
        s.dosage,
        s.frequency,
        COUNT(*) as total_records,
        SUM(CASE WHEN ar.taken = 1 THEN 1 ELSE 0 END) as taken_count,
        SUM(CASE WHEN ar.taken = 0 THEN 1 ELSE 0 END) as missed_count,
        ROUND(
          (SUM(CASE WHEN ar.taken = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 
          2
        ) as adherence_rate
      FROM adherence_records ar
      JOIN schedules s ON ar.schedule_id = s.id
      WHERE ${whereClause}
      GROUP BY s.id, s.medication_name, s.dosage, s.frequency
      ORDER BY adherence_rate DESC
    `, queryParams)
    
    // Get daily adherence trend
    const dailyTrend = await dbQuery(`
      SELECT 
        ar.date,
        COUNT(*) as total_doses,
        SUM(CASE WHEN ar.taken = 1 THEN 1 ELSE 0 END) as taken_doses,
        SUM(CASE WHEN ar.taken = 0 THEN 1 ELSE 0 END) as missed_doses,
        ROUND(
          (SUM(CASE WHEN ar.taken = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 
          2
        ) as daily_adherence_rate
      FROM adherence_records ar
      JOIN schedules s ON ar.schedule_id = s.id
      WHERE ${whereClause}
      GROUP BY ar.date
      ORDER BY ar.date
    `, queryParams)
    
    // Get adherence by time of day (hour analysis)
    const timeAnalysis = await dbQuery(`
      SELECT 
        s.time,
        COUNT(*) as total_records,
        SUM(CASE WHEN ar.taken = 1 THEN 1 ELSE 0 END) as taken_count,
        ROUND(
          (SUM(CASE WHEN ar.taken = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 
          2
        ) as adherence_rate
      FROM adherence_records ar
      JOIN schedules s ON ar.schedule_id = s.id
      WHERE ${whereClause}
      GROUP BY s.time
      ORDER BY s.time
    `, queryParams)
    
    // Get adherence by day of week
    const dayOfWeekAnalysis = await dbQuery(`
      SELECT 
        CASE 
          WHEN strftime('%w', ar.date) = '0' THEN 'Sunday'
          WHEN strftime('%w', ar.date) = '1' THEN 'Monday'
          WHEN strftime('%w', ar.date) = '2' THEN 'Tuesday'
          WHEN strftime('%w', ar.date) = '3' THEN 'Wednesday'
          WHEN strftime('%w', ar.date) = '4' THEN 'Thursday'
          WHEN strftime('%w', ar.date) = '5' THEN 'Friday'
          WHEN strftime('%w', ar.date) = '6' THEN 'Saturday'
        END as day_of_week,
        COUNT(*) as total_records,
        SUM(CASE WHEN ar.taken = 1 THEN 1 ELSE 0 END) as taken_count,
        ROUND(
          (SUM(CASE WHEN ar.taken = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 
          2
        ) as adherence_rate
      FROM adherence_records ar
      JOIN schedules s ON ar.schedule_id = s.id
      WHERE ${whereClause}
      GROUP BY strftime('%w', ar.date)
      ORDER BY strftime('%w', ar.date)
    `, queryParams)
    
    // Calculate insights and recommendations
    const insights = generateInsights(overallStats, adherenceByMedication, timeAnalysis, dayOfWeekAnalysis)
    
    res.json({
      success: true,
      message: 'Analytics retrieved successfully',
      data: {
        period: {
          start_date,
          end_date,
          days_included: Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)) + 1
        },
        overall_stats: {
          total_records: overallStats.total_records || 0,
          taken_count: overallStats.taken_count || 0,
          missed_count: overallStats.missed_count || 0,
          adherence_rate: overallStats.adherence_rate || 0
        },
        adherence_by_medication: adherenceByMedication,
        daily_trend: dailyTrend,
        time_analysis: timeAnalysis,
        day_of_week_analysis: dayOfWeekAnalysis,
        insights,
        filters: {
          medication_id: medication_id ? parseInt(medication_id) : null,
          group_by
        }
      }
    })
  })
)

/**
 * GET /api/analytics/streak
 * Get adherence streak information
 * Returns current streak, longest streak, and streak history
 */
router.get('/streak',
  authenticateToken,
  query('medication_id').optional().isInt({ min: 1 }).withMessage('Medication ID must be a positive integer'),
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const userId = req.user.id
    const { medication_id } = req.query
    
    // Verify medication ownership if specific medication requested
    if (medication_id) {
      const ownsSchedule = await verifyMedicationOwnership(medication_id, userId)
      if (!ownsSchedule) {
        return res.status(403).json({
          success: false,
          error: 'Access denied - invalid medication ID',
          data: null
        })
      }
    }
    
    // Build query conditions
    let whereConditions = ['s.user_id = ?']
    let queryParams = [userId]
    
    if (medication_id) {
      whereConditions.push('s.id = ?')
      queryParams.push(medication_id)
    }
    
    const whereClause = whereConditions.join(' AND ')
    
    // Get adherence records for the last 90 days, ordered by date
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]
    
    const adherenceRecords = await dbQuery(`
      SELECT ar.date, ar.taken, s.medication_name
      FROM adherence_records ar
      JOIN schedules s ON ar.schedule_id = s.id
      WHERE ${whereClause} AND ar.date >= ?
      ORDER BY ar.date DESC
    `, [...queryParams, ninetyDaysAgo])
    
    // Calculate streaks
    const streakData = calculateStreaks(adherenceRecords)
    
    res.json({
      success: true,
      message: 'Streak data retrieved successfully',
      data: {
        ...streakData,
        period_days: 90,
        medication_id: medication_id ? parseInt(medication_id) : null
      }
    })
  })
)

/**
 * GET /api/analytics/export/:chart_type
 * Export chart data (placeholder for future implementation)
 * Returns base64 encoded chart image
 */
router.get('/export/:chart_type',
  authenticateToken,
  param('chart_type').isIn(['stacked-bar', 'line', 'pie']).withMessage('Chart type must be stacked-bar, line, or pie'),
  analyticsQueryValidation,
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const { chart_type } = req.params
    const userId = req.user.id
    
    // For now, return a placeholder response
    // In a full implementation, this would generate actual chart images
    res.json({
      success: true,
      message: `${chart_type} chart export prepared`,
      data: {
        chart_type,
        export_format: 'png',
        base64_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        note: 'This is a placeholder implementation. In production, this would generate actual chart images.'
      }
    })
  })
)

/**
 * Helper Functions for Analytics Processing
 */

/**
 * Calculate streak information from adherence records
 * @param {Array} records - Adherence records sorted by date (newest first)
 * @returns {Object} Streak statistics
 */
function calculateStreaks(records) {
  if (records.length === 0) {
    return {
      current_streak: 0,
      longest_streak: 0,
      total_records: 0,
      streak_history: []
    }
  }
  
  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0
  const streakHistory = []
  
  // Group records by date to handle multiple medications per day
  const recordsByDate = {}
  records.forEach(record => {
    if (!recordsByDate[record.date]) {
      recordsByDate[record.date] = []
    }
    recordsByDate[record.date].push(record)
  })
  
  // Process dates in chronological order (newest first)
  const sortedDates = Object.keys(recordsByDate).sort().reverse()
  
  for (let i = 0; i < sortedDates.length; i++) {
    const date = sortedDates[i]
    const dayRecords = recordsByDate[date]
    
    // Consider day successful if all medications were taken
    const allTaken = dayRecords.every(record => record.taken)
    
    if (allTaken) {
      tempStreak++
      if (i === 0) currentStreak = tempStreak // Current streak only counts from today
      longestStreak = Math.max(longestStreak, tempStreak)
    } else {
      if (tempStreak > 0) {
        streakHistory.push({
          length: tempStreak,
          end_date: sortedDates[i - 1]
        })
      }
      if (i === 0) currentStreak = 0 // Break current streak if today was missed
      tempStreak = 0
    }
  }
  
  // Add final streak to history if it exists
  if (tempStreak > 0) {
    streakHistory.push({
      length: tempStreak,
      end_date: sortedDates[sortedDates.length - 1]
    })
  }
  
  return {
    current_streak: currentStreak,
    longest_streak: longestStreak,
    total_records: records.length,
    streak_history: streakHistory.sort((a, b) => b.length - a.length).slice(0, 5) // Top 5 streaks
  }
}

/**
 * Generate insights and recommendations based on analytics data
 * @param {Object} overallStats - Overall adherence statistics
 * @param {Array} medicationStats - Per-medication statistics
 * @param {Array} timeAnalysis - Time-based analysis
 * @param {Array} dayAnalysis - Day of week analysis
 * @returns {Object} Insights and recommendations
 */
function generateInsights(overallStats, medicationStats, timeAnalysis, dayAnalysis) {
  const insights = {
    performance_insights: [],
    recommendations: [],
    patterns: []
  }
  
  // Overall performance insights
  const adherenceRate = overallStats.adherence_rate || 0
  if (adherenceRate >= 90) {
    insights.performance_insights.push({
      type: 'excellent',
      message: `Excellent adherence rate of ${adherenceRate}%! Keep up the great work.`
    })
  } else if (adherenceRate >= 80) {
    insights.performance_insights.push({
      type: 'good',
      message: `Good adherence rate of ${adherenceRate}%. Small improvements could make a big difference.`
    })
  } else if (adherenceRate >= 60) {
    insights.performance_insights.push({
      type: 'moderate',
      message: `Moderate adherence rate of ${adherenceRate}%. There's room for improvement.`
    })
  } else {
    insights.performance_insights.push({
      type: 'needs_improvement',
      message: `Adherence rate of ${adherenceRate}% needs attention. Consider setting up more reminders.`
    })
  }
  
  // Best and worst performing medications
  if (medicationStats.length > 1) {
    const best = medicationStats[0]
    const worst = medicationStats[medicationStats.length - 1]
    
    if (best.adherence_rate > worst.adherence_rate + 10) {
      insights.patterns.push({
        type: 'medication_variance',
        message: `${best.medication_name} has the highest adherence (${best.adherence_rate}%) while ${worst.medication_name} has the lowest (${worst.adherence_rate}%).`
      })
      
      insights.recommendations.push({
        type: 'focus_improvement',
        message: `Focus on improving adherence for ${worst.medication_name}. Consider adjusting the timing or setting additional reminders.`
      })
    }
  }
  
  // Time-based patterns
  if (timeAnalysis.length > 1) {
    const bestTime = timeAnalysis.reduce((max, current) => 
      current.adherence_rate > max.adherence_rate ? current : max
    )
    const worstTime = timeAnalysis.reduce((min, current) => 
      current.adherence_rate < min.adherence_rate ? current : min
    )
    
    if (bestTime.adherence_rate > worstTime.adherence_rate + 15) {
      insights.patterns.push({
        type: 'time_pattern',
        message: `Best adherence at ${bestTime.time} (${bestTime.adherence_rate}%), lowest at ${worstTime.time} (${worstTime.adherence_rate}%).`
      })
      
      insights.recommendations.push({
        type: 'timing_adjustment',
        message: `Consider moving medications scheduled for ${worstTime.time} to times when you have better adherence.`
      })
    }
  }
  
  // Day of week patterns
  if (dayAnalysis.length > 0) {
    const weekdays = dayAnalysis.filter(day => 
      !['Saturday', 'Sunday'].includes(day.day_of_week)
    )
    const weekends = dayAnalysis.filter(day => 
      ['Saturday', 'Sunday'].includes(day.day_of_week)
    )
    
    if (weekdays.length > 0 && weekends.length > 0) {
      const weekdayAvg = weekdays.reduce((sum, day) => sum + day.adherence_rate, 0) / weekdays.length
      const weekendAvg = weekends.reduce((sum, day) => sum + day.adherence_rate, 0) / weekends.length
      
      if (Math.abs(weekdayAvg - weekendAvg) > 10) {
        const better = weekdayAvg > weekendAvg ? 'weekdays' : 'weekends'
        const worse = weekdayAvg > weekendAvg ? 'weekends' : 'weekdays'
        
        insights.patterns.push({
          type: 'weekly_pattern',
          message: `Adherence is better on ${better} (${Math.round(weekdayAvg > weekendAvg ? weekdayAvg : weekendAvg)}%) than on ${worse} (${Math.round(weekdayAvg > weekendAvg ? weekendAvg : weekdayAvg)}%).`
        })
        
        insights.recommendations.push({
          type: 'weekly_focus',
          message: `Set up special reminders or routines for ${worse} to improve consistency.`
        })
      }
    }
  }
  
  return insights
}

export default router