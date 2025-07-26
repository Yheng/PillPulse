import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { notificationSound } from '../utils/notificationSound'
import { useSchedule } from '../context/ScheduleContext'
import notificationPollingService from '../services/notificationPollingService'
import notificationScheduler from '../services/notificationScheduler'

/**
 * Modal-based Notification Component
 * Shows medication reminders in a modal instead of browser notifications
 * Includes continuous sound until user dismisses the notification
 */
const NotificationModal = ({ notification, onDismiss, onTaken, onSnooze }) => {
  const [isVisible, setIsVisible] = useState(false)
  const soundIntervalRef = useRef(null)
  const startTimeRef = useRef(null)

  useEffect(() => {
    if (notification) {
      setIsVisible(true)
      startTimeRef.current = Date.now()
      
      // Determine escalation level for sound timing
      const escalationLevel = notification.escalation_level || 0
      const isCritical = escalationLevel >= 2
      const isUrgent = notification.urgent || escalationLevel > 0
      
      let soundInterval = 10000 // Default 10 seconds
      if (isCritical) {
        soundInterval = 5000 // Every 5 seconds for critical
      } else if (isUrgent) {
        soundInterval = 8000 // Every 8 seconds for urgent
      }
      
      // Play initial sound
      notificationSound.playReminderTone()
      
      // Continue playing sound at escalation-appropriate intervals
      soundIntervalRef.current = setInterval(() => {
        notificationSound.playReminderTone()
      }, soundInterval)
    }

    return () => {
      if (soundIntervalRef.current) {
        clearInterval(soundIntervalRef.current)
        soundIntervalRef.current = null
      }
    }
  }, [notification])

  const handleDismiss = () => {
    if (soundIntervalRef.current) {
      clearInterval(soundIntervalRef.current)
      soundIntervalRef.current = null
    }
    setIsVisible(false)
    setTimeout(onDismiss, 300) // Wait for animation to complete
  }

  const handleTaken = () => {
    if (soundIntervalRef.current) {
      clearInterval(soundIntervalRef.current)
      soundIntervalRef.current = null
    }
    setIsVisible(false)
    setTimeout(() => onTaken(notification), 300)
  }

  const handleSnooze = () => {
    if (soundIntervalRef.current) {
      clearInterval(soundIntervalRef.current)
      soundIntervalRef.current = null
    }
    setIsVisible(false)
    setTimeout(() => onSnooze(notification), 300)
  }

  const formatTime = (time) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  if (!notification) return null

  const escalationLevel = notification.escalation_level || 0
  const isUrgent = notification.urgent || escalationLevel > 0
  const isCritical = escalationLevel >= 2
  const medicationName = notification.medication_name || 'Medication'
  const dosage = notification.dosage || ''
  const time = notification.time || ''
  const message = notification.ai_message || notification.message || `Time to take your ${dosage} dose of ${medicationName}`

  // Escalation-based styling and behavior
  const getEscalationStyles = () => {
    if (isCritical) {
      return {
        ringClass: 'ring-4 ring-red-600 ring-opacity-75',
        gradientClass: 'bg-gradient-to-r from-red-600 to-red-700',
        icon: '🚨',
        title: 'CRITICAL: Medication Overdue',
        soundInterval: 5000 // Every 5 seconds for critical
      }
    } else if (isUrgent) {
      return {
        ringClass: 'ring-4 ring-orange-500 ring-opacity-60',
        gradientClass: 'bg-gradient-to-r from-orange-500 to-red-500',
        icon: '⚠️',
        title: 'URGENT: Medication Reminder',
        soundInterval: 8000 // Every 8 seconds for urgent
      }
    } else {
      return {
        ringClass: 'ring-2 ring-blue-300 ring-opacity-30',
        gradientClass: 'bg-gradient-to-r from-blue-500 to-teal-500',
        icon: '💊',
        title: 'Medication Reminder',
        soundInterval: 10000 // Every 10 seconds for normal
      }
    }
  }

  const escalationStyles = getEscalationStyles()

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className={`bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden ${escalationStyles.ringClass}`}
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ 
                opacity: 1, 
                scale: isCritical ? [1, 1.02, 1] : 1, 
                y: 0 
              }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ 
                duration: 0.3, 
                ease: "easeOut",
                scale: isCritical ? { repeat: Infinity, duration: 1 } : {}
              }}
            >
              {/* Header */}
              <div className={`px-6 py-4 ${escalationStyles.gradientClass} text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <span className="text-2xl">
                        {escalationStyles.icon}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">
                        {escalationStyles.title}
                      </h2>
                      <p className="text-sm opacity-90">
                        {time && `Scheduled for ${formatTime(time)}`}
                        {escalationLevel > 0 && ` • Escalation Level ${escalationLevel}`}
                      </p>
                    </div>
                  </div>
                  
                  {/* Pulsing indicator */}
                  <motion.div
                    className="w-4 h-4 bg-white rounded-full"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {medicationName}
                  </h3>
                  {dosage && (
                    <p className="text-lg text-gray-600 mb-3">
                      Dosage: {dosage}
                    </p>
                  )}
                  <p className="text-gray-700 leading-relaxed">
                    {message}
                  </p>
                  
                  {/* Escalation warnings */}
                  {escalationLevel > 0 && (
                    <div className={`mt-4 p-3 rounded-lg ${
                      isCritical ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'
                    }`}>
                      <p className={`text-sm font-medium ${
                        isCritical ? 'text-red-800' : 'text-orange-800'
                      }`}>
                        {isCritical 
                          ? '🚨 CRITICAL: This medication is significantly overdue. Please take it immediately or contact your healthcare provider.'
                          : '⚠️ This medication is overdue. Please take it as soon as possible.'
                        }
                      </p>
                      {notification.snoozed_from && (
                        <p className="text-xs text-gray-600 mt-1">
                          Previously snoozed at {new Date(notification.snoozed_from).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <motion.button
                    onClick={handleTaken}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg transition-all duration-200"
                    whileHover={{ scale: 1.02, boxShadow: "0 10px 25px rgba(34, 197, 94, 0.3)" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    ✅ I took it
                  </motion.button>

                  <div className="flex space-x-2">
                    {/* Multiple snooze options based on escalation level */}
                    <div className="flex-1 relative">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleSnooze(notification, parseInt(e.target.value))
                            e.target.value = '' // Reset
                          }
                        }}
                        className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg appearance-none cursor-pointer"
                        defaultValue=""
                      >
                        <option value="" disabled>⏰ Snooze...</option>
                        <option value="5" className="bg-yellow-500 text-white">5 minutes</option>
                        <option value="10" className="bg-yellow-500 text-white">10 minutes</option>
                        <option value="15" className="bg-yellow-500 text-white">15 minutes</option>
                        <option value="30" className="bg-yellow-500 text-white">30 minutes</option>
                        <option value="60" className="bg-yellow-500 text-white">1 hour</option>
                      </select>
                    </div>

                    <motion.button
                      onClick={handleDismiss}
                      className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white py-3 px-4 rounded-xl font-semibold shadow-lg transition-all duration-200"
                      whileHover={{ scale: 1.02, boxShadow: "0 8px 20px rgba(107, 114, 128, 0.3)" }}
                      whileTap={{ scale: 0.98 }}
                    >
                      ⏭️ Skip
                    </motion.button>
                  </div>
                </div>

                {/* Close hint */}
                <p className="text-center text-xs text-gray-500 mt-4">
                  🔊 Sound will continue until you respond
                  {escalationLevel > 0 && (
                    <span className={`block mt-1 font-medium ${
                      isCritical ? 'text-red-600' : 'text-orange-600'
                    }`}>
                      {isCritical 
                        ? 'Critical alert - sounds every 5 seconds'
                        : 'Urgent alert - sounds every 8 seconds'
                      }
                    </span>
                  )}
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

/**
 * Notification Manager Component
 * Manages the display of notification modals
 */
export const NotificationManager = () => {
  const [currentNotification, setCurrentNotification] = useState(null)
  const [notificationQueue, setNotificationQueue] = useState([])
  const { logAdherence } = useSchedule()

  // Function to show a notification
  const showNotification = (notificationData) => {
    if (currentNotification) {
      // Add to queue if another notification is showing
      setNotificationQueue(prev => [...prev, notificationData])
    } else {
      setCurrentNotification(notificationData)
    }
  }

  // Function to show next notification from queue
  const showNextNotification = () => {
    if (notificationQueue.length > 0) {
      const nextNotification = notificationQueue[0]
      setNotificationQueue(prev => prev.slice(1))
      setCurrentNotification(nextNotification)
    }
  }

  const handleDismiss = async () => {
    // Log as skipped/missed when dismissed
    if (currentNotification?.schedule_id) {
      try {
        const today = new Date().toISOString().split('T')[0]
        await logAdherence(currentNotification.schedule_id, today, false)
        console.log('Medication marked as skipped:', currentNotification)
      } catch (error) {
        console.error('Failed to log skipped medication:', error)
      }
    }
    setCurrentNotification(null)
    setTimeout(showNextNotification, 500)
  }

  const handleTaken = async (notification) => {
    // Handle medication taken logic here
    if (notification?.schedule_id && notification.schedule_id !== 'unknown') {
      try {
        const today = new Date().toISOString().split('T')[0]
        await logAdherence(notification.schedule_id, today, true)
        console.log('Medication marked as taken:', notification)
        
        // Clear notification cooldown to prevent duplicates
        notificationPollingService.clearNotificationCooldown(notification.schedule_id)
        
        // Remove from precise scheduler to prevent duplicate timers
        notificationScheduler.removeSchedule(parseInt(notification.schedule_id))
      } catch (error) {
        console.error('Failed to log medication taken:', error)
      }
    }
    setCurrentNotification(null)
    setTimeout(showNextNotification, 500)
  }

  const handleSnooze = (notification, snoozeMinutes = 15) => {
    // Handle snooze logic here - could reschedule the notification
    console.log(`Medication snoozed for ${snoozeMinutes} minutes:`, notification)
    setCurrentNotification(null)
    setTimeout(showNextNotification, 500)
    
    // Reschedule for specified minutes later with escalated urgency
    setTimeout(() => {
      showNotification({
        ...notification,
        message: `Snooze reminder: ${notification.message}`,
        urgent: true,
        escalation_level: (notification.escalation_level || 0) + 1,
        snoozed_from: new Date().toISOString()
      })
    }, snoozeMinutes * 60 * 1000)
  }

  // Expose the showNotification function globally
  useEffect(() => {
    window.showNotificationModal = showNotification
    return () => {
      delete window.showNotificationModal
    }
  }, [])

  return (
    <NotificationModal
      notification={currentNotification}
      onDismiss={handleDismiss}
      onTaken={handleTaken}
      onSnooze={handleSnooze}
    />
  )
}

export default NotificationModal