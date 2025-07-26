import { useEffect } from 'react'
import { useSchedule } from '../context/ScheduleContext'

/**
 * Service Worker Handler Component
 * Registers service worker and handles notification action messages
 */
const ServiceWorkerHandler = () => {
  const { logAdherence } = useSchedule()

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registered:', registration.scope)
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error)
        })
    }

    // Listen for messages from service worker
    const handleMessage = async (event) => {
      if (event.data && event.data.type === 'notification-action') {
        const { action, data } = event.data
        
        console.log('Received notification action:', action, data)
        
        if (data.schedule_id && data.schedule_id !== 'unknown' && data.schedule_id !== 'test') {
          try {
            const today = new Date().toISOString().split('T')[0]
            
            switch (action) {
              case 'taken':
                await logAdherence(data.schedule_id, today, true)
                console.log('Medication marked as taken via notification')
                break
                
              case 'missed':
                await logAdherence(data.schedule_id, today, false)
                console.log('Medication marked as missed via notification')
                break
                
              case 'snooze':
                // Handle snooze - could trigger a new notification after 15 minutes
                console.log('Medication snoozed via notification')
                // You could implement snooze logic here
                break
                
              default:
                console.warn('Unknown notification action:', action)
            }
          } catch (error) {
            console.error('Failed to handle notification action:', error)
          }
        }
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)

    // Cleanup
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [logAdherence])

  return null // This component doesn't render anything
}

export default ServiceWorkerHandler