import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useSchedule } from '../context/ScheduleContext'
import { validateMedicationForm } from '../utils/validation'
import { LoadingStates, ButtonLoader } from '../components/LoadingSpinner'

/**
 * User Dashboard Component
 * Main dashboard interface for medication schedule management and adherence tracking
 * Displays today's medications, allows adding new schedules, and tracks adherence
 * Features responsive design with animations and real-time updates
 */
const UserDashboard = () => {
  const { user, isAuthenticated } = useAuth()
  const {
    schedules,
    loading,
    error,
    createSchedule,
    logAdherence,
    getTodaysSchedules,
    getAdherenceStatus,
    setError
  } = useSchedule()

  // Component state for form handling and UI interactions
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    medication_name: '',
    dosage: '',
    time: '',
    frequency: 'daily'
  })
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState({})

  // Get today's date in YYYY-MM-DD format for adherence tracking
  const today = new Date().toISOString().split('T')[0]
  const todaysSchedules = getTodaysSchedules() || []

  /**
   * Handle input changes in the add medication form
   * Updates form data state with new values and clears field-specific errors
   * @param {Event} e - Input change event
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear field-specific error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
    
    // Clear general error when user makes changes
    if (error) {
      setError('')
    }
  }

  /**
   * Handle form submission for adding new medication schedule
   * Validates input, creates schedule via API, and resets form
   * @param {Event} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate form using validation utility
    const validation = validateMedicationForm(formData)
    
    if (!validation.isValid) {
      setFormErrors(validation.errors)
      setError(validation.firstError)
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      setFormErrors({})
      
      // Create new schedule via context
      await createSchedule(formData)
      
      // Reset form and close modal
      setFormData({
        medication_name: '',
        dosage: '',
        time: '',
        frequency: 'daily'
      })
      setShowAddForm(false)
    } catch (err) {
      // Error is handled by context
      console.error('Failed to create schedule:', err)
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Handle medication adherence logging
   * Records whether user took their medication for the day
   * @param {number} scheduleId - ID of the medication schedule
   * @param {boolean} taken - Whether medication was taken
   */
  const handleAdherenceLog = async (scheduleId, taken) => {
    try {
      await logAdherence(scheduleId, today, taken)
    } catch (err) {
      console.error('Failed to log adherence:', err)
    }
  }

  /**
   * Format time string for display
   * Converts 24-hour time to 12-hour format with AM/PM
   * @param {string} time - Time in HH:MM format
   * @returns {string} Formatted time string
   */
  const formatTime = (time) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  // Route protection is now handled by PrivateRoute component

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          Welcome back, {user?.email?.split('@')[0]}
        </h2>
        <p className="text-gray-600">
          Manage your medication schedule and track your adherence
        </p>
      </motion.div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Today's Schedule (60% on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Error Display */}
          {error && (
            <motion.div
              className="bg-red-50 border border-red-200 rounded-lg p-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-red-700">{error}</p>
            </motion.div>
          )}

          {/* Today's Medications Section */}
          <motion.div
            className="bg-white rounded-lg shadow-md p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Today's Medications</h2>
            
            {loading ? (
              <LoadingStates.List items={3} />
            ) : todaysSchedules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No medications scheduled for today.</p>
                <p className="text-sm mt-2">Add your first medication to get started!</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {todaysSchedules.map((schedule) => {
                  const adherenceStatus = getAdherenceStatus(schedule.id, today)
                  
                  return (
                    <motion.div
                      key={schedule.id}
                      className={`border rounded-lg p-4 transition-all duration-200 ${
                        adherenceStatus === true
                          ? 'bg-green-50 border-green-200'
                          : adherenceStatus === false
                          ? 'bg-red-50 border-red-200'
                          : 'bg-gray-50 border-gray-200 hover:border-pillpulse-blue'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      layout
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {schedule.medication_name}
                          </h3>
                          <p className="text-sm text-gray-600">{schedule.dosage}</p>
                          <p className="text-sm text-pillpulse-blue font-medium">
                            {formatTime(schedule.time)}
                          </p>
                        </div>
                        
                        {/* Adherence Status Indicator */}
                        {adherenceStatus !== null && (
                          <div className={`w-3 h-3 rounded-full ${
                            adherenceStatus ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                        )}
                      </div>
                      
                      {/* Adherence Buttons */}
                      <div className="flex gap-2">
                        <motion.button
                          onClick={() => handleAdherenceLog(schedule.id, true)}
                          className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                            adherenceStatus === true
                              ? 'bg-green-500 text-white'
                              : 'bg-green-100 hover:bg-green-200 text-green-800'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          ✓ Taken
                        </motion.button>
                        <motion.button
                          onClick={() => handleAdherenceLog(schedule.id, false)}
                          className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                            adherenceStatus === false
                              ? 'bg-red-500 text-white'
                              : 'bg-red-100 hover:bg-red-200 text-red-800'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          ✗ Missed
                        </motion.button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* All Schedules Section */}
          <motion.div
            className="bg-white rounded-lg shadow-md p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">All Medications</h2>
            
            {!Array.isArray(schedules) || schedules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>{loading ? 'Loading medications...' : 'No medications added yet.'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Medication</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Dosage</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Time</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Frequency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((schedule) => (
                      <motion.tr
                        key={schedule.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <td className="py-3 px-4 font-medium text-gray-800">
                          {schedule.medication_name}
                        </td>
                        <td className="py-3 px-4 text-gray-600">{schedule.dosage}</td>
                        <td className="py-3 px-4 text-gray-600">{formatTime(schedule.time)}</td>
                        <td className="py-3 px-4">
                          <span className="inline-block bg-pillpulse-blue text-white text-xs px-2 py-1 rounded-full">
                            {schedule.frequency}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column - Analytics (40% on desktop) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Streak Counter */}
          <motion.div
            className="bg-white rounded-lg shadow-md p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="text-center">
              <motion.div
                className="w-20 h-20 bg-pillpulse-green rounded-full flex items-center justify-center mx-auto mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <span className="text-white font-bold text-2xl">🔥</span>
              </motion.div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Streak Counter</h3>
              <p className="text-3xl font-bold text-pillpulse-green mb-2">5 Days</p>
              <p className="text-sm text-gray-600">Keep it up!</p>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            className="bg-white rounded-lg shadow-md p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <motion.button
                onClick={() => setShowAddForm(true)}
                className="w-full bg-pillpulse-blue hover:bg-pillpulse-teal text-white py-3 px-4 rounded-md text-sm font-medium transition-colors duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Add Schedule
              </motion.button>
              <motion.button
                className="w-full bg-pillpulse-green hover:bg-green-600 text-white py-3 px-4 rounded-md text-sm font-medium transition-colors duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                View Analytics
              </motion.button>
              <motion.button
                className="w-full bg-pillpulse-teal hover:bg-teal-600 text-white py-3 px-4 rounded-md text-sm font-medium transition-colors duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Caregiver Sync
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Add Medication Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddForm(false)}
          >
            <motion.div
              className="bg-white rounded-lg p-6 w-full max-w-md"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Add New Medication</h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Medication Name Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medication Name *
                  </label>
                  <input
                    type="text"
                    name="medication_name"
                    value={formData.medication_name}
                    onChange={handleInputChange}
                    className={`input-field ${formErrors.medication_name ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="e.g., Aspirin"
                    required
                  />
                  {formErrors.medication_name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.medication_name}</p>
                  )}
                </div>

                {/* Dosage Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dosage *
                  </label>
                  <input
                    type="text"
                    name="dosage"
                    value={formData.dosage}
                    onChange={handleInputChange}
                    className={`input-field ${formErrors.dosage ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="e.g., 100mg, 1 tablet"
                    required
                  />
                  {formErrors.dosage && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.dosage}</p>
                  )}
                </div>

                {/* Time Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time *
                  </label>
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    className={`input-field ${formErrors.time ? 'border-red-500 focus:ring-red-500' : ''}`}
                    required
                  />
                  {formErrors.time && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.time}</p>
                  )}
                </div>

                {/* Frequency Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleInputChange}
                    className="input-field"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 btn-secondary"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? <ButtonLoader text="Adding..." /> : 'Add Medication'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default UserDashboard