import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Reminder Notification Component
 * Displays AI-driven medication reminders as pop-up notifications
 * Features snooze options and taken/missed actions as per wireframe specs
 */
const ReminderNotification = ({ 
  notification, 
  onTaken, 
  onMissed, 
  onSnooze, 
  onDismiss 
}) => {
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false)
  
  const snoozeOptions = [
    { label: '10 minutes', value: 10 },
    { label: '30 minutes', value: 30 },
    { label: '1 hour', value: 60 }
  ]

  /**
   * Handle snooze selection
   * @param {number} minutes - Minutes to snooze
   */
  const handleSnooze = (minutes) => {
    onSnooze(notification.id, minutes)
    setShowSnoozeOptions(false)
  }

  /**
   * Format time for display
   * @param {string} time - Time in HH:MM format
   * @returns {string} Formatted time
   */
  const formatTime = (time) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  if (!notification) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed top-4 right-4 z-50 w-80 max-w-sm"
        initial={{ opacity: 0, x: 100, scale: 0.8 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 100, scale: 0.8 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="bg-pillpulse-teal text-white rounded-lg shadow-xl p-4 relative">
          {/* Close button */}
          <button
            onClick={onDismiss}
            className="absolute top-2 right-2 text-white hover:text-gray-200 transition-colors"
          >
            ✕
          </button>

          {/* Notification content */}
          <div className="pr-6">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center mr-3">
                <span className="text-pillpulse-teal text-lg">💊</span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">{notification.medication_name}</h3>
                <p className="text-sm text-gray-200">{notification.dosage}</p>
              </div>
            </div>

            <div className="mb-3">
              <p className="text-sm text-gray-200">Scheduled for:</p>
              <p className="font-medium">{formatTime(notification.time)}</p>
            </div>

            {/* AI Message */}
            {notification.ai_message && (
              <div className="bg-white bg-opacity-20 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium">
                  {notification.urgent ? '🚨 ' : '💬 '}
                  {notification.ai_message}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 mb-3">
              <motion.button
                onClick={() => onTaken(notification.id)}
                className="flex-1 bg-pillpulse-green hover:bg-green-500 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                ✓ Taken
              </motion.button>
              <motion.button
                onClick={() => onMissed(notification.id)}
                className="flex-1 bg-pillpulse-gray hover:bg-gray-400 text-gray-800 py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                ✗ Missed
              </motion.button>
            </div>

            {/* Snooze section */}
            <div className="relative">
              <motion.button
                onClick={() => setShowSnoozeOptions(!showSnoozeOptions)}
                className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white py-2 px-3 rounded-md text-sm font-medium transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                💤 Snooze
              </motion.button>

              {/* Snooze options dropdown */}
              <AnimatePresence>
                {showSnoozeOptions && (
                  <motion.div
                    className="absolute bottom-full left-0 right-0 mb-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="bg-white rounded-lg shadow-lg py-2">
                      {snoozeOptions.map((option) => (
                        <motion.button
                          key={option.value}
                          onClick={() => handleSnooze(option.value)}
                          className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                          whileHover={{ backgroundColor: '#f3f4f6' }}
                        >
                          {option.label}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Escalation indicator */}
          {notification.urgent && (
            <motion.div
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Reminder Notification Manager
 * Manages multiple reminder notifications and their lifecycle
 */
export const ReminderNotificationManager = () => {
  const [notifications, setNotifications] = useState([])

  /**
   * Add a new notification
   * @param {Object} notification - Notification data
   */
  const addNotification = (notification) => {
    setNotifications(prev => [...prev, { 
      ...notification, 
      id: Date.now(),
      timestamp: new Date()
    }])

    // Auto-dismiss after 5 minutes if no action taken
    setTimeout(() => {
      dismissNotification(notification.id)
    }, 5 * 60 * 1000)
  }

  /**
   * Mark medication as taken
   * @param {number} notificationId - Notification ID
   */
  const handleTaken = (notificationId) => {
    const notification = notifications.find(n => n.id === notificationId)
    if (notification) {
      // Here you would typically call an API to log adherence
      console.log('Medication taken:', notification)
      dismissNotification(notificationId)
    }
  }

  /**
   * Mark medication as missed
   * @param {number} notificationId - Notification ID
   */
  const handleMissed = (notificationId) => {
    const notification = notifications.find(n => n.id === notificationId)
    if (notification) {
      // Here you would typically call an API to log adherence
      console.log('Medication missed:', notification)
      dismissNotification(notificationId)
    }
  }

  /**
   * Snooze notification
   * @param {number} notificationId - Notification ID
   * @param {number} minutes - Minutes to snooze
   */
  const handleSnooze = (notificationId, minutes) => {
    const notification = notifications.find(n => n.id === notificationId)
    if (notification) {
      // Remove current notification
      dismissNotification(notificationId)
      
      // Schedule new notification after snooze period
      setTimeout(() => {
        addNotification({
          ...notification,
          ai_message: `Snooze reminder: Don't forget your ${notification.medication_name}!`,
          urgent: true
        })
      }, minutes * 60 * 1000)
      
      console.log(`Medication snoozed for ${minutes} minutes:`, notification)
    }
  }

  /**
   * Dismiss notification
   * @param {number} notificationId - Notification ID
   */
  const dismissNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }

  return (
    <div>
      {notifications.map((notification) => (
        <ReminderNotification
          key={notification.id}
          notification={notification}
          onTaken={handleTaken}
          onMissed={handleMissed}
          onSnooze={handleSnooze}
          onDismiss={() => dismissNotification(notification.id)}
        />
      ))}
    </div>
  )
}

export default ReminderNotification