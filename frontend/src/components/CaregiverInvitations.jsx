import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { caregiverService } from '../services/api'
import LoadingSpinner from './LoadingSpinner'

/**
 * Caregiver Invitations Component
 * Displays and manages caregiver invitations for the current user
 * Allows accepting or declining invitations
 */
const CaregiverInvitations = ({ relationships, onRefresh }) => {
  const [processingInvitation, setProcessingInvitation] = useState(null)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    accessLevel: 'view',
    notes: ''
  })
  const [inviteLoading, setInviteLoading] = useState(false)

  // Filter pending invitations
  const pendingInvitations = relationships.filter(r => r.status === 'pending')
  const acceptedInvitations = relationships.filter(r => r.status === 'accepted')
  const allInvitations = relationships

  const handleAcceptInvitation = async (relationshipId) => {
    try {
      setProcessingInvitation(relationshipId)
      
      // In a real implementation, you'd need the invitation token
      // For now, we'll simulate the acceptance
      console.log('Accepting invitation:', relationshipId)
      
      // Refresh the relationships list
      await onRefresh()
    } catch (error) {
      console.error('Error accepting invitation:', error)
    } finally {
      setProcessingInvitation(null)
    }
  }

  const handleDeclineInvitation = async (relationshipId) => {
    try {
      setProcessingInvitation(relationshipId)
      
      // In a real implementation, you'd need the invitation token
      console.log('Declining invitation:', relationshipId)
      
      // Refresh the relationships list
      await onRefresh()
    } catch (error) {
      console.error('Error declining invitation:', error)
    } finally {
      setProcessingInvitation(null)
    }
  }

  const handleSendInvite = async (e) => {
    e.preventDefault()
    try {
      setInviteLoading(true)
      
      const response = await caregiverService.inviteCaregiver(
        inviteForm.email,
        inviteForm.accessLevel,
        inviteForm.notes
      )
      
      if (response.success) {
        setInviteModalOpen(false)
        setInviteForm({ email: '', accessLevel: 'view', notes: '' })
        await onRefresh()
      }
    } catch (error) {
      console.error('Error sending invitation:', error)
    } finally {
      setInviteLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      accepted: 'bg-green-100 text-green-800 border-green-200',
      declined: 'bg-red-100 text-red-800 border-red-200'
    }

    const icons = {
      pending: '⏳',
      accepted: '✅',
      declined: '❌'
    }

    return (
      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium border ${styles[status]}`}>
        <span>{icons[status]}</span>
        <span className="capitalize">{status}</span>
      </span>
    )
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

  return (
    <div className="space-y-6">
      {/* Header with Invite Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Caregiver Invitations</h2>
          <p className="text-gray-600">Manage caregiver access to your medication data</p>
        </div>
        <button
          onClick={() => setInviteModalOpen(true)}
          className="bg-gradient-to-r from-blue-500 to-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
        >
          📨 Invite Caregiver
        </button>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            ⏳ Pending Invitations ({pendingInvitations.length})
          </h3>
          <div className="space-y-3">
            {pendingInvitations.map((invitation) => (
              <motion.div
                key={invitation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-yellow-50 border border-yellow-200 rounded-xl p-4"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-lg">👤</span>
                      <span className="font-semibold text-gray-800">
                        {invitation.caregiver_email}
                      </span>
                      {getAccessLevelBadge(invitation.access_level)}
                    </div>
                    <p className="text-sm text-gray-600">
                      Invited on {new Date(invitation.invited_at).toLocaleDateString()}
                    </p>
                    {invitation.notes && (
                      <p className="text-sm text-gray-700 mt-1">
                        Note: {invitation.notes}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAcceptInvitation(invitation.id)}
                      disabled={processingInvitation === invitation.id}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center space-x-1"
                    >
                      {processingInvitation === invitation.id ? (
                        <LoadingSpinner size="small" />
                      ) : (
                        <>
                          <span>✅</span>
                          <span>Accept</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeclineInvitation(invitation.id)}
                      disabled={processingInvitation === invitation.id}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center space-x-1"
                    >
                      {processingInvitation === invitation.id ? (
                        <LoadingSpinner size="small" />
                      ) : (
                        <>
                          <span>❌</span>
                          <span>Decline</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* All Invitations */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          All Caregiver Relationships ({allInvitations.length})
        </h3>
        
        {allInvitations.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No caregiver relationships</h3>
            <p className="text-gray-500">Invite a caregiver to help monitor your medication adherence</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allInvitations.map((relationship) => (
              <motion.div
                key={relationship.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-lg">👤</span>
                      <span className="font-semibold text-gray-800">
                        {relationship.caregiver_email}
                      </span>
                      {getStatusBadge(relationship.status)}
                      {getAccessLevelBadge(relationship.access_level)}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Invited: {new Date(relationship.invited_at).toLocaleDateString()}</p>
                      {relationship.accepted_at && (
                        <p>Accepted: {new Date(relationship.accepted_at).toLocaleDateString()}</p>
                      )}
                    </div>
                    {relationship.notes && (
                      <p className="text-sm text-gray-700 mt-2">
                        Note: {relationship.notes}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {inviteModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={() => setInviteModalOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-2xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-800">Invite Caregiver</h3>
                  <button
                    onClick={() => setInviteModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSendInvite} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Caregiver Email
                    </label>
                    <input
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="caregiver@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Access Level
                    </label>
                    <select
                      value={inviteForm.accessLevel}
                      onChange={(e) => setInviteForm({...inviteForm, accessLevel: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="view">View Only - Can see schedules and adherence</option>
                      <option value="edit">View & Edit - Can modify schedules</option>
                      <option value="full">Full Access - Can manage everything</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={inviteForm.notes}
                      onChange={(e) => setInviteForm({...inviteForm, notes: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows="3"
                      placeholder="Add a personal message..."
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setInviteModalOpen(false)}
                      className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="flex-1 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {inviteLoading ? (
                        <LoadingSpinner size="small" />
                      ) : (
                        <>
                          <span>📨</span>
                          <span>Send Invite</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CaregiverInvitations