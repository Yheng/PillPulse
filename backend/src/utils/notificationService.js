import { query as queryAll, queryOne } from '../models/database.js'
import { generatePersonalizedReminder, generateCoachingMessage } from './openaiService.js'

/**
 * Notification Service for PillPulse
 * Handles automatic medication reminders with AI-powered personalization
 * Schedules and sends smart notifications to users
 */

/**
 * Get all users who need medication reminders right now
 * @returns {Promise<Array>} Array of users with due medications
 */
async function getUsersNeedingReminders() {
  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  })
  const today = new Date().toISOString().split('T')[0]

  try {
    const usersWithDueMedications = await queryAll(`
      SELECT DISTINCT 
        u.id as user_id,
        u.email,
        s.id as schedule_id,
        s.medication_name,
        s.dosage,
        s.time,
        s.frequency,
        ar.taken,
        ar.actual_time
      FROM users u
      JOIN schedules s ON u.id = s.user_id
      LEFT JOIN adherence_records ar ON s.id = ar.schedule_id AND ar.date = ?
      WHERE s.time <= ? 
        AND (ar.taken IS NULL OR ar.taken = 0)
      ORDER BY u.id, s.time
    `, [today, currentTime])

    return usersWithDueMedications
  } catch (error) {
    console.error('❌ Error getting users needing reminders:', error.message)
    return []
  }
}

/**
 * Get users who have missed medications (overdue by more than 30 minutes)
 * @returns {Promise<Array>} Array of users with missed medications
 */
async function getUsersWithMissedMedications() {
  const currentTime = new Date()
  const thirtyMinutesAgo = new Date(currentTime.getTime() - 30 * 60 * 1000)
  const timeThreshold = thirtyMinutesAgo.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  })
  const today = new Date().toISOString().split('T')[0]

  try {
    const usersWithMissedMeds = await queryAll(`
      SELECT DISTINCT 
        u.id as user_id,
        u.email,
        s.id as schedule_id,
        s.medication_name,
        s.dosage,
        s.time,
        s.frequency,
        ar.taken
      FROM users u
      JOIN schedules s ON u.id = s.user_id
      LEFT JOIN adherence_records ar ON s.id = ar.schedule_id AND ar.date = ?
      WHERE s.time <= ? 
        AND (ar.taken IS NULL OR ar.taken = 0)
      ORDER BY u.id, s.time
    `, [today, timeThreshold])

    return usersWithMissedMeds
  } catch (error) {
    console.error('❌ Error getting users with missed medications:', error.message)
    return []
  }
}

/**
 * Generate and send AI-powered reminder for a specific user and medication
 * @param {Object} medicationData - User and medication information
 * @param {boolean} isMissed - Whether this is a missed dose reminder
 * @returns {Promise<Object>} Reminder result
 */
async function sendAIReminder(medicationData, isMissed = false) {
  const { user_id, schedule_id, medication_name, dosage, time } = medicationData

  try {
    // Generate personalized reminder
    const schedule = {
      id: schedule_id,
      medication_name,
      dosage,
      time,
      frequency: medicationData.frequency
    }

    const options = { isMissed }
    const reminder = await generatePersonalizedReminder(user_id, schedule, options)

    // In a real implementation, you would send this via:
    // - Push notifications
    // - Email
    // - SMS
    // - In-app notifications

    console.log(`🔔 ${isMissed ? 'MISSED' : 'REMINDER'} for user ${user_id}: ${reminder}`)

    // Store notification in database (you could add a notifications table)
    const notificationData = {
      user_id,
      schedule_id,
      type: isMissed ? 'missed_dose' : 'reminder',
      message: reminder,
      sent_at: new Date().toISOString(),
      ai_generated: true
    }

    return {
      success: true,
      notification: notificationData,
      message: reminder
    }
  } catch (error) {
    console.error(`❌ Error sending AI reminder for user ${user_id}:`, error.message)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Send daily motivation and coaching messages to users
 * @returns {Promise<Array>} Array of coaching results
 */
async function sendDailyCoaching() {
  try {
    // Get all active users (users who have logged medication in the last 7 days)
    const activeUsers = await queryAll(`
      SELECT DISTINCT u.id, u.email
      FROM users u
      JOIN schedules s ON u.id = s.user_id
      JOIN adherence_records ar ON s.id = ar.schedule_id
      WHERE ar.date >= date('now', '-7 days')
    `)

    const coachingResults = []

    for (const user of activeUsers) {
      try {
        // Get user's recent adherence to determine coaching type
        const recentAdherence = await queryAll(`
          SELECT ar.taken, ar.date
          FROM adherence_records ar
          JOIN schedules s ON ar.schedule_id = s.id
          WHERE s.user_id = ? AND ar.date >= date('now', '-3 days')
          ORDER BY ar.date DESC
        `, [user.id])

        if (recentAdherence.length === 0) continue

        const adherenceRate = recentAdherence.filter(r => r.taken).length / recentAdherence.length
        let coachingType = 'motivation'
        let context = {}

        if (adherenceRate === 1.0) {
          coachingType = 'streak'
          context = { streakDays: recentAdherence.length }
        } else if (adherenceRate >= 0.8) {
          coachingType = 'motivation'
        } else if (adherenceRate < 0.5) {
          coachingType = 'missed_dose'
        }

        const coachingMessage = await generateCoachingMessage(user.id, coachingType, context)

        console.log(`💪 Daily coaching for user ${user.id}: ${coachingMessage}`)

        coachingResults.push({
          user_id: user.id,
          message: coachingMessage,
          type: coachingType,
          adherence_rate: Math.round(adherenceRate * 100)
        })
      } catch (error) {
        console.error(`❌ Error generating coaching for user ${user.id}:`, error.message)
      }
    }

    return coachingResults
  } catch (error) {
    console.error('❌ Error sending daily coaching:', error.message)
    return []
  }
}

/**
 * Process all pending medication reminders
 * Main function to be called by a scheduler (cron job, etc.)
 * @returns {Promise<Object>} Processing results
 */
export async function processAllReminders() {
  console.log('🔄 Processing all medication reminders...')
  
  try {
    const results = {
      regular_reminders: [],
      missed_reminders: [],
      coaching_messages: [],
      total_processed: 0,
      errors: []
    }

    // Send regular reminders for due medications
    const dueReminders = await getUsersNeedingReminders()
    for (const medication of dueReminders) {
      try {
        const result = await sendAIReminder(medication, false)
        if (result.success) {
          results.regular_reminders.push(result)
        } else {
          results.errors.push({ type: 'reminder', error: result.error, user_id: medication.user_id })
        }
      } catch (error) {
        results.errors.push({ type: 'reminder', error: error.message, user_id: medication.user_id })
      }
    }

    // Send missed dose reminders
    const missedReminders = await getUsersWithMissedMedications()
    for (const medication of missedReminders) {
      try {
        const result = await sendAIReminder(medication, true)
        if (result.success) {
          results.missed_reminders.push(result)
        } else {
          results.errors.push({ type: 'missed', error: result.error, user_id: medication.user_id })
        }
      } catch (error) {
        results.errors.push({ type: 'missed', error: error.message, user_id: medication.user_id })
      }
    }

    // Send daily coaching (only once per day)
    const currentHour = new Date().getHours()
    if (currentHour === 9) { // Send coaching at 9 AM
      try {
        const coachingResults = await sendDailyCoaching()
        results.coaching_messages = coachingResults
      } catch (error) {
        results.errors.push({ type: 'coaching', error: error.message })
      }
    }

    results.total_processed = results.regular_reminders.length + results.missed_reminders.length + results.coaching_messages.length

    console.log(`✅ Processed ${results.total_processed} notifications (${results.errors.length} errors)`)
    return results
  } catch (error) {
    console.error('❌ Error processing reminders:', error.message)
    return {
      regular_reminders: [],
      missed_reminders: [],
      coaching_messages: [],
      total_processed: 0,
      errors: [{ type: 'system', error: error.message }]
    }
  }
}

/**
 * Get personalized reminder for immediate use (API endpoint)
 * @param {number} userId - User ID
 * @param {number} scheduleId - Schedule ID  
 * @param {Object} options - Additional options
 * @returns {Promise<string>} Personalized reminder message
 */
export async function getInstantReminder(userId, scheduleId, options = {}) {
  try {
    const schedule = await queryOne(`
      SELECT * FROM schedules 
      WHERE id = ? AND user_id = ?
    `, [scheduleId, userId])

    if (!schedule) {
      throw new Error('Schedule not found')
    }

    return await generatePersonalizedReminder(userId, schedule, options)
  } catch (error) {
    console.error('❌ Error getting instant reminder:', error.message)
    throw error
  }
}

/**
 * Start the notification service scheduler
 * In production, this would be replaced with a proper job scheduler like node-cron
 */
export function startNotificationService() {
  console.log('🚀 Starting PillPulse Notification Service...')
  
  // Process reminders every 5 minutes
  const reminderInterval = setInterval(async () => {
    await processAllReminders()
  }, 5 * 60 * 1000) // 5 minutes

  console.log('✅ Notification service started - processing reminders every 5 minutes')

  // Return cleanup function
  return () => {
    clearInterval(reminderInterval)
    console.log('🛑 Notification service stopped')
  }
}

export default {
  processAllReminders,
  getInstantReminder,
  startNotificationService
}