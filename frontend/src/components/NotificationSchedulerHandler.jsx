import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import notificationScheduler from '../services/notificationScheduler'

/**
 * Notification Scheduler Handler Component
 * Manages the precise notification scheduler lifecycle
 * Starts/stops the scheduler based on authentication status
 * Includes watchdog to ensure scheduler stays active
 */
const NotificationSchedulerHandler = () => {
  const { user, isAuthenticated } = useAuth()
  const watchdogRef = useRef(null)
  const lastActivityRef = useRef(Date.now())

  useEffect(() => {
    let mounted = true

    const initializeScheduler = async () => {
      // Only initialize if user is authenticated and component is still mounted
      if (user && isAuthenticated() && mounted) {
        try {
          console.log('🚀 Starting notification scheduler for authenticated user')
          await notificationScheduler.initialize()
          lastActivityRef.current = Date.now()
        } catch (error) {
          console.error('❌ Failed to initialize notification scheduler:', error)
        }
      }
    }

    const stopScheduler = () => {
      console.log('🛑 Stopping notification scheduler')
      notificationScheduler.stop()
    }

    // Initialize scheduler when user logs in
    if (user && isAuthenticated()) {
      initializeScheduler()
    } else {
      // Stop scheduler when user logs out
      stopScheduler()
    }

    // Cleanup function
    return () => {
      mounted = false
      stopScheduler()
    }
  }, [user, isAuthenticated])

  // Watchdog to ensure scheduler stays active
  useEffect(() => {
    if (!user || !isAuthenticated()) {
      return
    }

    const startWatchdog = () => {
      // Clear existing watchdog
      if (watchdogRef.current) {
        clearInterval(watchdogRef.current)
      }

      watchdogRef.current = setInterval(async () => {
        const status = notificationScheduler.getStatus()
        const now = Date.now()
        
        // Check if scheduler is running and has been active recently
        if (!status.isRunning) {
          console.log('⚠️ Notification scheduler stopped running - restarting...')
          try {
            await notificationScheduler.initialize()
            lastActivityRef.current = now
          } catch (error) {
            console.error('❌ Failed to restart notification scheduler:', error)
          }
        } else if (status.activeSchedules === 0 && (now - lastActivityRef.current) > 10 * 60 * 1000) {
          // If no active schedules for more than 10 minutes, reload
          console.log('🔄 No active schedules detected - reloading scheduler...')
          try {
            await notificationScheduler.loadAndScheduleToday()
            lastActivityRef.current = now
          } catch (error) {
            console.error('❌ Failed to reload scheduler:', error)
          }
        }

        // Log status in development
        if (process.env.NODE_ENV === 'development') {
          console.log('📊 Notification Scheduler Status:', {
            ...status,
            lastActivity: new Date(lastActivityRef.current).toLocaleTimeString()
          })
        }
      }, 60000) // Check every minute
    }

    // Start watchdog
    startWatchdog()

    // Page visibility API to handle tab switching and browser minimization
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Page became visible - checking scheduler status')
        const status = notificationScheduler.getStatus()
        
        if (!status.isRunning) {
          console.log('🔄 Scheduler stopped while page was hidden - restarting...')
          try {
            await notificationScheduler.initialize()
            lastActivityRef.current = Date.now()
          } catch (error) {
            console.error('❌ Failed to restart scheduler after visibility change:', error)
          }
        }
      }
    }

    // Focus event to handle browser window focus
    const handleFocus = async () => {
      console.log('🎯 Window gained focus - checking scheduler status')
      const status = notificationScheduler.getStatus()
      
      if (!status.isRunning) {
        console.log('🔄 Scheduler stopped while window was unfocused - restarting...')
        try {
          await notificationScheduler.initialize()
          lastActivityRef.current = Date.now()
        } catch (error) {
          console.error('❌ Failed to restart scheduler after focus:', error)
        }
      }
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    // Cleanup function
    return () => {
      if (watchdogRef.current) {
        clearInterval(watchdogRef.current)
        watchdogRef.current = null
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user, isAuthenticated])

  return null // This component doesn't render anything
}

export default NotificationSchedulerHandler