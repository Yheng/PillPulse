import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { caregiverService } from '../services/api'
import LoadingSpinner from './LoadingSpinner'

/**
 * Patient Schedule View Component
 * Displays a patient's medication schedules for caregivers
 * Provides read-only view of all scheduled medications
 */
const PatientScheduleView = ({ patientId, accessLevel }) => {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadPatientSchedules()
  }, [patientId])

  const loadPatientSchedules = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await caregiverService.getPatientSchedules(patientId)
      
      if (response.success) {
        setSchedules(response.data.schedules || [])
      } else {
        setError('Failed to load patient schedules')
      }
    } catch (err) {
      console.error('Error loading patient schedules:', err)
      setError('Failed to load patient schedules')
    } finally {
      setLoading(false)
    }
  }

  const convertTo12HourFormat = (time24) => {
    const [hours, minutes] = time24.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const getFrequencyBadge = (frequency) => {
    const styles = {
      daily: 'bg-green-100 text-green-800',
      weekly: 'bg-blue-100 text-blue-800',
      monthly: 'bg-purple-100 text-purple-800',
      'as-needed': 'bg-orange-100 text-orange-800'
    }

    const icons = {
      daily: '📅',
      weekly: '🗓️',
      monthly: '🗓️',
      'as-needed': '💊'
    }

    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium ${styles[frequency]}`}>
        <span>{icons[frequency]}</span>
        <span className="capitalize">{frequency.replace('-', ' ')}</span>
      </span>
    )
  }

  const sortSchedulesByTime = (schedules) => {
    return schedules.sort((a, b) => {
      const timeA = a.time.split(':').map(Number)
      const timeB = b.time.split(':').map(Number)
      
      if (timeA[0] !== timeB[0]) {
        return timeA[0] - timeB[0]
      }
      return timeA[1] - timeB[1]
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={() => setError('')}
            className="text-red-500 hover:text-red-700 ml-4"
          >
            ✕
          </button>
        </div>
      </div>
    )
  }

  if (schedules.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">💊</div>
        <h3 className="text-xl font-semibold text-gray-600 mb-2">No medication schedules</h3>
        <p className="text-gray-500">This patient hasn't set up any medication schedules yet</p>
      </div>
    )
  }

  const sortedSchedules = sortSchedulesByTime(schedules)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Medication Schedules</h3>
          <p className="text-gray-600">
            {schedules.length} medication{schedules.length !== 1 ? 's' : ''} scheduled
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span>Your access:</span>
          <span className={`px-2 py-1 rounded-md text-xs font-medium ${
            accessLevel === 'view' ? 'bg-blue-100 text-blue-800' :
            accessLevel === 'edit' ? 'bg-purple-100 text-purple-800' :
            'bg-red-100 text-red-800'
          }`}>
            {accessLevel === 'view' ? 'View Only' :
             accessLevel === 'edit' ? 'View & Edit' :
             'Full Access'}
          </span>
        </div>
      </div>

      {/* Schedules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedSchedules.map((schedule, index) => (
          <motion.div
            key={schedule.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all duration-200"
          >
            {/* Medication Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="text-lg font-bold text-gray-800 mb-1">
                  {schedule.medication_name}
                </h4>
                <p className="text-gray-600 text-sm">
                  {schedule.dosage}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {convertTo12HourFormat(schedule.time)}
                </div>
                {getFrequencyBadge(schedule.frequency)}
              </div>
            </div>

            {/* Schedule Details */}
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-5 h-5 flex items-center justify-center text-xs">⏰</span>
                <span className="ml-2">
                  Take {schedule.frequency === 'daily' ? 'every day' : schedule.frequency} at {convertTo12HourFormat(schedule.time)}
                </span>
              </div>

              {schedule.notes && (
                <div className="flex items-start text-sm text-gray-600">
                  <span className="w-5 h-5 flex items-center justify-center text-xs mt-0.5">📝</span>
                  <span className="ml-2 flex-1">
                    {schedule.notes}
                  </span>
                </div>
              )}

              <div className="flex items-center text-sm text-gray-500">
                <span className="w-5 h-5 flex items-center justify-center text-xs">📅</span>
                <span className="ml-2">
                  Added {new Date(schedule.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Visual Time Indicator */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Daily Schedule</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="font-medium text-blue-600">
                    {convertTo12HourFormat(schedule.time)}
                  </span>
                </div>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-blue-500 h-1 rounded-full"
                  style={{
                    width: `${((parseInt(schedule.time.split(':')[0]) * 60 + parseInt(schedule.time.split(':')[1])) / (24 * 60)) * 100}%`
                  }}
                ></div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Schedule Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-semibold text-blue-800 mb-2">Schedule Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">
              {schedules.filter(s => s.frequency === 'daily').length}
            </div>
            <div className="text-blue-700">Daily Meds</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">
              {schedules.filter(s => s.frequency === 'weekly').length}
            </div>
            <div className="text-blue-700">Weekly Meds</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">
              {schedules.filter(s => s.frequency === 'as-needed').length}
            </div>
            <div className="text-blue-700">As Needed</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">
              {schedules.length}
            </div>
            <div className="text-blue-700">Total Meds</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PatientScheduleView