/**
 * Notification Sound Utility
 * Manages notification sounds for medication reminders
 * Uses Web Audio API to generate modern notification tones
 */

class NotificationSound {
  constructor() {
    this.audioContext = null
    this.isEnabled = true
    this.initialize()
  }

  /**
   * Initialize Web Audio Context
   */
  initialize() {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
    } catch (error) {
      console.warn('Web Audio API not supported:', error)
      this.isEnabled = false
    }
  }

  /**
   * Resume audio context if suspended (required for user interaction)
   */
  async resumeContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  /**
   * Create a modern notification tone
   * Generates a pleasant, attention-getting sound
   * @param {number} duration - Duration in seconds (default: 2)
   * @param {number} volume - Volume level 0-1 (default: 0.3)
   */
  async playNotificationTone(duration = 2, volume = 0.3) {
    if (!this.isEnabled || !this.audioContext) {
      console.warn('Audio not available, using fallback')
      this.playFallbackSound()
      return
    }

    try {
      await this.resumeContext()

      const now = this.audioContext.currentTime
      
      // Create main oscillator for the base tone
      const oscillator1 = this.audioContext.createOscillator()
      const gainNode1 = this.audioContext.createGain()
      
      // Create second oscillator for harmony
      const oscillator2 = this.audioContext.createOscillator()
      const gainNode2 = this.audioContext.createGain()
      
      // Create filter for warmth
      const filter = this.audioContext.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(800, now)
      
      // Configure first oscillator (main tone)
      oscillator1.type = 'sine'
      oscillator1.frequency.setValueAtTime(523.25, now) // C5
      oscillator1.frequency.setValueAtTime(659.25, now + 0.3) // E5
      oscillator1.frequency.setValueAtTime(523.25, now + 0.6) // C5
      
      // Configure second oscillator (harmony)
      oscillator2.type = 'sine'
      oscillator2.frequency.setValueAtTime(659.25, now) // E5
      oscillator2.frequency.setValueAtTime(783.99, now + 0.3) // G5
      oscillator2.frequency.setValueAtTime(659.25, now + 0.6) // E5
      
      // Set up gain envelopes for smooth attack and decay
      gainNode1.gain.setValueAtTime(0, now)
      gainNode1.gain.linearRampToValueAtTime(volume, now + 0.1)
      gainNode1.gain.exponentialRampToValueAtTime(volume * 0.7, now + 0.5)
      gainNode1.gain.exponentialRampToValueAtTime(0.001, now + duration)
      
      gainNode2.gain.setValueAtTime(0, now)
      gainNode2.gain.linearRampToValueAtTime(volume * 0.6, now + 0.15)
      gainNode2.gain.exponentialRampToValueAtTime(volume * 0.4, now + 0.5)
      gainNode2.gain.exponentialRampToValueAtTime(0.001, now + duration)
      
      // Connect the audio graph
      oscillator1.connect(gainNode1)
      oscillator2.connect(gainNode2)
      gainNode1.connect(filter)
      gainNode2.connect(filter)
      filter.connect(this.audioContext.destination)
      
      // Start and stop the oscillators
      oscillator1.start(now)
      oscillator2.start(now)
      oscillator1.stop(now + duration)
      oscillator2.stop(now + duration)
      
    } catch (error) {
      console.error('Error playing notification sound:', error)
      this.playFallbackSound()
    }
  }

  /**
   * Fallback sound using system beep or alert
   */
  playFallbackSound() {
    try {
      // Try to create a simple beep using data URL
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmzEAAAAAElFTkSuQmCC')
      audio.play().catch(() => {
        // If audio fails, try the system beep
        console.beep && console.beep()
      })
    } catch (error) {
      console.warn('Fallback sound failed:', error)
    }
  }

  /**
   * Play a subtle test sound for notification preview
   */
  async playTestTone() {
    await this.playNotificationTone(1.5, 0.2)
  }

  /**
   * Play the full medication reminder tone
   */
  async playReminderTone() {
    await this.playNotificationTone(3, 0.4)
  }

  /**
   * Enable/disable sound
   * @param {boolean} enabled - Whether sound is enabled
   */
  setEnabled(enabled) {
    this.isEnabled = enabled
  }

  /**
   * Check if sound is supported
   * @returns {boolean} True if audio is supported
   */
  isSupported() {
    return this.isEnabled && !!this.audioContext
  }
}

// Create and export singleton instance
export const notificationSound = new NotificationSound()

/**
 * Show browser notification with sound
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} options - Additional notification options
 * @returns {Promise<Notification>} Browser notification
 */
export const showNotificationWithSound = async (title, body, options = {}) => {
  // Play notification sound
  await notificationSound.playReminderTone()

  // Request notification permission if not granted
  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }

  // Show browser notification if permitted
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body: body,
      icon: '/icon-192x192.png', // Add your app icon path
      badge: '/icon-192x192.png',
      tag: 'pillpulse-reminder',
      requireInteraction: true,
      silent: true, // We handle sound ourselves
      ...options
    })

    // Auto-close after 10 seconds if not clicked
    setTimeout(() => {
      notification.close()
    }, 10000)

    return notification
  }

  return null
}

/**
 * Test notification function for settings page (modal-based)
 * @returns {Promise<void>}
 */
export const testNotification = async () => {
  // Use the modal-based notification system instead
  if (window.showNotificationModal) {
    window.showNotificationModal({
      medication_name: 'Test Medication',
      dosage: '10mg',
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      message: 'This is how your medication reminders will look and sound! The alert will continue ringing until you respond.',
      schedule_id: 'test',
      urgent: false
    })
  } else {
    // Fallback to browser notification
    await showNotificationWithSound(
      '💊 PillPulse Test',
      'This is how your medication reminders will look and sound!',
      {
        icon: '/icon-192x192.png',
        actions: [
          { action: 'taken', title: '✅ Taken' },
          { action: 'skip', title: '⏭️ Skip' }
        ]
      }
    )
  }
}

export default notificationSound