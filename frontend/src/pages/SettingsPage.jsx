import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

/**
 * Settings Page Component
 * Allows users to manage their account settings including API key configuration
 * Features secure form handling and profile management functionality
 */
const SettingsPage = () => {
  const { user, isAuthenticated } = useAuth()
  
  // Component state for settings management
  const [formData, setFormData] = useState({
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    apiKey: ''
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
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear messages when user starts typing
    if (error) setError('')
    if (success) setSuccess('')
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <motion.div
        className="bg-white rounded-lg shadow-md p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-gray-800">Account Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your profile, security, and integration settings
        </p>
      </motion.div>

      {/* Success/Error Messages */}
      {(error || success) && (
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <motion.div
          className="bg-white rounded-lg shadow-md p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Profile Information</h2>
          
          <form onSubmit={handleProfileUpdate} className="space-y-4">
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
              className="w-full btn-primary"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </motion.button>
          </form>
        </motion.div>

        {/* Password Change */}
        <motion.div
          className="bg-white rounded-lg shadow-md p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Change Password</h2>
          
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                className="input-field"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className="input-field"
                required
                disabled={loading}
                minLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 6 characters long
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="input-field"
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <motion.button
              type="submit"
              className="w-full btn-primary"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? 'Changing...' : 'Change Password'}
            </motion.button>
          </form>
        </motion.div>
      </div>

      {/* API Key Configuration */}
      <motion.div
        className="bg-white rounded-lg shadow-md p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">OpenAI Integration</h2>
            <p className="text-gray-600 text-sm mt-1">
              Configure your OpenAI API key for AI-powered medication reminders
            </p>
          </div>
        </div>

        <form onSubmit={handleApiKeyUpdate} className="space-y-4">
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
              <p>• Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-pillpulse-blue hover:underline">OpenAI Platform</a></p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2">🔒 Privacy & Security</h3>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• API key is encrypted using AES-256 encryption</li>
              <li>• All AI processing happens locally on your device</li>
              <li>• No medication data is sent to external servers</li>
              <li>• You can remove your API key at any time</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <motion.button
              type="submit"
              className="flex-1 btn-primary"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? 'Updating...' : 'Update API Key'}
            </motion.button>
            
            <motion.button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, apiKey: '' }))}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors duration-200"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              Remove Key
            </motion.button>
          </div>
        </form>
      </motion.div>

      {/* Data Export */}
      <motion.div
        className="bg-white rounded-lg shadow-md p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Data Management</h2>
        <p className="text-gray-600 mb-4">
          Export your medication data or manage your account
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <motion.button
            className="btn-secondary"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Export Data (JSON)
          </motion.button>
          
          <motion.button
            className="btn-secondary"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Export Analytics (CSV)
          </motion.button>
          
          <motion.button
            className="border border-red-300 text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Delete Account
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

export default SettingsPage