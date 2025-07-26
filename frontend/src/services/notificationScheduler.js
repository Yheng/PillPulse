/**
 * Notification Scheduler Service
 * Schedules notifications to fire at precise times instead of polling intervals
 * Ensures medication reminders appear exactly at the scheduled time
 */

import { scheduleService } from './api'
import pushNotificationService from './notificationService'

class NotificationScheduler {
  constructor() {
    this.scheduledTimers = new Map() // Map of schedule_id to timer ID
    this.activeSchedules = new Map() // Map of schedule_id to schedule data
    this.isRunning = false
    this.checkInterval = null
    this.lastUpdateCheck = null
  }

  /**
   * Initialize the notification scheduler
   */
  async initialize() {
    if (this.isRunning) {
      console.log('⏰ Notification scheduler already running')
      return
    }

    console.log('🚀 Initializing precise notification scheduler...')
    this.isRunning = true

    // Load and schedule today's medications
    await this.loadAndScheduleToday()

    // Check for schedule updates every 5 minutes
    this.checkInterval = setInterval(() => {
      this.checkForScheduleUpdates()
    }, 5 * 60 * 1000)

    // Also reload schedules at midnight for the new day
    this.scheduleMidnightReload()

    console.log('✅ Notification scheduler initialized')
  }

  /**
   * Stop the notification scheduler
   */
  stop() {
    console.log('🛑 Stopping notification scheduler')
    
    // Clear all scheduled timers
    this.scheduledTimers.forEach((timerId) => {
      clearTimeout(timerId)
    })
    this.scheduledTimers.clear()
    this.activeSchedules.clear()

    // Clear update check interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }

    this.isRunning = false
  }

  /**
   * Load today's schedules and set up timers
   */
  async loadAndScheduleToday() {
    try {
      // Get today's schedules from the API
      const response = await scheduleService.getTodaysSchedules()
      
      if (!response.success || !response.data) {
        console.error('Failed to load today\'s schedules')
        return
      }

      const schedules = response.data.schedules || []
      console.log(`📅 Loaded ${schedules.length} schedules for today`)

      // Clear existing timers
      this.clearAllTimers()

      // Schedule each medication
      const now = new Date()
      schedules.forEach(schedule => {
        this.scheduleNotification(schedule, now)
      })

      // Send schedules to service worker for background processing
      this.sendSchedulesToServiceWorker(schedules)

    } catch (error) {
      console.error('❌ Error loading today\'s schedules:', error)
    }
  }

  /**
   * Schedule a notification for a specific medication
   * @param {Object} schedule - Schedule object with time, medication_name, etc.
   * @param {Date} now - Current date/time for reference
   */
  scheduleNotification(schedule, now = new Date()) {
    const { id, time, medication_name, dosage } = schedule
    
    // Parse the scheduled time
    const [hours, minutes] = time.split(':').map(Number)
    const scheduledTime = new Date(now)
    scheduledTime.setHours(hours, minutes, 0, 0)

    // Calculate milliseconds until scheduled time
    const msUntilScheduled = scheduledTime.getTime() - now.getTime()

    // Only schedule if it's in the future (within the next 24 hours)
    if (msUntilScheduled > 0 && msUntilScheduled < 24 * 60 * 60 * 1000) {
      console.log(`⏰ Scheduling ${medication_name} for ${time} (in ${Math.round(msUntilScheduled / 1000 / 60)} minutes)`)
      
      const timerId = setTimeout(() => {
        this.fireNotification(schedule)
      }, msUntilScheduled)

      // Store the timer and schedule data
      this.scheduledTimers.set(id, timerId)
      this.activeSchedules.set(id, schedule)
    } else if (msUntilScheduled > -30 * 60 * 1000 && msUntilScheduled <= 0) {
      // If within the last 30 minutes, check if it needs a notification
      console.log(`⚠️ ${medication_name} was due ${Math.abs(Math.round(msUntilScheduled / 1000 / 60))} minutes ago`)
      this.checkAndFireOverdueNotification(schedule)
    }
  }

  /**
   * Fire a notification for a medication
   * @param {Object} schedule - Schedule object
   */
  async fireNotification(schedule) {
    const { id, medication_name, dosage, time } = schedule
    
    console.log(`🔔 Firing notification for ${medication_name} at ${time}`)
    
    // Check if medication was already taken today
    try {
      const adherenceResponse = await scheduleService.getTodayAdherence(id)
      if (adherenceResponse.data?.taken) {
        console.log(`✅ ${medication_name} already taken today, skipping notification`)
        return
      }
    } catch (error) {
      console.warn('Could not check adherence status:', error)
    }

    // Show the notification
    if (window.showNotificationModal) {
      window.showNotificationModal({
        medication_name,
        dosage,
        time,
        schedule_id: id,
        message: `Time to take your ${dosage} dose of ${medication_name}`,
        urgent: false
      })
    } else {
      // Fallback to push notification
      await pushNotificationService.showMedicationReminder({
        medication_name,
        dosage,
        time,
        schedule_id: id,
        ai_message: `Time to take your ${dosage} dose of ${medication_name}`,
        urgent: false
      })
    }

    // Remove this timer from active list
    this.scheduledTimers.delete(id)
    this.activeSchedules.delete(id)

    // Schedule a missed dose notification in 30 minutes if not taken
    this.scheduleMissedDoseCheck(schedule)
  }

  /**
   * Check if an overdue medication needs a notification
   * @param {Object} schedule - Schedule object
   */
  async checkAndFireOverdueNotification(schedule) {
    const { id, medication_name } = schedule
    
    try {
      const adherenceResponse = await scheduleService.getTodayAdherence(id)
      if (!adherenceResponse.data?.taken) {
        console.log(`🚨 ${medication_name} is overdue and not taken`)
        
        // Fire an urgent notification
        await this.fireNotification({
          ...schedule,
          urgent: true
        })
      }
    } catch (error) {
      console.warn('Could not check overdue adherence:', error)
    }
  }

  /**
   * Schedule a check for missed dose 30 minutes after scheduled time
   * @param {Object} schedule - Schedule object
   */
  scheduleMissedDoseCheck(schedule) {
    const { id, medication_name, dosage, time } = schedule
    
    setTimeout(async () => {
      try {
        const adherenceResponse = await scheduleService.getTodayAdherence(id)
        if (!adherenceResponse.data?.taken) {
          console.log(`🚨 ${medication_name} missed - showing urgent reminder`)
          
          // Show urgent notification
          if (window.showNotificationModal) {
            window.showNotificationModal({
              medication_name,
              dosage,
              time,
              schedule_id: id,
              message: `⚠️ Missed dose: ${medication_name} was due at ${time}`,
              urgent: true
            })
          } else {
            await pushNotificationService.showMedicationReminder({
              medication_name,
              dosage,
              time,
              schedule_id: id,
              ai_message: `Missed dose: ${medication_name} was due at ${time}`,
              urgent: true
            })
          }
        }
      } catch (error) {
        console.error('Error checking missed dose:', error)
      }
    }, 30 * 60 * 1000) // 30 minutes
  }

  /**
   * Clear all scheduled timers
   */
  clearAllTimers() {
    this.scheduledTimers.forEach((timerId) => {
      clearTimeout(timerId)
    })
    this.scheduledTimers.clear()
    this.activeSchedules.clear()
  }

  /**
   * Check for schedule updates and reschedule if needed
   */
  async checkForScheduleUpdates() {
    console.log('🔄 Checking for schedule updates...')
    await this.loadAndScheduleToday()
  }

  /**
   * Schedule a reload at midnight for the new day
   */
  scheduleMidnightReload() {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0) // Next midnight
    
    const msUntilMidnight = midnight.getTime() - now.getTime()
    
    setTimeout(() => {
      console.log('🌙 Midnight reload - scheduling new day\'s medications')
      this.loadAndScheduleToday()
      this.scheduleMidnightReload() // Schedule next midnight
    }, msUntilMidnight)
  }

  /**
   * Remove a schedule from active tracking (when medication is taken)
   * @param {number} scheduleId - Schedule ID to remove
   */
  removeSchedule(scheduleId) {
    const timerId = this.scheduledTimers.get(scheduleId)
    if (timerId) {
      clearTimeout(timerId)
      this.scheduledTimers.delete(scheduleId)
      console.log(`✅ Removed timer for schedule ${scheduleId} (medication taken)`)
    }
    
    this.activeSchedules.delete(scheduleId)
  }

  /**
   * Manually trigger a notification for testing
   * @param {number} scheduleId - Schedule ID to test
   */
  async testNotification(scheduleId) {
    const schedule = this.activeSchedules.get(scheduleId)
    if (schedule) {
      await this.fireNotification(schedule)
      return true
    }
    return false
  }

  /**
   * Send schedules to service worker for background processing
   * @param {Array} schedules - Array of schedule objects
   */
  sendSchedulesToServiceWorker(schedules) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        navigator.serviceWorker.controller.postMessage({
          type: 'schedule-update',
          schedules: schedules
        })
        console.log('📤 Sent schedules to service worker for background processing')
      } catch (error) {
        console.warn('Failed to send schedules to service worker:', error)
      }
    }
  }

  /**
   * Get status of the scheduler
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeSchedules: this.activeSchedules.size,
      pendingNotifications: this.scheduledTimers.size,
      schedules: Array.from(this.activeSchedules.values())
    }
  }
}

// Create singleton instance
const notificationScheduler = new NotificationScheduler()

export default notificationScheduler