import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { caregiverService } from '../services/api'
import LoadingSpinner from './LoadingSpinner'
import PatientScheduleView from './PatientScheduleView'
import PatientAdherenceView from './PatientAdherenceView'

/**
 * Caregiver Patients Component
 * Displays patients under the caregiver's care
 * Provides access to patient schedules and adherence data
 */
const CaregiverPatients = ({ relationships, onRefresh }) => {
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [patientView, setPatientView] = useState('schedules') // 'schedules' or 'adherence'
  const [loading, setLoading] = useState(false)

  // Filter accepted relationships where user is caregiver
  const activePatients = relationships.filter(r => r.status === 'accepted')

  const handleViewPatient = async (patient) => {
    setSelectedPatient(patient)
    setPatientView('schedules')
  }

  const handleRemoveRelationship = async (relationshipId) => {
    try {
      setLoading(true)
      const response = await caregiverService.removeRelationship(relationshipId)
      
      if (response.success) {
        await onRefresh()
        if (selectedPatient?.id === relationshipId) {
          setSelectedPatient(null)
        }
      }
    } catch (error) {
      console.error('Error removing relationship:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAccessLevelBadge = (level) => {
    const styles = {
      view: 'bg-blue-100 text-blue-800',
      edit: 'bg-purple-100 text-purple-800',
      full: 'bg-red-100 text-red-800'
    }

    const labels = {
      view: 'View Only',
      edit: 'View & Edit',
      full: 'Full Access'
    }

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${styles[level]}`}>
        {labels[level]}
      </span>
    )
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (selectedPatient) {
    return (
      <div className="space-y-6">
        {/* Patient Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSelectedPatient(null)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Back to Patients
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedPatient.patient_email}
              </h2>
              <div className="flex items-center space-x-2 mt-1">
                {getAccessLevelBadge(selectedPatient.access_level)}
                <span className="text-sm text-gray-500">
                  Connected since {formatDate(selectedPatient.accepted_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex space-x-4">
          <button
            onClick={() => setPatientView('schedules')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              patientView === 'schedules'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📅 Medication Schedules
          </button>
          <button
            onClick={() => setPatientView('adherence')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              patientView === 'adherence'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📊 Adherence History
          </button>
        </div>

        {/* Patient Data View */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {patientView === 'schedules' && (
            <PatientScheduleView
              patientId={selectedPatient.patient_id}
              accessLevel={selectedPatient.access_level}
            />
          )}
          
          {patientView === 'adherence' && (
            <PatientAdherenceView
              patientId={selectedPatient.patient_id}
              accessLevel={selectedPatient.access_level}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">My Patients</h2>
        <p className="text-gray-600">Patients you're caring for and monitoring</p>
      </div>

      {/* Patients List */}
      {activePatients.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👨‍⚕️</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No patients under your care</h3>
          <p className="text-gray-500">When patients invite you as their caregiver, they'll appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activePatients.map((patient) => (
            <motion.div
              key={patient.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200"
            >
              {/* Patient Info */}
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {patient.patient_email.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 truncate">
                    {patient.patient_email}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Connected {formatDate(patient.accepted_at)}
                  </p>
                </div>
              </div>

              {/* Access Level */}
              <div className="mb-4">
                {getAccessLevelBadge(patient.access_level)}
              </div>

              {/* Notes */}
              {patient.notes && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    "{patient.notes}"
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleViewPatient(patient)}
                  className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  👁️ View Details
                </button>
                <button
                  onClick={() => handleRemoveRelationship(patient.id)}
                  disabled={loading}
                  className="bg-red-500 text-white py-2 px-3 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50"
                  title="Remove relationship"
                >
                  {loading ? (
                    <LoadingSpinner size="small" />
                  ) : (
                    '🗑️'
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Statistics */}
      {activePatients.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500 to-teal-500 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Care Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{activePatients.length}</div>
              <div className="text-sm opacity-90">Active Patients</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {activePatients.filter(p => p.access_level === 'full').length}
              </div>
              <div className="text-sm opacity-90">Full Access</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {activePatients.filter(p => p.access_level === 'view').length}
              </div>
              <div className="text-sm opacity-90">View Only</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CaregiverPatients