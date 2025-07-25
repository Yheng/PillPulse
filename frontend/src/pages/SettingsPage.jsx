import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'

/**
 * Settings Page Component
 * Allows users to manage their account settings including API key configuration
 * Features secure form handling and profile management functionality
 */
const SettingsPage = () => {
  const { user, isAuthenticated } = useAuth()
  
  // Component state for settings management
  const [activeTab, setActiveTab] = useState('profile')
  const [formData, setFormData] = useState({
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    apiKey: '',
    caregiverEmail: '',
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    reminderFrequency: 30
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)

  /**
   * Handle input changes in settings forms
   * @param {Event} e - Input change event
   */
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    // Clear messages when user starts typing
    if (error) setError('')
    if (success) setSuccess('')
  }

  /**
   * Handle caregiver email addition
   * @param {Event} e - Form submission event
   */
  const handleCaregiverUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // API call would go here
      // await updateCaregiverAccess({ caregiverEmail: formData.caregiverEmail })
      setSuccess('Caregiver access updated successfully!')
    } catch (err) {
      setError(err.message || 'Failed to update caregiver access')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle notification preferences update
   * @param {Event} e - Form submission event
   */
  const handleNotificationUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // API call would go here
      // await updateNotificationSettings({
      //   pushNotifications: formData.pushNotifications,
      //   emailNotifications: formData.emailNotifications,
      //   smsNotifications: formData.smsNotifications,
      //   reminderFrequency: formData.reminderFrequency
      // })
      setSuccess('Notification settings updated successfully!')
    } catch (err) {
      setError(err.message || 'Failed to update notification settings')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle profile update (email change)
   * @param {Event} e - Form submission event
   */
  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // API call would go here
      // await updateProfile({ email: formData.email })
      setSuccess('Profile updated successfully!')
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle password change
   * @param {Event} e - Form submission event
   */
  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validate password requirements
    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long')
      setLoading(false)
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match')
      setLoading(false)
      return
    }

    try {
      // API call would go here
      // await changePassword({
      //   currentPassword: formData.currentPassword,
      //   newPassword: formData.newPassword
      // })
      
      setSuccess('Password changed successfully!')
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }))
    } catch (err) {
      setError(err.message || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle OpenAI API key update
   * @param {Event} e - Form submission event
   */
  const handleApiKeyUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Basic API key validation
    if (formData.apiKey && !formData.apiKey.startsWith('sk-')) {
      setError('Please enter a valid OpenAI API key (starts with sk-)')
      setLoading(false)
      return
    }

    try {
      // API call would go here
      // await updateApiKey({ apiKey: formData.apiKey })
      setSuccess('API key updated successfully!')
    } catch (err) {
      setError(err.message || 'Failed to update API key')
    } finally {
      setLoading(false)
    }
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Please log in to access settings</h2>
          <a href="/login" className="btn-primary">Go to Login</a>
        </div>
      </div>
    )
  }

  // Tab configuration
  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'api', label: 'API', icon: '🔑' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'caregiver', label: 'Caregiver', icon: '👥' }
  ]

  return (
    <div className="min-h-screen bg-white">
      <Header title="Settings" showBackButton={true} />

      <div className="max-w-6xl mx-auto">
        {/* Tabs Navigation */}
        <div className="bg-gray-100 px-6">
          <div className="flex space-x-0">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'text-pillpulse-blue border-pillpulse-blue bg-white'
                    : 'text-gray-600 border-transparent hover:text-pillpulse-blue hover:bg-pillpulse-teal hover:bg-opacity-10'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Success/Error Messages */}
        {(error || success) && (
          <div className="px-6 py-4">
            <motion.div
              className={`border rounded-lg p-4 ${
                error 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-green-50 border-green-200'
              }`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className={error ? 'text-red-700' : 'text-green-700'}>
                {error || success}
              </p>
            </motion.div>
          </div>
        )}

        {/* Tab Content */}
        <motion.div 
          className="bg-white shadow-md rounded-md mx-6 mb-6 p-6"
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Profile Information</h2>
              <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Role
                  </label>
                  <input
                    type="text"
                    value={user?.role || 'user'}
                    className="input-field bg-gray-50"
                    disabled
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Contact an administrator to change your role
                  </p>
                </div>

                <motion.button
                  type="submit"
                  className="bg-pillpulse-green hover:bg-pillpulse-teal text-white py-3 px-6 rounded-md font-medium transition-colors duration-200"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                >
                  {loading ? 'Updating...' : 'Save'}
                </motion.button>
              </form>
            </div>
          )}

          {/* API Tab */}
          {activeTab === 'api' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">API Configuration</h2>
              <form onSubmit={handleApiKeyUpdate} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    OpenAI API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      name="apiKey"
                      value={formData.apiKey}
                      onChange={handleInputChange}
                      className="input-field pr-12"
                      placeholder="sk-..."
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showApiKey ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 space-y-1">
                    <p>• Your API key is encrypted and stored securely</p>
                    <p>• Used only for generating personalized medication reminders</p>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  className="bg-pillpulse-green hover:bg-pillpulse-teal text-white py-3 px-6 rounded-md font-medium transition-colors duration-200"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                >
                  {loading ? 'Updating...' : 'Save'}
                </motion.button>
              </form>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Notification Preferences</h2>
              <form onSubmit={handleNotificationUpdate} className="space-y-6 max-w-md">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Push Notifications</label>
                      <p className="text-xs text-gray-500">Receive notifications in your browser</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="pushNotifications"
                        checked={formData.pushNotifications}
                        onChange={handleInputChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pillpulse-blue"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                      <p className="text-xs text-gray-500">Receive reminders via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="emailNotifications"
                        checked={formData.emailNotifications}
                        onChange={handleInputChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pillpulse-blue"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">SMS Notifications</label>
                      <p className="text-xs text-gray-500">Receive text message reminders</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="smsNotifications"
                        checked={formData.smsNotifications}
                        onChange={handleInputChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pillpulse-blue"></div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reminder Frequency (minutes)
                  </label>
                  <input
                    type="range"
                    name="reminderFrequency"
                    min="10"
                    max="120"
                    step="10"
                    value={formData.reminderFrequency}
                    onChange={handleInputChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>10 min</span>
                    <span className="font-medium">{formData.reminderFrequency} min</span>
                    <span>120 min</span>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  className="bg-pillpulse-green hover:bg-pillpulse-teal text-white py-3 px-6 rounded-md font-medium transition-colors duration-200"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                >
                  {loading ? 'Updating...' : 'Save'}
                </motion.button>
              </form>
            </div>
          )}

          {/* Caregiver Tab */}
          {activeTab === 'caregiver' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Caregiver Access</h2>
              <form onSubmit={handleCaregiverUpdate} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Caregiver Email
                  </label>
                  <input
                    type="email"
                    name="caregiverEmail"
                    value={formData.caregiverEmail}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="caregiver@example.com"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Grant read-only access to your medication schedule and adherence data
                  </p>
                </div>

                <motion.button
                  type="submit"
                  className="bg-pillpulse-green hover:bg-pillpulse-teal text-white py-3 px-6 rounded-md font-medium transition-colors duration-200"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                >
                  {loading ? 'Adding...' : 'Add'}
                </motion.button>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default SettingsPage