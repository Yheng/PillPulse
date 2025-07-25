import express from 'express'
import { body } from 'express-validator'
import { authenticateToken } from '../middleware/auth.js'
import { asyncHandler, createValidationError } from '../middleware/errorHandler.js'
import { validationResult } from 'express-validator'
import { queryOne, query as queryAll } from '../models/database.js'
import { 
  generatePersonalizedReminder, 
  generateAIInsights, 
  generateCoachingMessage,
  generateMedicationEducation,
  hasOpenAIKey 
} from '../utils/openaiService.js'

/**
 * AI Routes for PillPulse
 * Provides AI-powered features including personalized reminders, insights, and coaching
 * All routes require authentication and most require OpenAI API key
 */

const router = express.Router()

/**
 * Helper function to check validation results
 * @param {Request} req - Express request object
 */
const checkValidation = (req) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    throw createValidationError(errors.array())
  }
}

/**
 * GET /api/ai/status
 * Check if user has AI features enabled (has API key)
 */
router.get('/status', 
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const hasKey = await hasOpenAIKey(userId)
    
    res.json({
      success: true,
      message: hasKey ? 'AI features available' : 'No OpenAI API key configured',
      data: {
        ai_enabled: hasKey,
        features_available: hasKey ? [
          'personalized_reminders',
          'ai_insights',
          'coaching_messages',
          'medication_education'
        ] : []
      }
    })
  })
)

/**
 * POST /api/ai/reminder
 * Generate personalized reminder for a specific medication
 */
router.post('/reminder',
  authenticateToken,
  [
    body('schedule_id')
      .isInt({ min: 1 })
      .withMessage('Valid schedule ID is required'),
    body('options')
      .optional()
      .isObject()
      .withMessage('Options must be an object')
  ],
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const userId = req.user.id
    const { schedule_id, options = {} } = req.body
    
    // Verify schedule belongs to user
    const schedule = await queryOne(`
      SELECT * FROM schedules 
      WHERE id = ? AND user_id = ?
    `, [schedule_id, userId])
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found or access denied'
      })
    }
    
    // Generate personalized reminder
    const reminder = await generatePersonalizedReminder(userId, schedule, options)
    
    res.json({
      success: true,
      message: 'Personalized reminder generated',
      data: {
        reminder,
        medication: schedule.medication_name,
        dosage: schedule.dosage,
        scheduled_time: schedule.time,
        ai_generated: await hasOpenAIKey(userId)
      }
    })
  })
)

/**
 * GET /api/ai/insights
 * Get AI-powered insights about user's medication adherence
 */
router.get('/insights',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    
    // Generate AI insights
    const aiInsights = await generateAIInsights(userId)
    
    res.json({
      success: true,
      message: 'AI insights generated successfully',
      data: {
        ...aiInsights,
        ai_generated: await hasOpenAIKey(userId),
        generated_at: new Date().toISOString()
      }
    })
  })
)

/**
 * POST /api/ai/coaching
 * Generate personalized coaching message
 */
router.post('/coaching',
  authenticateToken,
  [
    body('type')
      .isIn(['motivation', 'missed_dose', 'timing', 'streak', 'improvement'])
      .withMessage('Valid coaching type is required'),
    body('context')
      .optional()
      .isObject()
      .withMessage('Context must be an object')
  ],
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const userId = req.user.id
    const { type, context = {} } = req.body
    
    // Generate coaching message
    const message = await generateCoachingMessage(userId, type, context)
    
    res.json({
      success: true,
      message: 'Coaching message generated',
      data: {
        coaching_message: message,
        type,
        ai_generated: await hasOpenAIKey(userId),
        generated_at: new Date().toISOString()
      }
    })
  })
)

/**
 * POST /api/ai/education
 * Get educational content about a medication
 */
router.post('/education',
  authenticateToken,
  [
    body('medication_name')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Medication name is required'),
    body('type')
      .optional()
      .isIn(['general', 'timing', 'benefits', 'side_effects'])
      .withMessage('Invalid education type')
  ],
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const { medication_name, type = 'general' } = req.body
    
    // Generate educational content
    const education = await generateMedicationEducation(medication_name, type)
    
    res.json({
      success: true,
      message: 'Educational content generated',
      data: {
        medication: medication_name,
        education_type: type,
        content: education,
        generated_at: new Date().toISOString()
      }
    })
  })
)

/**
 * GET /api/ai/daily-summary
 * Get AI-generated daily medication summary and coaching
 */
router.get('/daily-summary',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id
    const today = new Date().toISOString().split('T')[0]
    
    // Get today's schedules and adherence
    const todaySchedules = await queryAll(`
      SELECT s.*, ar.taken, ar.actual_time, ar.notes
      FROM schedules s
      LEFT JOIN adherence_records ar ON s.id = ar.schedule_id AND ar.date = ?
      WHERE s.user_id = ?
      ORDER BY s.time
    `, [today, userId])
    
    const totalDoses = todaySchedules.length
    const takenDoses = todaySchedules.filter(s => s.taken).length
    const todayAdherence = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0
    
    // Generate coaching based on today's performance
    let coachingType = 'motivation'
    let coachingContext = {}
    
    if (todayAdherence === 100) {
      coachingType = 'streak'
      coachingContext = { streakDays: 1 }
    } else if (todayAdherence >= 80) {
      coachingType = 'motivation'
    } else if (todayAdherence < 50 && totalDoses > 0) {
      coachingType = 'missed_dose'
      const missedMeds = todaySchedules.filter(s => !s.taken).map(s => s.medication_name)
      coachingContext = { medicationName: missedMeds[0] }
    }
    
    const coaching = await generateCoachingMessage(userId, coachingType, coachingContext)
    
    // Get upcoming doses for today
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    })
    
    const upcomingDoses = todaySchedules.filter(s => 
      !s.taken && s.time > currentTime
    )
    
    res.json({
      success: true,
      message: 'Daily summary generated',
      data: {
        date: today,
        summary: {
          total_doses: totalDoses,
          taken_doses: takenDoses,
          adherence_rate: todayAdherence,
          upcoming_doses: upcomingDoses.length
        },
        coaching_message: coaching,
        upcoming_medications: upcomingDoses.map(s => ({
          medication: s.medication_name,
          dosage: s.dosage,
          time: s.time
        })),
        ai_generated: await hasOpenAIKey(userId),
        generated_at: new Date().toISOString()
      }
    })
  })
)

/**
 * POST /api/ai/smart-reminder
 * Generate context-aware reminder based on user's current situation
 */
router.post('/smart-reminder',
  authenticateToken,
  [
    body('schedule_id')
      .isInt({ min: 1 })
      .withMessage('Valid schedule ID is required'),
    body('delay_minutes')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Delay must be a positive number'),
    body('user_status')
      .optional()
      .isIn(['busy', 'traveling', 'sick', 'normal'])
      .withMessage('Invalid user status')
  ],
  asyncHandler(async (req, res) => {
    checkValidation(req)
    
    const userId = req.user.id
    const { schedule_id, delay_minutes = 0, user_status = 'normal' } = req.body
    
    // Get schedule details
    const schedule = await queryOne(`
      SELECT * FROM schedules 
      WHERE id = ? AND user_id = ?
    `, [schedule_id, userId])
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      })
    }
    
    // Check if this is a missed dose
    const scheduledTime = new Date(`${new Date().toDateString()} ${schedule.time}`)
    const currentTime = new Date()
    const isMissed = currentTime > scheduledTime
    
    // Generate smart reminder with context
    const options = {
      isMissed,
      delayMinutes: delay_minutes,
      userStatus: user_status,
      isEarly: currentTime < scheduledTime
    }
    
    const reminder = await generatePersonalizedReminder(userId, schedule, options)
    
    res.json({
      success: true,
      message: 'Smart reminder generated',
      data: {
        reminder,
        medication: schedule.medication_name,
        dosage: schedule.dosage,
        scheduled_time: schedule.time,
        current_time: currentTime.toLocaleTimeString(),
        status: isMissed ? 'missed' : delay_minutes > 0 ? 'delayed' : 'on_time',
        delay_minutes,
        user_status,
        ai_generated: await hasOpenAIKey(userId)
      }
    })
  })
)

export default router