/**
 * Push Notification Service for PillPulse
 * Handles browser push notifications with professional UX design
 * Integrates with existing notification system and AI reminders
 */

class PushNotificationService {
  constructor() {
    this.isSupported = 'Notification' in window
    this.permission = this.isSupported ? Notification.permission : 'denied'
    this.activeNotifications = new Map()
  }

  /**
   * Check if push notifications are supported by the browser
   * @returns {boolean} True if notifications are supported
   */
  isNotificationSupported() {
    return this.isSupported
  }

  /**
   * Get current notification permission status
   * @returns {string} Permission status: 'granted', 'denied', or 'default'
   */
  getPermissionStatus() {
    return this.permission
  }

  /**
   * Request notification permission from user with friendly messaging
   * @returns {Promise<string>} Permission status after request
   */
  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Push notifications are not supported by this browser')
    }

    if (this.permission === 'granted') {
      return 'granted'
    }

    try {
      // Request permission with user-friendly context
      const permission = await Notification.requestPermission()
      this.permission = permission
      
      if (permission === 'granted') {
        console.log('✅ Push notification permission granted')
        // Show a welcome notification
        this.showWelcomeNotification()
      } else {
        console.log('❌ Push notification permission denied')
      }

      return permission
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      throw error
    }
  }

  /**
   * Show a welcome notification after permission is granted
   */
  showWelcomeNotification() {
    const notification = new Notification('PillPulse Notifications Enabled! 🎉', {
      body: 'You\'ll now receive smart medication reminders to help you stay on track.',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'welcome',
      requireInteraction: false,
      silent: false
    })

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close()
    }, 5000)
  }

  /**
   * Show a medication reminder push notification
   * @param {Object} reminderData - Reminder information
   * @param {Object} options - Notification display options
   */
  showMedicationReminder(reminderData, options = {}) {
    if (this.permission !== 'granted') {
      console.warn('Cannot show notification: permission not granted')
      return null
    }

    const {
      medication_name,
      dosage,
      time,
      ai_message,
      urgent = false,
      schedule_id
    } = reminderData

    const title = urgent 
      ? `🚨 Missed Dose: ${medication_name}`
      : `💊 Time for ${medication_name}`

    const body = ai_message 
      ? ai_message
      : `Take your ${dosage} dose scheduled for ${this.formatTime(time)}.`

    const notificationOptions = {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `medication-${schedule_id}`,
      requireInteraction: urgent,
      silent: false,
      vibrate: urgent ? [200, 100, 200, 100, 200] : [200, 100, 200],
      actions: [
        {
          action: 'taken',
          title: '✓ Taken',
          icon: '/icons/check.png'
        },
        {
          action: 'snooze',
          title: '💤 Snooze 15min',
          icon: '/icons/snooze.png'
        },
        {
          action: 'missed',
          title: '✗ Skip',
          icon: '/icons/skip.png'
        }
      ],
      data: {
        type: 'medication_reminder',
        schedule_id,
        medication_name,
        dosage,
        time,
        urgent,
        timestamp: Date.now()
      },
      ...options
    }

    try {
      const notification = new Notification(title, notificationOptions)
      
      // Store active notification
      this.activeNotifications.set(`medication-${schedule_id}`, notification)

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault()
        window.focus()
        
        // Navigate to dashboard or show reminder modal
        if (window.location.pathname !== '/dashboard') {
          window.location.href = '/dashboard'
        }
        
        // Close the notification
        notification.close()
      }

      // Handle notification close
      notification.onclose = () => {
        this.activeNotifications.delete(`medication-${schedule_id}`)
      }

      // Handle notification error
      notification.onerror = (error) => {
        console.error('Notification error:', error)
        this.activeNotifications.delete(`medication-${schedule_id}`)
      }

      // Auto-close after 30 seconds for regular reminders, 60 for urgent
      const autoCloseDelay = urgent ? 60000 : 30000
      setTimeout(() => {
        if (this.activeNotifications.has(`medication-${schedule_id}`)) {
          notification.close()
        }
      }, autoCloseDelay)

      console.log(`📢 Push notification shown for ${medication_name}`)
      return notification
    } catch (error) {
      console.error('Error showing push notification:', error)
      return null
    }
  }

  /**
   * Show a daily summary or coaching notification
   * @param {Object} summaryData - Daily summary data
   */
  showDailySummary(summaryData) {
    if (this.permission !== 'granted') return null

    const {
      adherence_rate,
      medications_taken,
      medications_missed,
      ai_insight
    } = summaryData

    const title = '📊 Daily Adherence Summary'
    const body = ai_insight || 
      `Today: ${adherence_rate}% adherence. ${medications_taken} taken, ${medications_missed} missed.`

    const notificationOptions = {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'daily-summary',
      requireInteraction: false,
      data: {
        type: 'daily_summary',
        adherence_rate,
        timestamp: Date.now()
      }
    }

    try {
      const notification = new Notification(title, notificationOptions)
      
      notification.onclick = (event) => {
        event.preventDefault()
        window.focus()
        window.location.href = '/analytics'
        notification.close()
      }

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000)

      return notification
    } catch (error) {
      console.error('Error showing daily summary notification:', error)
      return null
    }
  }

  /**
   * Show a motivational or streak notification
   * @param {Object} motivationData - Motivation message data
   */
  showMotivationNotification(motivationData) {
    if (this.permission !== 'granted') return null

    const {
      message,
      type = 'motivation',
      streak_days = 0
    } = motivationData

    let title = '💪 Keep it up!'
    if (type === 'streak' && streak_days > 0) {
      title = `🔥 ${streak_days} Day Streak!`
    }

    const notificationOptions = {
      body: message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `motivation-${type}`,
      requireInteraction: false,
      data: {
        type: 'motivation',
        subtype: type,
        streak_days,
        timestamp: Date.now()
      }
    }

    try {
      const notification = new Notification(title, notificationOptions)
      
      notification.onclick = (event) => {
        event.preventDefault()
        window.focus()
        notification.close()
      }

      // Auto-close after 8 seconds
      setTimeout(() => notification.close(), 8000)

      return notification
    } catch (error) {
      console.error('Error showing motivation notification:', error)
      return null
    }
  }

  /**
   * Clear all active notifications
   */
  clearAllNotifications() {
    this.activeNotifications.forEach((notification) => {
      notification.close()
    })
    this.activeNotifications.clear()
    console.log('🧹 All push notifications cleared')
  }

  /**
   * Clear specific notification by tag
   * @param {string} tag - Notification tag to clear
   */
  clearNotificationByTag(tag) {
    if (this.activeNotifications.has(tag)) {
      this.activeNotifications.get(tag).close()
      this.activeNotifications.delete(tag)
      console.log(`🧹 Cleared notification: ${tag}`)
    }
  }

  /**
   * Format time for display in notifications
   * @param {string} time - Time in HH:MM format
   * @returns {string} Formatted time
   */
  formatTime(time) {
    if (!time) return ''
    
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  /**
   * Test notification functionality
   */
  async testNotification() {
    if (this.permission !== 'granted') {
      await this.requestPermission()
    }

    if (this.permission === 'granted') {
      this.showMedicationReminder({
        medication_name: 'Test Medication',
        dosage: '10mg',
        time: '14:30',
        ai_message: 'This is a test notification to verify push notifications are working correctly.',
        schedule_id: 'test'
      })
      return true
    }
    return false
  }
}

// Create and export singleton instance
const pushNotificationService = new PushNotificationService()

export default pushNotificationService