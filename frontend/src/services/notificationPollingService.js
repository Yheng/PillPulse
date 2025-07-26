/**
 * Notification Polling Service
 * Polls the backend for new notifications and displays them using the modal system
 * Connects backend notification system to frontend popups
 */

import { userService } from './api'

class NotificationPollingService {
  constructor() {
    this.polling = false
    this.pollInterval = null
    this.lastNotificationId = null
    this.isInitialized = false
    this.recentlyShownNotifications = new Map() // Track recently shown notifications
    this.notificationCooldownMs = 5 * 60 * 1000 // 5 minutes cooldown
  }

  /**
   * Initialize the polling service
   * @param {number} intervalMs - Polling interval in milliseconds (default: 30 seconds)
   */
  initialize(intervalMs = 30000) {
    if (this.isInitialized) {
      console.log('📱 Notification polling already initialized')
      return
    }

    console.log('🔄 Initializing notification polling service...')
    this.isInitialized = true
    
    // Start polling for notifications
    this.startPolling(intervalMs)
    
    console.log(`✅ Notification polling started (checking every ${intervalMs/1000}s)`)
  }

  /**
   * Start polling for new notifications
   * @param {number} intervalMs - Polling interval in milliseconds
   */
  startPolling(intervalMs = 30000) {
    if (this.polling) {
      console.log('📱 Notification polling already running')
      return
    }

    this.polling = true
    
    // Check immediately
    this.checkForNewNotifications()
    
    // Set up interval polling
    this.pollInterval = setInterval(() => {
      this.checkForNewNotifications()
    }, intervalMs)
  }

  /**
   * Stop polling for notifications
   */
  stopPolling() {
    if (!this.polling) return
    
    console.log('🛑 Stopping notification polling')
    this.polling = false
    
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  /**
   * Check for new notifications from the backend
   */
  async checkForNewNotifications() {
    if (!this.polling) return
    
    try {
      // Get recent unread notifications
      const response = await userService.getNotifications({ 
        limit: 5, 
        unread_only: true 
      })
      
      if (!response.success || !response.data.notifications) {
        return
      }

      const notifications = response.data.notifications
      
      // Filter for notifications newer than the last one we processed
      const newNotifications = this.lastNotificationId 
        ? notifications.filter(n => n.id > this.lastNotificationId)
        : notifications

      if (newNotifications.length > 0) {
        console.log(`📱 Found ${newNotifications.length} new notifications`)
        
        // Update last notification ID
        this.lastNotificationId = Math.max(...notifications.map(n => n.id))
        
        // Display each new notification
        for (const notification of newNotifications) {
          await this.displayNotification(notification)
          
          // Mark as read after displaying
          try {
            await userService.markNotificationAsRead(notification.id)
          } catch (error) {
            console.warn('Failed to mark notification as read:', error)
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking for notifications:', error)
      
      // Don't stop polling on temporary errors
      if (error.message?.includes('Network Error') || error.status >= 500) {
        console.log('🔄 Temporary error, continuing to poll...')
      }
    }
  }

  /**
   * Display a notification using the modal system or browser notifications
   * @param {Object} notification - Notification data from backend
   */
  async displayNotification(notification) {
    const { type, title, message, schedule_id } = notification
    
    // Check if this notification was recently shown
    const notificationKey = `${schedule_id}-${type}`
    const lastShown = this.recentlyShownNotifications.get(notificationKey)
    
    if (lastShown && Date.now() - lastShown < this.notificationCooldownMs) {
      console.log(`⏭️ Skipping duplicate notification for ${notificationKey} (shown ${Math.round((Date.now() - lastShown) / 1000)}s ago)`)
      return
    }
    
    try {
      // For medication reminders, use the modal system if available
      if ((type === 'reminder' || type === 'missed_dose') && window.showNotificationModal) {
        
        // Extract medication info from the notification
        const medicationData = {
          medication_name: this.extractMedicationName(title),
          dosage: this.extractDosage(message),
          time: this.extractTime(message),
          message: message,
          schedule_id: schedule_id || 'unknown',
          urgent: type === 'missed_dose'
        }
        
        console.log(`🔔 Showing ${type} modal for:`, medicationData.medication_name)
        window.showNotificationModal(medicationData)
        
        // Track that we showed this notification
        this.recentlyShownNotifications.set(notificationKey, Date.now())
        
        // Clean up old entries after cooldown period
        setTimeout(() => {
          this.recentlyShownNotifications.delete(notificationKey)
        }, this.notificationCooldownMs)
        
      } else {
        // Fallback to browser notifications for other types
        await this.showBrowserNotification(title, message, type)
      }
      
    } catch (error) {
      console.error('❌ Error displaying notification:', error)
      
      // Fallback to browser notification
      try {
        await this.showBrowserNotification(title, message, type)
      } catch (fallbackError) {
        console.error('❌ Fallback notification also failed:', fallbackError)
      }
    }
  }

  /**
   * Show a browser notification as fallback
   * @param {string} title - Notification title
   * @param {string} message - Notification message  
   * @param {string} type - Notification type
   */
  async showBrowserNotification(title, message, type) {
    // Request permission if needed
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        console.warn('Notification permission denied')
        return
      }
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `pillpulse-${type}`,
        requireInteraction: type === 'missed_dose',
        vibrate: type === 'missed_dose' ? [200, 100, 200, 100, 200] : [200, 100, 200]
      })

      // Auto-close after delay
      const autoCloseDelay = type === 'missed_dose' ? 30000 : 10000
      setTimeout(() => notification.close(), autoCloseDelay)
      
      console.log(`🔔 Browser notification shown: ${title}`)
    }
  }

  /**
   * Extract medication name from notification title
   * @param {string} title - Notification title
   * @returns {string} Medication name
   */
  extractMedicationName(title) {
    // Try to extract from patterns like "💊 Time for Aspirin" or "🚨 Missed Dose: Vitamins"
    const matches = title.match(/(?:Time for|Missed Dose:)\s*(.+)/) ||
                   title.match(/💊\s*(.+)/) ||
                   title.match(/🚨\s*(.+)/)
    
    return matches ? matches[1].trim() : 'Medication'
  }

  /**
   * Extract dosage from notification message
   * @param {string} message - Notification message
   * @returns {string} Dosage
   */
  extractDosage(message) {
    // Try to extract dosage patterns like "10mg", "2 tablets", etc.
    const matches = message.match(/(\d+(?:\.\d+)?\s*(?:mg|g|ml|tablets?|pills?|capsules?))/i)
    return matches ? matches[1] : 'as prescribed'
  }

  /**
   * Extract time from notification message
   * @param {string} message - Notification message
   * @returns {string} Time
   */
  extractTime(message) {
    // Try to extract time patterns
    const matches = message.match(/(\d{1,2}:\d{2}(?:\s*[AP]M)?)/i)
    return matches ? matches[1] : new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  /**
   * Clear notification cooldown for a specific schedule
   * @param {number|string} scheduleId - Schedule ID to clear
   */
  clearNotificationCooldown(scheduleId) {
    const reminderKey = `${scheduleId}-reminder`
    const missedKey = `${scheduleId}-missed_dose`
    
    this.recentlyShownNotifications.delete(reminderKey)
    this.recentlyShownNotifications.delete(missedKey)
    
    console.log(`🧹 Cleared notification cooldown for schedule ${scheduleId}`)
  }
  
  /**
   * Get current polling status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      polling: this.polling,
      initialized: this.isInitialized,
      lastNotificationId: this.lastNotificationId
    }
  }
}

// Create singleton instance
const notificationPollingService = new NotificationPollingService()

export default notificationPollingService