import { query as queryAll, queryOne, execute } from '../models/database.js'
import { generatePersonalizedReminder, generateCoachingMessage } from './openaiService.js'
import emergencyAlertService from '../services/emergencyAlertService.js'

/**
 * Notification Service for PillPulse
 * Handles automatic medication reminders with AI-powered personalization
 * Schedules and sends smart notifications to users
 */

/**
 * Get current time in user's timezone
 * @param {string} timezone - User's timezone (IANA identifier)
 * @returns {string} Current time in HH:MM format
 */
function getCurrentTimeInTimezone(timezone) {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    return formatter.format(new Date())
  } catch (error) {
    console.error('Error getting current time for timezone:', error)
    // Fallback to system time
    return new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }
}

/**
 * Convert time string to minutes since midnight for comparison
 * @param {string} timeString - Time in HH:MM format
 * @returns {number} Minutes since midnight
 */
function timeToMinutes(timeString) {
  if (!timeString || typeof timeString !== 'string') return 0
  const [hours, minutes] = timeString.split(':').map(Number)
  return (hours || 0) * 60 + (minutes || 0)
}

/**
 * Check if scheduled time has passed compared to current time
 * @param {string} scheduledTime - Scheduled time in HH:MM format
 * @param {string} currentTime - Current time in HH:MM format
 * @returns {boolean} True if scheduled time has passed
 */
function hasTimePassed(scheduledTime, currentTime) {
  const scheduledMinutes = timeToMinutes(scheduledTime)
  const currentMinutes = timeToMinutes(currentTime)
  return currentMinutes >= scheduledMinutes
}

/**
 * Get current date in user's timezone
 * @param {string} timezone - User's timezone (IANA identifier)
 * @returns {string} Current date in YYYY-MM-DD format
 */
function getCurrentDateInTimezone(timezone) {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    return formatter.format(new Date())
  } catch (error) {
    console.error('Error getting current date for timezone:', error)
    // Fallback to system date
    return new Date().toISOString().split('T')[0]
  }
}

/**
 * Get all users who need medication reminders right now
 * @returns {Promise<Array>} Array of users with due medications
 */
async function getUsersNeedingReminders() {
  try {
    // Get all users with their timezone settings and scheduled medications
    const usersWithSchedules = await queryAll(`
      SELECT DISTINCT 
        u.id as user_id,
        u.email,
        u.timezone,
        s.id as schedule_id,
        s.medication_name,
        s.dosage,
        s.time,
        s.frequency
      FROM users u
      JOIN schedules s ON u.id = s.user_id
      ORDER BY u.id, s.time
    `)

    const usersNeedingReminders = []

    for (const userSchedule of usersWithSchedules) {
      const { user_id, timezone, schedule_id, time } = userSchedule
      const userTimezone = timezone || 'America/New_York' // Default timezone
      
      // Get current time and date in user's timezone
      const currentTime = getCurrentTimeInTimezone(userTimezone)
      const today = getCurrentDateInTimezone(userTimezone)

      // Check if medication time has passed and not yet taken
      const timeHasPassed = hasTimePassed(time, currentTime)
      
      console.log(`🔍 Checking schedule ${schedule_id} for user ${user_id}: scheduled=${time}, current=${currentTime}, passed=${timeHasPassed}, timezone=${userTimezone}`)
      
      if (timeHasPassed) {
        // Check if medication was already taken today
        const adherenceRecord = await queryOne(`
          SELECT taken, notes, created_at
          FROM adherence_records
          WHERE schedule_id = ? AND date = ?
        `, [schedule_id, today])

        const needsReminder = !adherenceRecord || adherenceRecord.taken === 0 || adherenceRecord.taken === null
        console.log(`🔍 Adherence check: record=${!!adherenceRecord}, taken=${adherenceRecord?.taken}, needsReminder=${needsReminder}`)

        // If not taken or explicitly marked as not taken, add to reminders
        if (needsReminder) {
          console.log(`✅ Adding reminder for ${userSchedule.medication_name} (user ${user_id})`)
          usersNeedingReminders.push({
            ...userSchedule,
            user_timezone: userTimezone,
            current_time: currentTime,
            current_date: today,
            taken: adherenceRecord?.taken || null,
            notes: adherenceRecord?.notes || null,
            recorded_at: adherenceRecord?.created_at || null
          })
        }
      }
    }

    return usersNeedingReminders
  } catch (error) {
    console.error('❌ Error getting users needing reminders:', error.message)
    return []
  }
}

/**
 * Get time that is 30 minutes before current time in user's timezone
 * @param {string} timezone - User's timezone (IANA identifier)
 * @returns {string} Time threshold in HH:MM format
 */
function getTimeThresholdInTimezone(timezone, minutesAgo = 30) {
  try {
    const now = new Date()
    const thresholdTime = new Date(now.getTime() - minutesAgo * 60 * 1000)
    
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    
    return formatter.format(thresholdTime)
  } catch (error) {
    console.error('Error getting time threshold for timezone:', error)
    // Fallback to system time
    const currentTime = new Date()
    const thirtyMinutesAgo = new Date(currentTime.getTime() - minutesAgo * 60 * 1000)
    return thirtyMinutesAgo.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }
}

/**
 * Get users who have missed medications (overdue by more than 30 minutes)
 * @returns {Promise<Array>} Array of users with missed medications
 */
async function getUsersWithMissedMedications() {
  try {
    // Get all users with their timezone settings and scheduled medications
    const usersWithSchedules = await queryAll(`
      SELECT DISTINCT 
        u.id as user_id,
        u.email,
        u.timezone,
        s.id as schedule_id,
        s.medication_name,
        s.dosage,
        s.time,
        s.frequency
      FROM users u
      JOIN schedules s ON u.id = s.user_id
      ORDER BY u.id, s.time
    `)

    const usersWithMissedMeds = []

    for (const userSchedule of usersWithSchedules) {
      const { user_id, timezone, schedule_id, time } = userSchedule
      const userTimezone = timezone || 'America/New_York' // Default timezone
      
      // Get time threshold (30 minutes ago) in user's timezone
      const timeThreshold = getTimeThresholdInTimezone(userTimezone, 30)
      const today = getCurrentDateInTimezone(userTimezone)

      // Check if medication time was more than 30 minutes ago and not yet taken
      const isMissed = hasTimePassed(time, timeThreshold) // If scheduled time has passed the threshold (30 min ago)
      
      console.log(`🔍 Checking missed medication ${schedule_id} for user ${user_id}: scheduled=${time}, threshold=${timeThreshold}, missed=${isMissed}`)
      
      if (isMissed) {
        // Check if medication was already taken today
        const adherenceRecord = await queryOne(`
          SELECT taken, notes, created_at
          FROM adherence_records
          WHERE schedule_id = ? AND date = ?
        `, [schedule_id, today])

        const needsMissedReminder = !adherenceRecord || adherenceRecord.taken === 0 || adherenceRecord.taken === null
        console.log(`🔍 Missed adherence check: record=${!!adherenceRecord}, taken=${adherenceRecord?.taken}, needsReminder=${needsMissedReminder}`)

        // If not taken or explicitly marked as not taken, add to missed medications
        if (needsMissedReminder) {
          console.log(`⚠️ Adding missed medication reminder for ${userSchedule.medication_name} (user ${user_id})`)
          usersWithMissedMeds.push({
            ...userSchedule,
            user_timezone: userTimezone,
            time_threshold: timeThreshold,
            current_date: today,
            taken: adherenceRecord?.taken || null,
            notes: adherenceRecord?.notes || null,
            recorded_at: adherenceRecord?.created_at || null
          })
        }
      }
    }

    return usersWithMissedMeds
  } catch (error) {
    console.error('❌ Error getting users with missed medications:', error.message)
    return []
  }
}

/**
 * Store notification in database for tracking and potential display
 * @param {number} userId - User ID
 * @param {number} scheduleId - Schedule ID (can be null for coaching messages)
 * @param {string} type - Notification type: 'reminder', 'missed_dose', 'coaching', 'test'
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {boolean} aiGenerated - Whether message was AI generated
 * @returns {Promise<Object>} Database result
 */
async function storeNotification(userId, scheduleId, type, title, message, aiGenerated = false) {
  try {
    const result = await execute(`
      INSERT INTO notifications (user_id, schedule_id, type, title, message, ai_generated)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, scheduleId, type, title, message, aiGenerated ? 1 : 0])
    
    console.log(`📝 Stored ${type} notification for user ${userId}: ${title}`)
    return result
  } catch (error) {
    console.error(`❌ Failed to store notification for user ${userId}:`, error.message)
    throw error
  }
}

/**
 * Send notification via available channels (console for now, can be extended)
 * @param {Object} notificationData - Notification information
 * @returns {Promise<boolean>} Success status
 */
async function sendNotification(notificationData) {
  const { user_id, title, message, type, schedule_id } = notificationData
  
  try {
    // For now, we'll log to console and store in database
    // In a real implementation, this would also send:
    // - Push notifications to browser
    // - Email notifications
    // - SMS notifications
    // - In-app notifications
    
    console.log(`🔔 SENDING ${type.toUpperCase()} NOTIFICATION to user ${user_id}:`)
    console.log(`📱 Title: ${title}`)
    console.log(`💬 Message: ${message}`)
    
    // Store in database for tracking
    await storeNotification(user_id, schedule_id, type, title, message, notificationData.ai_generated || false)
    
    // Here you could add:
    // - WebSocket/Server-Sent Events to push to connected clients
    // - Email sending via service like SendGrid
    // - SMS sending via service like Twilio
    // - Browser push notifications via service worker
    
    return true
  } catch (error) {
    console.error(`❌ Failed to send notification to user ${user_id}:`, error.message)
    return false
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

    // Create notification data
    const title = isMissed 
      ? `🚨 Missed Dose: ${medication_name}`
      : `💊 Time for ${medication_name}`
    
    const notificationData = {
      user_id,
      schedule_id,
      type: isMissed ? 'missed_dose' : 'reminder',
      title,
      message: reminder,
      ai_generated: true
    }

    // Send the notification via available channels
    const sent = await sendNotification(notificationData)

    return {
      success: sent,
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
 * Get current hour in user's timezone
 * @param {string} timezone - User's timezone (IANA identifier)
 * @returns {number} Current hour (0-23)
 */
function getCurrentHourInTimezone(timezone) {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false
    })
    return parseInt(formatter.format(new Date()))
  } catch (error) {
    console.error('Error getting current hour for timezone:', error)
    return new Date().getHours()
  }
}

/**
 * Send daily motivation and coaching messages to users
 * @returns {Promise<Array>} Array of coaching results
 */
async function sendDailyCoaching() {
  try {
    // Get all active users with their timezone settings
    const activeUsers = await queryAll(`
      SELECT DISTINCT u.id, u.email, u.timezone
      FROM users u
      JOIN schedules s ON u.id = s.user_id
      JOIN adherence_records ar ON s.id = ar.schedule_id
      WHERE ar.date >= date('now', '-7 days')
    `)

    const coachingResults = []

    for (const user of activeUsers) {
      try {
        const userTimezone = user.timezone || 'America/New_York'
        const currentHour = getCurrentHourInTimezone(userTimezone)
        
        // Only send coaching at 9 AM in user's timezone
        if (currentHour !== 9) {
          continue
        }

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

        // Create and send coaching notification
        let title = '💪 Daily Motivation'
        if (coachingType === 'streak') {
          title = `🔥 ${context.streakDays} Day Streak!`
        } else if (coachingType === 'missed_dose') {
          title = '⚠️ Let\'s Get Back on Track'
        }

        const coachingNotification = {
          user_id: user.id,
          schedule_id: null, // Coaching messages aren't tied to specific schedules
          type: 'coaching',
          title,
          message: coachingMessage,
          ai_generated: true
        }

        await sendNotification(coachingNotification)

        coachingResults.push({
          user_id: user.id,
          message: coachingMessage,
          type: coachingType,
          adherence_rate: Math.round(adherenceRate * 100),
          user_timezone: userTimezone,
          user_hour: currentHour
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
  const now = new Date()
  console.log(`🔄 Processing all medication reminders at ${now.toISOString()}...`)
  
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

    // Send daily coaching (only once per day - check each user's timezone)
    try {
      const coachingResults = await sendDailyCoaching()
      results.coaching_messages = coachingResults
    } catch (error) {
      results.errors.push({ type: 'coaching', error: error.message })
    }

    // Check for emergency alerts for critically missed doses
    try {
      console.log('🚨 Checking for emergency alerts...')
      await emergencyAlertService.checkForEmergencyAlerts()
      results.emergency_alerts_checked = true
    } catch (error) {
      console.error('❌ Error checking emergency alerts:', error)
      results.errors.push({ type: 'emergency_alerts', error: error.message })
      results.emergency_alerts_checked = false
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
 * Calculate milliseconds until next minute boundary
 * @returns {number} Milliseconds until next minute
 */
function msUntilNextMinute() {
  const now = new Date()
  const secondsToNextMinute = 60 - now.getSeconds()
  const msToNextMinute = secondsToNextMinute * 1000 - now.getMilliseconds()
  return msToNextMinute
}

/**
 * Schedule next notification check at the top of the next minute
 */
function scheduleNextCheck() {
  const msToWait = msUntilNextMinute()
  
  setTimeout(() => {
    // Process reminders at the exact minute
    processAllReminders().catch(error => {
      console.error('❌ Error in scheduled reminder processing:', error)
    })
    
    // Schedule recurring checks every minute
    const recurringInterval = setInterval(async () => {
      await processAllReminders().catch(error => {
        console.error('❌ Error in recurring reminder processing:', error)
      })
    }, 60 * 1000) // Every minute
    
    // Store interval for cleanup
    global.notificationInterval = recurringInterval
    
  }, msToWait)
}

/**
 * Start the notification service scheduler
 * Processes reminders every minute at exact minute boundaries for precise timing
 */
export function startNotificationService() {
  console.log('🚀 Starting PillPulse Notification Service...')
  
  // Clear any existing interval
  if (global.notificationInterval) {
    clearInterval(global.notificationInterval)
  }
  
  // Schedule first check at next minute boundary, then every minute
  scheduleNextCheck()
  
  console.log('✅ Notification service started - processing reminders every minute at exact times')

  // Return cleanup function
  return () => {
    if (global.notificationInterval) {
      clearInterval(global.notificationInterval)
      global.notificationInterval = null
    }
    console.log('🛑 Notification service stopped')
  }
}

export default {
  processAllReminders,
  getInstantReminder,
  startNotificationService
}