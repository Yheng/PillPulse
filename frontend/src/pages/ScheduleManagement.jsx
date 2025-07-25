import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSchedule } from '../context/ScheduleContext'
import { validateMedicationForm } from '../utils/validation'
import { LoadingStates, ButtonLoader } from '../components/LoadingSpinner'

/**
 * Schedule Management Component
 * Allows users to create, edit, and delete medication schedules
 * Features modal-based forms and list view with edit/delete actions
 */
const ScheduleManagement = () => {
  const {
    schedules,
    loading,
    error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    setError
  } = useSchedule()

  // Component state for form handling
  const [showModal, setShowModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [formData, setFormData] = useState({
    medication_name: '',
    dosage: '',
    time: '',
    frequency: 'daily',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)

  /**
   * Handle input changes in the form
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
   * Open modal for adding new schedule
   */
  const handleAdd = () => {
    setEditingSchedule(null)
    setFormData({
      medication_name: '',
      dosage: '',
      time: '',
      frequency: 'daily',
      notes: ''
    })
    setFormErrors({})
    setShowModal(true)
  }

  /**
   * Open modal for editing existing schedule
   * @param {Object} schedule - Schedule to edit
   */
  const handleEdit = (schedule) => {
    setEditingSchedule(schedule)
    setFormData({
      medication_name: schedule.medication_name,
      dosage: schedule.dosage,
      time: schedule.time,
      frequency: schedule.frequency,
      notes: schedule.notes || ''
    })
    setFormErrors({})
    setShowModal(true)
  }

  /**
   * Handle form submission
   * @param {Event} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate form
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
      
      if (editingSchedule) {
        await updateSchedule(editingSchedule.id, formData)
      } else {
        await createSchedule(formData)
      }
      
      setShowModal(false)
    } catch (err) {
      console.error('Failed to save schedule:', err)
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Handle schedule deletion
   * @param {number} id - Schedule ID to delete
   */
  const handleDelete = async (id) => {
    try {
      await deleteSchedule(id)
      setShowDeleteConfirm(null)
    } catch (err) {
      console.error('Failed to delete schedule:', err)
    }
  }

  /**
   * Format time string for display
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

  return (
    <div className="space-y-6">
      {/* Page Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Schedule Management</h1>
          <p className="text-gray-600 mt-1">Manage all your medication schedules</p>
        </div>
        <motion.button
          onClick={handleAdd}
          className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          ✨ Add New Schedule
        </motion.button>
      </div>
      {/* Error Display */}
      {error && (
        <motion.div
          className="bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-xl p-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-red-700 font-medium">{error}</p>
        </motion.div>
      )}

      {/* Schedules List */}
      <motion.div
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Your Medication Schedules</h2>
        
        {loading ? (
          <LoadingStates.List items={5} />
        ) : !Array.isArray(schedules) || schedules.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">💊</span>
            </div>
            <p className="text-xl font-medium mb-2">No medication schedules yet</p>
            <p className="text-sm">Click "Add New Schedule" to create your first one!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {schedules.map((schedule) => (
              <motion.div
                key={schedule.id}
                className="bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 hover:border-blue-400 hover:shadow-lg transition-all duration-200"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                layout
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 text-lg mb-1">
                      {schedule.medication_name}
                    </h3>
                    <p className="text-gray-600 mb-2">{schedule.dosage}</p>
                    <div className="flex items-center space-x-3">
                      <p className="text-blue-600 font-semibold">
                        ⏰ {formatTime(schedule.time)}
                      </p>
                      <span className="inline-block bg-gradient-to-r from-blue-500 to-teal-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                        {schedule.frequency}
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <motion.button
                      onClick={() => handleEdit(schedule)}
                      className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Edit"
                    >
                      ✏️
                    </motion.button>
                    <motion.button
                      onClick={() => setShowDeleteConfirm(schedule.id)}
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Delete"
                    >
                      🗑️
                    </motion.button>
                  </div>
                </div>
                
                {schedule.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-200/50">
                    <p className="text-sm text-gray-600 italic">{schedule.notes}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setShowModal(false)}
            >
              <motion.div
                className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  {editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}
                </h3>
                
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
                      placeholder="e.g., Aspirin, Metformin"
                      required
                      disabled={submitting}
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
                      placeholder="e.g., 100mg, 1 tablet, 2 capsules"
                      required
                      disabled={submitting}
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
                      disabled={submitting}
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
                      disabled={submitting}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="as-needed">As Needed</option>
                    </select>
                  </div>

                  {/* Notes Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="Any additional notes or instructions..."
                      rows={3}
                      disabled={submitting}
                    />
                  </div>

                  {/* Form Actions */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 bg-pillpulse-gray hover:bg-gray-400 text-gray-800 py-3 px-4 rounded-md font-medium transition-colors duration-200"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-pillpulse-green hover:bg-pillpulse-teal text-white py-3 px-4 rounded-md font-medium transition-colors duration-200"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ButtonLoader text={editingSchedule ? "Saving..." : "Adding..."} />
                      ) : (
                        editingSchedule ? 'Save Changes' : 'Add Schedule'
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(null)}
            >
              <motion.div
                className="bg-white rounded-lg p-6 w-full max-w-sm"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Delete Schedule</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete this medication schedule? This action cannot be undone.
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 bg-pillpulse-gray hover:bg-gray-400 text-gray-800 py-2 px-4 rounded-md font-medium transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <motion.button
                    onClick={() => handleDelete(showDeleteConfirm)}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md font-medium transition-colors duration-200"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Delete
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  )
}

export default ScheduleManagement