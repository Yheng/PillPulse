import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from './AuthContext'

/**
 * Schedule Context for PillPulse application
 * Manages medication schedule state, CRUD operations, and adherence tracking
 * Provides schedule data and management functions throughout the application
 */

const ScheduleContext = createContext()

/**
 * Custom hook to access schedule context
 * Throws error if used outside of ScheduleProvider
 * @returns {Object} Schedule context value
 */
export const useSchedule = () => {
  const context = useContext(ScheduleContext)
  if (!context) {
    throw new Error('useSchedule must be used within a ScheduleProvider')
  }
  return context
}

/**
 * Schedule Provider Component
 * Wraps the application and provides schedule state management
 * Handles medication schedules, adherence records, and analytics data
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap
 */
export const ScheduleProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth()
  const [schedules, setSchedules] = useState([])
  const [adherenceRecords, setAdherenceRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Load user schedules when user authenticates
   * Fetches all medication schedules for the authenticated user
   */
  useEffect(() => {
    try {
      if (user && isAuthenticated && typeof isAuthenticated === 'function' && isAuthenticated()) {
        fetchSchedules()
        fetchAdherenceRecords()
      } else {
        // Clear schedules when user logs out
        setSchedules([])
        setAdherenceRecords([])
      }
    } catch (err) {
      console.error('Error in ScheduleContext useEffect:', err)
      setSchedules([])
      setAdherenceRecords([])
      setError('Failed to initialize schedule context')
    }
  }, [user, isAuthenticated])

  /**
   * Fetch adherence records for the authenticated user
   * Makes API call to retrieve adherence history
   */
  const fetchAdherenceRecords = async () => {
    try {
      setError(null)
      
      const response = await axios.get('/api/adherence')
      const adherenceData = response.data?.data
      setAdherenceRecords(Array.isArray(adherenceData) ? adherenceData : [])
    } catch (err) {
      // Silently handle adherence fetch errors to not break the app
      console.warn('Failed to fetch adherence records:', err.message)
      // Ensure adherenceRecords remains an array even on error
      setAdherenceRecords([])
    }
  }

  /**
   * Fetch all schedules for the authenticated user
   * Makes API call to retrieve medication schedules
   */
  const fetchSchedules = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await axios.get('/api/schedules')
      const schedulesData = response.data?.data?.schedules || response.data?.data
      setSchedules(Array.isArray(schedulesData) ? schedulesData : [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch schedules')
      console.error('Error fetching schedules:', err)
      // Ensure schedules remains an array even on error
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }

  /**
   * Create a new medication schedule
   * @param {Object} scheduleData - Schedule information
   * @param {string} scheduleData.medication_name - Name of medication
   * @param {string} scheduleData.dosage - Dosage amount and unit
   * @param {string} scheduleData.time - Time to take medication (HH:MM format)
   * @param {string} scheduleData.frequency - How often to take (daily, weekly, etc.)
   * @returns {Promise<Object>} Created schedule data
   */
  const createSchedule = async (scheduleData) => {
    try {
      setError(null)
      
      const response = await axios.post('/api/schedules', scheduleData)
      const newSchedule = response.data.data
      
      // Add new schedule to local state
      setSchedules(prev => Array.isArray(prev) ? [...prev, newSchedule] : [newSchedule])
      
      return newSchedule
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to create schedule'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  /**
   * Update an existing medication schedule
   * @param {number} scheduleId - ID of schedule to update
   * @param {Object} updateData - Updated schedule information
   * @returns {Promise<Object>} Updated schedule data
   */
  const updateSchedule = async (scheduleId, updateData) => {
    try {
      setError(null)
      
      const response = await axios.put(`/api/schedules/${scheduleId}`, updateData)
      const updatedSchedule = response.data.data
      
      // Update schedule in local state
      setSchedules(prev => 
        Array.isArray(prev) 
          ? prev.map(schedule => 
              schedule.id === scheduleId ? updatedSchedule : schedule
            )
          : [updatedSchedule]
      )
      
      return updatedSchedule
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to update schedule'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  /**
   * Delete a medication schedule
   * @param {number} scheduleId - ID of schedule to delete
   */
  const deleteSchedule = async (scheduleId) => {
    try {
      setError(null)
      
      await axios.delete(`/api/schedules/${scheduleId}`)
      
      // Remove schedule from local state
      setSchedules(prev => Array.isArray(prev) ? prev.filter(schedule => schedule.id !== scheduleId) : [])
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to delete schedule'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  /**
   * Log medication adherence (taken/not taken)
   * @param {number} scheduleId - ID of the medication schedule
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {boolean} taken - Whether medication was taken
   */
  const logAdherence = async (scheduleId, date, taken) => {
    try {
      setError(null)
      
      const response = await axios.post('/api/adherence', {
        schedule_id: scheduleId,
        date,
        taken
      })
      
      const adherenceRecord = response.data.data
      
      // Update adherence records in local state
      setAdherenceRecords(prev => {
        const prevArray = Array.isArray(prev) ? prev : []
        const existing = prevArray.find(record => 
          record.schedule_id === scheduleId && record.date === date
        )
        
        if (existing) {
          // Update existing record
          return prevArray.map(record => 
            record.schedule_id === scheduleId && record.date === date
              ? adherenceRecord
              : record
          )
        } else {
          // Add new record
          return [...prevArray, adherenceRecord]
        }
      })
      
      return adherenceRecord
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to log adherence'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  /**
   * Fetch analytics data for charts and reports
   * @param {Object} params - Query parameters for filtering
   * @param {string} params.start_date - Start date for data range
   * @param {string} params.end_date - End date for data range
   * @param {number} params.medication_id - Optional medication filter
   * @returns {Promise<Object>} Analytics data
   */
  const fetchAnalytics = async (params = {}) => {
    try {
      setError(null)
      
      const queryParams = new URLSearchParams(params).toString()
      const response = await axios.get(`/api/analytics?${queryParams}`)
      
      return response.data.data
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to fetch analytics'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  /**
   * Get today's schedule items
   * Returns schedules that should be taken today
   * @returns {Array} Today's medication schedules
   */
  const getTodaysSchedules = () => {
    // Ensure schedules is an array before filtering
    if (!Array.isArray(schedules)) {
      return []
    }
    
    // For now, return all daily schedules
    // In a full implementation, this would consider frequency and timing
    return schedules.filter(schedule => schedule.frequency === 'daily')
  }

  /**
   * Get adherence status for a specific schedule and date
   * @param {number} scheduleId - Schedule ID
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {boolean|null} True if taken, false if not taken, null if not logged
   */
  const getAdherenceStatus = (scheduleId, date) => {
    // Ensure adherenceRecords is an array before searching
    if (!Array.isArray(adherenceRecords)) {
      return null
    }
    
    const record = adherenceRecords.find(record => 
      record.schedule_id === scheduleId && record.date === date
    )
    return record ? record.taken : null
  }

  // Context value object containing all schedule state and methods
  const value = {
    schedules,
    adherenceRecords,
    loading,
    error,
    fetchSchedules,
    fetchAdherenceRecords,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    logAdherence,
    fetchAnalytics,
    getTodaysSchedules,
    getAdherenceStatus,
    setError
  }

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  )
}