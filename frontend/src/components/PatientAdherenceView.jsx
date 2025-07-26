import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { caregiverService } from '../services/api'
import LoadingSpinner from './LoadingSpinner'

/**
 * Patient Adherence View Component
 * Displays a patient's adherence history for caregivers
 * Shows medication taking patterns and compliance data
 */
const PatientAdherenceView = ({ patientId, accessLevel }) => {
  const [adherenceData, setAdherenceData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState('7d') // 7d, 30d, 90d

  useEffect(() => {
    loadPatientAdherence()
  }, [patientId, dateRange])

  const loadPatientAdherence = async () => {
    try {
      setLoading(true)
      setError('')

      // Calculate date range
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date()
      
      switch (dateRange) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(startDate.getDate() - 30)
          break
        case '90d':
          startDate.setDate(startDate.getDate() - 90)
          break
        default:
          startDate.setDate(startDate.getDate() - 7)
      }

      const params = {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate
      }
      
      const response = await caregiverService.getPatientAdherence(patientId, params)
      
      if (response.success) {
        setAdherenceData(response.data.adherence_records || [])
      } else {
        setError('Failed to load patient adherence data')
      }
    } catch (err) {
      console.error('Error loading patient adherence:', err)
      setError('Failed to load patient adherence data')
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const calculateAdherenceRate = () => {
    if (adherenceData.length === 0) return 0
    const takenCount = adherenceData.filter(record => record.taken).length
    return Math.round((takenCount / adherenceData.length) * 100)
  }

  const getAdherenceByMedication = () => {
    const medicationGroups = {}
    
    adherenceData.forEach(record => {
      if (!medicationGroups[record.medication_name]) {
        medicationGroups[record.medication_name] = {
          total: 0,
          taken: 0,
          medication_name: record.medication_name,
          dosage: record.dosage
        }
      }
      medicationGroups[record.medication_name].total++
      if (record.taken) {
        medicationGroups[record.medication_name].taken++
      }
    })

    return Object.values(medicationGroups).map(med => ({
      ...med,
      rate: Math.round((med.taken / med.total) * 100)
    }))
  }

  const getRecentMissedDoses = () => {
    return adherenceData
      .filter(record => !record.taken)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
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

  const adherenceRate = calculateAdherenceRate()
  const medicationAdherence = getAdherenceByMedication()
  const recentMissedDoses = getRecentMissedDoses()

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Adherence History</h3>
          <p className="text-gray-600">
            {adherenceData.length} medication record{adherenceData.length !== 1 ? 's' : ''} in selected period
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Time period:</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {adherenceData.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No adherence data</h3>
          <p className="text-gray-500">No medication records found for the selected time period</p>
        </div>
      ) : (
        <>
          {/* Overall Adherence Rate */}
          <div className="bg-gradient-to-r from-blue-500 to-teal-500 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold mb-2">Overall Adherence Rate</h4>
                <div className="text-4xl font-bold">{adherenceRate}%</div>
                <p className="text-sm opacity-90 mt-1">
                  {adherenceData.filter(r => r.taken).length} of {adherenceData.length} doses taken
                </p>
              </div>
              <div className="text-6xl opacity-80">
                {adherenceRate >= 90 ? '🎯' : adherenceRate >= 70 ? '📈' : '⚠️'}
              </div>
            </div>
            
            {/* Adherence Bar */}
            <div className="mt-4">
              <div className="w-full bg-white/20 rounded-full h-3">
                <div 
                  className="bg-white h-3 rounded-full transition-all duration-500"
                  style={{ width: `${adherenceRate}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Adherence by Medication */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Adherence by Medication</h4>
            <div className="space-y-4">
              {medicationAdherence.map((med, index) => (
                <motion.div
                  key={med.medication_name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-800">{med.medication_name}</h5>
                    <p className="text-sm text-gray-600">{med.dosage}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {med.taken} of {med.total} doses taken
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      med.rate >= 90 ? 'text-green-600' :
                      med.rate >= 70 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {med.rate}%
                    </div>
                    <div className="w-20 bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          med.rate >= 90 ? 'bg-green-500' :
                          med.rate >= 70 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${med.rate}%` }}
                      ></div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Recent Missed Doses */}
          {recentMissedDoses.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-red-800 mb-4">
                ⚠️ Recent Missed Doses ({recentMissedDoses.length})
              </h4>
              <div className="space-y-3">
                {recentMissedDoses.map((record, index) => (
                  <motion.div
                    key={`${record.schedule_id}-${record.date}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-red-600 text-lg">💊</span>
                      </div>
                      <div>
                        <h6 className="font-semibold text-gray-800">
                          {record.medication_name}
                        </h6>
                        <p className="text-sm text-gray-600">
                          {record.dosage} • {convertTo12HourFormat(record.time)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-red-700">
                        {formatDate(record.date)}
                      </div>
                      <div className="text-xs text-red-600">Missed</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Adherence Insights */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-purple-800 mb-4">💡 Adherence Insights</h4>
            <div className="space-y-3 text-sm">
              {adherenceRate >= 90 && (
                <p className="text-purple-700">
                  ✅ Excellent adherence! The patient is consistently taking their medications.
                </p>
              )}
              {adherenceRate >= 70 && adherenceRate < 90 && (
                <p className="text-purple-700">
                  📈 Good adherence with room for improvement. Consider setting up additional reminders.
                </p>
              )}
              {adherenceRate < 70 && (
                <p className="text-purple-700">
                  ⚠️ Poor adherence detected. This patient may need additional support or intervention.
                </p>
              )}
              
              {recentMissedDoses.length > 0 && (
                <p className="text-purple-700">
                  🔔 {recentMissedDoses.length} missed dose{recentMissedDoses.length > 1 ? 's' : ''} in recent period. 
                  Consider checking in with the patient.
                </p>
              )}

              <p className="text-purple-600 text-xs mt-4">
                Data shows {dateRange === '7d' ? 'last 7 days' : dateRange === '30d' ? 'last 30 days' : 'last 90 days'} • 
                Last updated: {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default PatientAdherenceView