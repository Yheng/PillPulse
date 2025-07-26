import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import CaregiverInvitations from '../components/CaregiverInvitations'
import CaregiverPatients from '../components/CaregiverPatients'
import EmergencyContacts from '../components/EmergencyContacts'
import { caregiverService } from '../services/api'

/**
 * Caregiver Dashboard
 * Central hub for caregivers to manage patient relationships and access patient data
 * Includes invitation management, patient monitoring, and emergency contacts
 */
const CaregiverDashboard = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('patients')
  const [relationships, setRelationships] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Load caregiver relationships on component mount
  useEffect(() => {
    loadRelationships()
  }, [])

  const loadRelationships = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await caregiverService.getRelationships()
      
      if (response.success) {
        setRelationships(response.data)
      } else {
        setError('Failed to load caregiver relationships')
      }
    } catch (err) {
      console.error('Error loading relationships:', err)
      setError('Failed to load caregiver relationships')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { 
      id: 'patients', 
      label: 'My Patients', 
      icon: '👥',
      count: relationships?.asCaregiver?.length || 0
    },
    { 
      id: 'invitations', 
      label: 'Invitations', 
      icon: '📨',
      count: relationships?.asPatient?.filter(r => r.status === 'pending')?.length || 0
    },
    { 
      id: 'emergency', 
      label: 'Emergency Contacts', 
      icon: '🚨',
      count: 0
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            👥 Caregiver Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            Welcome back, {user?.email}! Manage your patient relationships and access.
          </p>
        </motion.div>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex justify-between items-center">
            <p className="text-red-700">{error}</p>
            <button 
              onClick={() => setError('')}
              className="text-red-500 hover:text-red-700 ml-4"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="flex flex-wrap justify-center gap-4">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200
                ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`
                  px-2 py-1 rounded-full text-xs font-bold
                  ${activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-blue-100 text-blue-800'
                  }
                `}>
                  {tab.count}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-2xl shadow-lg p-6"
      >
        {activeTab === 'patients' && (
          <CaregiverPatients 
            relationships={relationships?.asCaregiver || []}
            onRefresh={loadRelationships}
          />
        )}

        {activeTab === 'invitations' && (
          <CaregiverInvitations 
            relationships={relationships?.asPatient || []}
            onRefresh={loadRelationships}
          />
        )}

        {activeTab === 'emergency' && (
          <EmergencyContacts />
        )}
      </motion.div>

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Patients Under Care</h3>
              <p className="text-3xl font-bold mt-2">
                {relationships?.asCaregiver?.filter(r => r.status === 'accepted')?.length || 0}
              </p>
            </div>
            <div className="text-4xl opacity-80">👨‍⚕️</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Active Invitations</h3>
              <p className="text-3xl font-bold mt-2">
                {relationships?.asPatient?.filter(r => r.status === 'pending')?.length || 0}
              </p>
            </div>
            <div className="text-4xl opacity-80">📮</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Relationships</h3>
              <p className="text-3xl font-bold mt-2">
                {(relationships?.asCaregiver?.length || 0) + (relationships?.asPatient?.length || 0)}
              </p>
            </div>
            <div className="text-4xl opacity-80">🔗</div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default CaregiverDashboard