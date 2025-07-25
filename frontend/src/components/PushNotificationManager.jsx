import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import pushNotificationService from '../services/notificationService'

/**
 * Push Notification Manager Component
 * Professional UX component for managing browser push notifications
 * Handles permission requests, settings, and notification display
 */
const PushNotificationManager = ({ children }) => {
  const [permissionStatus, setPermissionStatus] = useState('default')
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [activeNotifications, setActiveNotifications] = useState([])

  useEffect(() => {
    // Initialize notification service status
    setIsSupported(pushNotificationService.isNotificationSupported())
    setPermissionStatus(pushNotificationService.getPermissionStatus())

    if (pushNotificationService.getPermissionStatus() === 'default') {
      // Show permission request after a delay
      const timer = setTimeout(() => {
        setShowPermissionModal(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  /**
   * Handle permission request with professional messaging
   */
  const handleRequestPermission = async () => {
    try {
      const permission = await pushNotificationService.requestPermission()
      setPermissionStatus(permission)
      setShowPermissionModal(false)
      
      if (permission === 'granted') {
        // Show success message
        console.log('✅ Push notifications enabled successfully')
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error)
    }
  }

  /**
   * Handle permission denial
   */
  const handleDenyPermission = () => {
    setShowPermissionModal(false)
    setPermissionStatus('denied')
  }

  /**
   * Test notification functionality
   */
  const handleTestNotification = async () => {
    try {
      await pushNotificationService.testNotification()
    } catch (error) {
      console.error('Error testing notification:', error)
    }
  }

  /**
   * Permission Request Modal with Professional Design
   */
  const PermissionModal = () => (
    <AnimatePresence>
      {showPermissionModal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && handleDenyPermission()}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Modal Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-pillpulse-blue to-pillpulse-teal rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-white">🔔</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Stay On Track with Smart Reminders
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Get personalized medication alerts that help you maintain perfect adherence and build healthy habits.
              </p>
            </div>

            {/* Benefits List */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 text-sm">✓</span>
                </div>
                <span className="text-gray-700 text-sm">AI-powered personalized reminders</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 text-sm">🧠</span>
                </div>
                <span className="text-gray-700 text-sm">Smart timing based on your habits</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 text-sm">📊</span>
                </div>
                <span className="text-gray-700 text-sm">Adherence insights and coaching</span>
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="bg-gray-50 rounded-lg p-3 mb-6">
              <div className="flex items-start space-x-2">
                <span className="text-gray-500 text-xs mt-0.5">🔒</span>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Your privacy is protected. Notifications are processed locally and we never access your personal data without permission.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <motion.button
                onClick={handleRequestPermission}
                className="flex-1 bg-gradient-to-r from-pillpulse-blue to-pillpulse-teal text-white py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 shadow-lg"
                whileHover={{ scale: 1.02, boxShadow: "0 8px 25px rgba(33, 150, 243, 0.3)" }}
                whileTap={{ scale: 0.98 }}
              >
                Enable Notifications
              </motion.button>
              <motion.button
                onClick={handleDenyPermission}
                className="px-4 py-3 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Not Now
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  /**
   * Notification Settings Modal
   */
  const SettingsModal = () => (
    <AnimatePresence>
      {showSettingsModal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && setShowSettingsModal(false)}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Notification Settings</h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Permission Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-800">Browser Notifications</h3>
                  <p className="text-sm text-gray-600">
                    Status: {permissionStatus === 'granted' ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  permissionStatus === 'granted' ? 'bg-green-500' : 'bg-gray-400'
                }`} />
              </div>

              {/* Test Notification */}
              {permissionStatus === 'granted' && (
                <motion.button
                  onClick={handleTestNotification}
                  className="w-full bg-pillpulse-blue text-white py-3 px-4 rounded-lg font-medium text-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Test Notification
                </motion.button>
              )}

              {/* Enable Notifications if Disabled */}
              {permissionStatus !== 'granted' && (
                <motion.button
                  onClick={handleRequestPermission}
                  className="w-full bg-gradient-to-r from-pillpulse-blue to-pillpulse-teal text-white py-3 px-4 rounded-lg font-medium text-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Enable Notifications
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  /**
   * Notification Status Indicator (for settings page or dashboard)
   */
  const NotificationStatusIndicator = () => {
    if (!isSupported) {
      return (
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
          <span>Push notifications not supported</span>
        </div>
      )
    }

    const statusConfig = {
      granted: {
        color: 'text-green-600',
        bgColor: 'bg-green-500',
        text: 'Push notifications enabled',
        icon: '✓'
      },
      denied: {
        color: 'text-red-600',
        bgColor: 'bg-red-500',
        text: 'Push notifications blocked',
        icon: '✗'
      },
      default: {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-500',
        text: 'Push notifications pending',
        icon: '?'
      }
    }

    const config = statusConfig[permissionStatus] || statusConfig.default

    return (
      <div className={`flex items-center space-x-2 text-sm ${config.color}`}>
        <span className={`w-2 h-2 ${config.bgColor} rounded-full`}></span>
        <span>{config.text}</span>
        <button
          onClick={() => setShowSettingsModal(true)}
          className="text-xs text-pillpulse-blue hover:underline ml-2"
        >
          Settings
        </button>
      </div>
    )
  }

  // Public API for other components
  const pushNotificationAPI = {
    showMedicationReminder: pushNotificationService.showMedicationReminder.bind(pushNotificationService),
    showDailySummary: pushNotificationService.showDailySummary.bind(pushNotificationService),
    showMotivationNotification: pushNotificationService.showMotivationNotification.bind(pushNotificationService),
    requestPermission: handleRequestPermission,
    testNotification: handleTestNotification,
    permissionStatus,
    isSupported,
    NotificationStatusIndicator
  }

  return (
    <>
      {/* Pass notification API to children via context or props */}
      {typeof children === 'function' ? children(pushNotificationAPI) : children}
      
      {/* Modals */}
      <PermissionModal />
      <SettingsModal />
    </>
  )
}

/**
 * Notification Permission Badge Component
 * Lightweight component for showing notification status in UI
 */
export const NotificationPermissionBadge = () => {
  const [permissionStatus, setPermissionStatus] = useState('default')

  useEffect(() => {
    setPermissionStatus(pushNotificationService.getPermissionStatus())
  }, [])

  if (!pushNotificationService.isNotificationSupported()) {
    return null
  }

  const handleClick = async () => {
    if (permissionStatus !== 'granted') {
      try {
        const permission = await pushNotificationService.requestPermission()
        setPermissionStatus(permission)
      } catch (error) {
        console.error('Error requesting permission:', error)
      }
    }
  }

  const statusConfig = {
    granted: { icon: '🔔', color: 'text-green-600', bg: 'bg-green-100' },
    denied: { icon: '🔕', color: 'text-red-600', bg: 'bg-red-100' },
    default: { icon: '🔔', color: 'text-yellow-600', bg: 'bg-yellow-100' }
  }

  const config = statusConfig[permissionStatus] || statusConfig.default

  return (
    <motion.button
      onClick={handleClick}
      className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} hover:opacity-80 transition-opacity`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={`Notifications: ${permissionStatus}`}
    >
      <span>{config.icon}</span>
      <span className="hidden sm:inline">
        {permissionStatus === 'granted' ? 'On' : 'Off'}
      </span>
    </motion.button>
  )
}

export default PushNotificationManager