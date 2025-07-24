import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

/**
 * Admin Dashboard Component
 * Administrative interface for managing users, schedules, and system settings
 * Only accessible to users with admin role
 * Features user management, schedule oversight, and system configuration
 */
const AdminDashboard = () => {
  const { user, isAuthenticated, isAdmin } = useAuth()
  
  // Component state for admin data and UI controls
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  /**
   * Load admin data when component mounts
   */
  useEffect(() => {
    if (isAuthenticated() && isAdmin()) {
      loadAdminData()
    }
  }, [isAuthenticated, isAdmin])

  /**
   * Fetch admin data from backend
   * Loads users and schedules for administrative oversight
   */
  const loadAdminData = async () => {
    try {
      setLoading(true)
      setError('')
      
      // In real implementation, these would be API calls
      // const [usersResponse, schedulesResponse] = await Promise.all([
      //   fetch('/api/admin/users'),
      //   fetch('/api/admin/schedules')
      // ])
      
      // Sample data for demo
      setUsers([
        { id: 1, email: 'user1@example.com', role: 'user', created_at: '2025-01-01', last_login: '2025-01-20' },
        { id: 2, email: 'user2@example.com', role: 'user', created_at: '2025-01-05', last_login: '2025-01-19' },
        { id: 3, email: 'admin@example.com', role: 'admin', created_at: '2024-12-01', last_login: '2025-01-21' }
      ])
      
      setSchedules([
        { id: 1, user_id: 1, user_email: 'user1@example.com', medication_name: 'Aspirin', dosage: '100mg', time: '08:00', frequency: 'daily' },
        { id: 2, user_id: 1, user_email: 'user1@example.com', medication_name: 'Vitamin D', dosage: '1000 IU', time: '20:00', frequency: 'daily' },
        { id: 3, user_id: 2, user_email: 'user2@example.com', medication_name: 'Metformin', dosage: '500mg', time: '07:30', frequency: 'daily' }
      ])
    } catch (err) {
      setError('Failed to load admin data')
      console.error('Admin data loading error:', err)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle user role change
   * @param {number} userId - ID of user to update
   * @param {string} newRole - New role to assign
   */
  const handleRoleChange = async (userId, newRole) => {
    try {
      // API call would go here
      // await fetch(`/api/admin/users/${userId}`, {
      //   method: 'PUT',
      //   body: JSON.stringify({ role: newRole })
      // })
      
      // Update local state
      setUsers(prev => 
        prev.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        )
      )
    } catch (err) {
      setError('Failed to update user role')
    }
  }

  /**
   * Handle user deletion
   * @param {number} userId - ID of user to delete
   */
  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      // API call would go here
      // await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      
      // Update local state
      setUsers(prev => prev.filter(user => user.id !== userId))
      setSchedules(prev => prev.filter(schedule => schedule.user_id !== userId))
    } catch (err) {
      setError('Failed to delete user')
    }
  }

  /**
   * Format date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  /**
   * Format time for display
   * @param {string} time - Time in HH:MM format
   * @returns {string} Formatted time
   */
  const formatTime = (time) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  // Redirect if not authenticated or not admin
  if (!isAuthenticated()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Please log in to access admin panel</h2>
          <a href="/login" className="btn-primary">Go to Login</a>
        </div>
      </div>
    )
  }

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">You need admin privileges to access this page.</p>
          <a href="/dashboard" className="btn-primary">Go to Dashboard</a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <motion.div
        className="bg-white rounded-lg shadow-md p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Manage users, schedules, and system settings
            </p>
          </div>
          <div className="bg-pillpulse-teal text-white px-4 py-2 rounded-lg">
            <span className="text-sm font-medium">Admin Panel</span>
          </div>
        </div>
      </motion.div>

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

      {/* Tab Navigation */}
      <motion.div
        className="bg-white rounded-lg shadow-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'users', label: 'Users', count: users.length },
              { id: 'schedules', label: 'Schedules', count: schedules.length },
              { id: 'settings', label: 'Settings', count: null }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-pillpulse-teal text-pillpulse-teal'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pillpulse-teal"></div>
            </div>
          ) : (
            <>
              {/* Users Tab */}
              {activeTab === 'users' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
                    <span className="text-gray-600 text-sm">
                      Total: {users.length} users
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Last Login</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((userData) => (
                          <motion.tr
                            key={userData.id}
                            className="border-b border-gray-100 hover:bg-gray-50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            <td className="py-3 px-4 font-medium text-gray-800">
                              {userData.email}
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={userData.role}
                                onChange={(e) => handleRoleChange(userData.id, e.target.value)}
                                className={`text-xs px-2 py-1 rounded-full border-0 focus:ring-2 focus:ring-pillpulse-teal ${
                                  userData.role === 'admin'
                                    ? 'bg-pillpulse-teal text-white'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                                disabled={userData.id === user?.id} // Can't change own role
                              >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {formatDate(userData.created_at)}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {formatDate(userData.last_login)}
                            </td>
                            <td className="py-3 px-4">
                              {userData.id !== user?.id && (
                                <button
                                  onClick={() => handleDeleteUser(userData.id)}
                                  className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors duration-200"
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* Schedules Tab */}
              {activeTab === 'schedules' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Schedule Management</h2>
                    <span className="text-gray-600 text-sm">
                      Total: {schedules.length} schedules
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
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
                            <td className="py-3 px-4 text-gray-600">
                              {schedule.user_email}
                            </td>
                            <td className="py-3 px-4 font-medium text-gray-800">
                              {schedule.medication_name}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {schedule.dosage}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {formatTime(schedule.time)}
                            </td>
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
                </motion.div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">System Settings</h2>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Reminder Settings */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-800 mb-4">
                        Default Reminder Settings
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Default Reminder Frequency
                          </label>
                          <select className="input-field">
                            <option value="hourly">Hourly</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Reminder Format
                          </label>
                          <select className="input-field">
                            <option value="text">Text</option>
                            <option value="email">Email</option>
                            <option value="both">Both</option>
                          </select>
                        </div>

                        <button className="btn-primary">
                          Update Settings
                        </button>
                      </div>
                    </div>

                    {/* System Statistics */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-800 mb-4">
                        System Statistics
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Users:</span>
                          <span className="font-medium">{users.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Active Schedules:</span>
                          <span className="font-medium">{schedules.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Admin Users:</span>
                          <span className="font-medium">
                            {users.filter(u => u.role === 'admin').length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Database Size:</span>
                          <span className="font-medium">2.4 MB</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default AdminDashboard