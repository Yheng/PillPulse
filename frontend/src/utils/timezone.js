/**
 * Timezone Utilities for PillPulse
 * Handles timezone detection, conversion, and formatting for medication schedules
 * Supports user-specific timezone settings for accurate notification timing
 */

/**
 * Get user's detected timezone
 * @returns {string} IANA timezone identifier (e.g., 'America/New_York')
 */
export const getUserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch (error) {
    console.warn('Could not detect timezone, falling back to UTC:', error)
    return 'UTC'
  }
}

/**
 * Common timezone options for the settings dropdown
 * Organized by region with user-friendly labels
 */
export const TIMEZONE_OPTIONS = [
  // North America
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKST)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  
  // Canada
  { value: 'America/Toronto', label: 'Toronto (Eastern)' },
  { value: 'America/Vancouver', label: 'Vancouver (Pacific)' },
  { value: 'America/Winnipeg', label: 'Winnipeg (Central)' },
  { value: 'America/Halifax', label: 'Halifax (Atlantic)' },
  
  // Europe
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Europe/Rome', label: 'Rome (CET)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)' },
  { value: 'Europe/Stockholm', label: 'Stockholm (CET)' },
  { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
  
  // Asia
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)' },
  
  // Australia/Pacific
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEDT/AEST)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZDT/NZST)' },
  
  // Other
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
]

/**
 * Convert time from one timezone to another
 * @param {string} time - Time in HH:MM format
 * @param {string} fromTimezone - Source timezone (IANA identifier)
 * @param {string} toTimezone - Target timezone (IANA identifier)
 * @param {Date} date - Optional date context (defaults to today)
 * @returns {string} Converted time in HH:MM format
 */
export const convertTimeToTimezone = (time, fromTimezone, toTimezone, date = new Date()) => {
  try {
    const [hours, minutes] = time.split(':').map(Number)
    
    // Create a date object in the source timezone
    const sourceDate = new Date(date)
    sourceDate.setHours(hours, minutes, 0, 0)
    
    // Format in source timezone to get ISO string
    const sourceFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: fromTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    
    const sourceParts = sourceFormatter.formatToParts(sourceDate)
    const sourceISO = `${sourceParts.find(p => p.type === 'year').value}-${sourceParts.find(p => p.type === 'month').value}-${sourceParts.find(p => p.type === 'day').value}T${sourceParts.find(p => p.type === 'hour').value}:${sourceParts.find(p => p.type === 'minute').value}:00`
    
    // Parse as UTC and convert to target timezone
    const utcDate = new Date(sourceISO + 'Z')
    
    const targetFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: toTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    
    return targetFormatter.format(utcDate)
  } catch (error) {
    console.error('Error converting timezone:', error)
    return time // Return original time if conversion fails
  }
}

/**
 * Get current time in a specific timezone
 * @param {string} timezone - IANA timezone identifier
 * @returns {string} Current time in HH:MM format
 */
export const getCurrentTimeInTimezone = (timezone) => {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    
    return formatter.format(new Date())
  } catch (error) {
    console.error('Error getting current time for timezone:', error)
    return new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' })
  }
}

/**
 * Check if a scheduled time has passed in user's timezone
 * @param {string} scheduledTime - Time in HH:MM format
 * @param {string} userTimezone - User's timezone
 * @returns {boolean} True if the scheduled time has passed
 */
export const hasScheduledTimePassed = (scheduledTime, userTimezone) => {
  try {
    const currentTime = getCurrentTimeInTimezone(userTimezone)
    const [currentHours, currentMinutes] = currentTime.split(':').map(Number)
    const [scheduledHours, scheduledMinutes] = scheduledTime.split(':').map(Number)
    
    const currentTotalMinutes = currentHours * 60 + currentMinutes
    const scheduledTotalMinutes = scheduledHours * 60 + scheduledMinutes
    
    return currentTotalMinutes >= scheduledTotalMinutes
  } catch (error) {
    console.error('Error checking scheduled time:', error)
    return false
  }
}

/**
 * Format timezone display name
 * @param {string} timezone - IANA timezone identifier
 * @returns {string} Formatted timezone display string
 */
export const formatTimezoneDisplay = (timezone) => {
  const option = TIMEZONE_OPTIONS.find(tz => tz.value === timezone)
  if (option) {
    return option.label
  }
  
  // Fallback: format the timezone identifier
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    })
    
    const parts = formatter.formatToParts(now)
    const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value || timezone
    
    return `${timezone.replace(/_/g, ' ')} (${timeZoneName})`
  } catch (error) {
    return timezone
  }
}

/**
 * Get timezone offset in hours
 * @param {string} timezone - IANA timezone identifier
 * @returns {number} Offset in hours from UTC
 */
export const getTimezoneOffset = (timezone) => {
  try {
    const now = new Date()
    const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000))
    const targetTime = new Date(utc.toLocaleString('en-US', { timeZone: timezone }))
    const localTime = new Date(utc.toLocaleString('en-US', { timeZone: 'UTC' }))
    
    return (targetTime.getTime() - localTime.getTime()) / (1000 * 60 * 60)
  } catch (error) {
    console.error('Error getting timezone offset:', error)
    return 0
  }
}

/**
 * Validate timezone string
 * @param {string} timezone - Timezone to validate
 * @returns {boolean} True if timezone is valid
 */
export const isValidTimezone = (timezone) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch (error) {
    return false
  }
}

/**
 * Get medication reminder time adjusted for user timezone
 * Used for scheduling notifications at the correct local time
 * @param {string} medicationTime - Original medication time in HH:MM
 * @param {string} userTimezone - User's timezone setting
 * @param {string} systemTimezone - System/server timezone (optional)
 * @returns {Object} Timing information for notification scheduling
 */
export const getMedicationReminderTime = (medicationTime, userTimezone, systemTimezone = getUserTimezone()) => {
  try {
    const today = new Date()
    const [hours, minutes] = medicationTime.split(':').map(Number)
    
    // Create date object for medication time in user's timezone
    const medicationDateTime = new Date(today)
    medicationDateTime.setHours(hours, minutes, 0, 0)
    
    // Get the equivalent time in system timezone for scheduling
    const systemTime = convertTimeToTimezone(medicationTime, userTimezone, systemTimezone, medicationDateTime)
    
    // Check if time has passed today
    const currentUserTime = getCurrentTimeInTimezone(userTimezone)
    const hasPassed = hasScheduledTimePassed(medicationTime, userTimezone)
    
    return {
      originalTime: medicationTime,
      userTimezone: userTimezone,
      systemTime: systemTime,
      systemTimezone: systemTimezone,
      currentUserTime: currentUserTime,
      hasPassed: hasPassed,
      nextOccurrence: hasPassed ? 'tomorrow' : 'today'
    }
  } catch (error) {
    console.error('Error calculating medication reminder time:', error)
    return {
      originalTime: medicationTime,
      userTimezone: userTimezone,
      systemTime: medicationTime,
      systemTimezone: systemTimezone,
      currentUserTime: medicationTime,
      hasPassed: false,
      nextOccurrence: 'today'
    }
  }
}

export default {
  getUserTimezone,
  TIMEZONE_OPTIONS,
  convertTimeToTimezone,
  getCurrentTimeInTimezone,
  hasScheduledTimePassed,
  formatTimezoneDisplay,
  getTimezoneOffset,
  isValidTimezone,
  getMedicationReminderTime
}