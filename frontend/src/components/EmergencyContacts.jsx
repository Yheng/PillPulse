import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { caregiverService } from '../services/api'
import LoadingSpinner from './LoadingSpinner'

/**
 * Emergency Contacts Component
 * Manages emergency contact information for medication alerts
 * Allows adding, editing, and removing emergency contacts
 */
const EmergencyContacts = () => {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    phone: '',
    email: '',
    priority: 1,
    notify_missed_doses: true,
    notify_emergencies: true
  })
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    loadEmergencyContacts()
  }, [])

  const loadEmergencyContacts = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await caregiverService.getEmergencyContacts()
      
      if (response.success) {
        setContacts(response.data.contacts || [])
      } else {
        setError('Failed to load emergency contacts')
      }
    } catch (err) {
      console.error('Error loading emergency contacts:', err)
      setError('Failed to load emergency contacts')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setFormLoading(true)
      
      let response
      if (editingContact) {
        response = await caregiverService.updateEmergencyContact(editingContact.id, formData)
      } else {
        response = await caregiverService.addEmergencyContact(formData)
      }
      
      if (response.success) {
        setModalOpen(false)
        setEditingContact(null)
        resetForm()
        await loadEmergencyContacts()
      }
    } catch (error) {
      console.error('Error saving emergency contact:', error)
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = (contact) => {
    setEditingContact(contact)
    setFormData({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone || '',
      email: contact.email || '',
      priority: contact.priority,
      notify_missed_doses: contact.notify_missed_doses,
      notify_emergencies: contact.notify_emergencies
    })
    setModalOpen(true)
  }

  const handleDelete = async (contactId) => {
    if (window.confirm('Are you sure you want to delete this emergency contact?')) {
      try {
        const response = await caregiverService.deleteEmergencyContact(contactId)
        if (response.success) {
          await loadEmergencyContacts()
        }
      } catch (error) {
        console.error('Error deleting emergency contact:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      relationship: '',
      phone: '',
      email: '',
      priority: 1,
      notify_missed_doses: true,
      notify_emergencies: true
    })
  }

  const openAddModal = () => {
    setEditingContact(null)
    resetForm()
    setModalOpen(true)
  }

  const getPriorityBadge = (priority) => {
    const styles = {
      1: 'bg-red-100 text-red-800',
      2: 'bg-orange-100 text-orange-800',
      3: 'bg-yellow-100 text-yellow-800',
      4: 'bg-blue-100 text-blue-800',
      5: 'bg-gray-100 text-gray-800'
    }

    const labels = {
      1: 'Primary',
      2: 'Secondary',
      3: 'Tertiary',
      4: 'Low',
      5: 'Lowest'
    }

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${styles[priority]}`}>
        {labels[priority]}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Emergency Contacts</h2>
          <p className="text-gray-600">People to notify in case of missed critical medications</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
        >
          🚨 Add Emergency Contact
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <p className="text-red-700">{error}</p>
            <div className="flex space-x-2">
              <button 
                onClick={loadEmergencyContacts}
                className="text-red-600 hover:text-red-800 underline text-sm"
              >
                Retry
              </button>
              <button 
                onClick={() => setError('')}
                className="text-red-500 hover:text-red-700 ml-4"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contacts List */}
      {contacts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🚨</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No emergency contacts</h3>
          <p className="text-gray-500">Add emergency contacts to be notified of missed critical medications</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contacts.map((contact, index) => (
            <motion.div
              key={contact.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              {/* Contact Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{contact.name}</h3>
                    <p className="text-sm text-gray-600 capitalize">{contact.relationship}</p>
                  </div>
                </div>
                {getPriorityBadge(contact.priority)}
              </div>

              {/* Contact Details */}
              <div className="space-y-2 mb-4">
                {contact.phone && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span className="w-5 h-5 flex items-center justify-center">📞</span>
                    <span>{contact.phone}</span>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span className="w-5 h-5 flex items-center justify-center">📧</span>
                    <span>{contact.email}</span>
                  </div>
                )}
              </div>

              {/* Notification Settings */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center space-x-2 text-sm">
                  <span className={`w-3 h-3 rounded-full ${contact.notify_missed_doses ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  <span className={contact.notify_missed_doses ? 'text-green-700' : 'text-gray-500'}>
                    Missed doses alerts
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className={`w-3 h-3 rounded-full ${contact.notify_emergencies ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                  <span className={contact.notify_emergencies ? 'text-red-700' : 'text-gray-500'}>
                    Emergency alerts
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleEdit(contact)}
                  className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(contact.id)}
                  className="bg-red-500 text-white py-2 px-3 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                >
                  🗑️
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={() => setModalOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-800">
                    {editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
                  </h3>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Relationship *
                    </label>
                    <select
                      value={formData.relationship}
                      onChange={(e) => setFormData({...formData, relationship: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select relationship</option>
                      <option value="spouse">Spouse</option>
                      <option value="parent">Parent</option>
                      <option value="child">Child</option>
                      <option value="sibling">Sibling</option>
                      <option value="friend">Friend</option>
                      <option value="caregiver">Caregiver</option>
                      <option value="doctor">Doctor</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority Level
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value={1}>Primary (1st to contact)</option>
                      <option value={2}>Secondary (2nd to contact)</option>
                      <option value={3}>Tertiary (3rd to contact)</option>
                      <option value={4}>Low priority</option>
                      <option value={5}>Lowest priority</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Notification Preferences
                    </label>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="notify_missed_doses"
                        checked={formData.notify_missed_doses}
                        onChange={(e) => setFormData({...formData, notify_missed_doses: e.target.checked})}
                        className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                      />
                      <label htmlFor="notify_missed_doses" className="text-sm text-gray-700">
                        Notify about missed doses
                      </label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="notify_emergencies"
                        checked={formData.notify_emergencies}
                        onChange={(e) => setFormData({...formData, notify_emergencies: e.target.checked})}
                        className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                      />
                      <label htmlFor="notify_emergencies" className="text-sm text-gray-700">
                        Notify about medical emergencies
                      </label>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    * At least one contact method (phone or email) is required
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading || (!formData.phone && !formData.email)}
                      className="flex-1 bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {formLoading ? (
                        <LoadingSpinner size="small" />
                      ) : (
                        <>
                          <span>🚨</span>
                          <span>{editingContact ? 'Update Contact' : 'Add Contact'}</span>
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

export default EmergencyContacts