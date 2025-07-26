/**
 * Service Worker for PillPulse
 * Handles push notification actions and background tasks
 * Includes background notification scheduling for when app is not active
 */

const CACHE_NAME = 'pillpulse-v1'
const DB_NAME = 'pillpulse-sw'
const DB_VERSION = 1

// Initialize IndexedDB for storing scheduled notifications
let db = null

// Initialize database
async function initDB() {
  if (db) return db
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result
      
      // Create schedules store
      if (!database.objectStoreNames.contains('schedules')) {
        const scheduleStore = database.createObjectStore('schedules', { keyPath: 'id' })
        scheduleStore.createIndex('time', 'time', { unique: false })
        scheduleStore.createIndex('date', 'date', { unique: false })
      }
      
      // Create notifications store
      if (!database.objectStoreNames.contains('notifications')) {
        const notificationStore = database.createObjectStore('notifications', { keyPath: 'id' })
        notificationStore.createIndex('scheduledTime', 'scheduledTime', { unique: false })
      }
    }
  })
}

// Store schedules for background processing
async function storeSchedules(schedules) {
  await initDB()
  const transaction = db.transaction(['schedules'], 'readwrite')
  const store = transaction.objectStore('schedules')
  
  // Clear existing schedules for today
  const today = new Date().toISOString().split('T')[0]
  await clearSchedulesForDate(today)
  
  // Store new schedules
  for (const schedule of schedules) {
    await store.put({
      ...schedule,
      date: today
    })
  }
}

// Clear schedules for a specific date
async function clearSchedulesForDate(date) {
  await initDB()
  const transaction = db.transaction(['schedules'], 'readwrite')
  const store = transaction.objectStore('schedules')
  const index = store.index('date')
  const request = index.openCursor(date)
  
  return new Promise((resolve) => {
    request.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      } else {
        resolve()
      }
    }
  })
}

// Check for due notifications
async function checkDueNotifications() {
  await initDB()
  const transaction = db.transaction(['schedules'], 'readonly')
  const store = transaction.objectStore('schedules')
  const today = new Date().toISOString().split('T')[0]
  const index = store.index('date')
  const request = index.getAll(today)
  
  return new Promise((resolve) => {
    request.onsuccess = () => {
      const schedules = request.result
      const now = new Date()
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      
      const dueSchedules = schedules.filter(schedule => {
        return schedule.time <= currentTime && !schedule.notified
      })
      
      resolve(dueSchedules)
    }
  })
}

// Show background notification
async function showBackgroundNotification(schedule) {
  const options = {
    body: `Time to take your ${schedule.dosage} dose of ${schedule.medication_name}`,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    actions: [
      {
        action: 'taken',
        title: '✅ I took it'
      },
      {
        action: 'snooze',
        title: '⏰ Snooze 15min'
      },
      {
        action: 'missed',
        title: '⏭️ Skip'
      }
    ],
    data: {
      schedule_id: schedule.id,
      medication_name: schedule.medication_name,
      dosage: schedule.dosage,
      time: schedule.time
    },
    requireInteraction: true,
    persistent: true
  }
  
  await self.registration.showNotification(
    `Medication Reminder: ${schedule.medication_name}`,
    options
  )
  
  // Mark as notified
  await markScheduleNotified(schedule.id)
}

// Mark schedule as notified
async function markScheduleNotified(scheduleId) {
  await initDB()
  const transaction = db.transaction(['schedules'], 'readwrite')
  const store = transaction.objectStore('schedules')
  const request = store.get(scheduleId)
  
  return new Promise((resolve) => {
    request.onsuccess = () => {
      const schedule = request.result
      if (schedule) {
        schedule.notified = true
        store.put(schedule)
      }
      resolve()
    }
  })
}

// Periodic background sync
setInterval(async () => {
  try {
    const dueSchedules = await checkDueNotifications()
    for (const schedule of dueSchedules) {
      await showBackgroundNotification(schedule)
    }
  } catch (error) {
    console.error('Background notification check failed:', error)
  }
}, 60000) // Check every minute

// Listen for messages from the main app
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'schedule-update') {
    await storeSchedules(event.data.schedules)
  } else if (event.data && event.data.type === 'skip-waiting') {
    self.skipWaiting()
  }
})

// Listen for notification click events
self.addEventListener('notificationclick', async (event) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  // Close the notification
  notification.close();
  
  // Handle different actions
  if (action === 'taken' || action === 'missed' || action === 'snooze') {
    event.waitUntil(
      handleNotificationAction(action, data)
    );
  } else {
    // Default click - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

/**
 * Handle notification actions
 * @param {string} action - The action taken (taken, missed, snooze)
 * @param {Object} data - Notification data including schedule_id
 */
async function handleNotificationAction(action, data) {
  try {
    // Get all clients
    const allClients = await clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });
    
    // Try to focus existing window
    if (allClients.length > 0) {
      const client = allClients[0];
      await client.focus();
      
      // Send message to the client to handle the action
      client.postMessage({
        type: 'notification-action',
        action: action,
        data: data
      });
    } else {
      // Open new window if none exists
      const newClient = await clients.openWindow('/');
      
      // Wait a bit for the client to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Send message to the new client
      newClient.postMessage({
        type: 'notification-action',
        action: action,
        data: data
      });
    }
  } catch (error) {
    console.error('Error handling notification action:', error);
  }
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'skip-waiting') {
    self.skipWaiting();
  }
});

// Activate immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});