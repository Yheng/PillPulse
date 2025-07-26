import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000/api'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pillpulse_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pillpulse_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API Key Services
export const apiKeyService = {
  // Get user's API key (masked)
  async getApiKey() {
    const response = await api.get('/users/api-key')
    return response.data
  },

  // Update user's API key
  async updateApiKey(apiKey) {
    const response = await api.put('/users/api-key', { apiKey })
    return response.data
  },
}

// User Profile Services
export const userService = {
  // Get user profile
  async getProfile() {
    const response = await api.get('/users/profile')
    return response.data
  },

  // Update user profile
  async updateProfile(profileData) {
    const response = await api.put('/users/profile', profileData)
    return response.data
  },

  // Change password
  async changePassword(passwordData) {
    const response = await api.put('/users/password', passwordData)
    return response.data
  },

  // Get notification settings
  async getNotificationSettings() {
    const response = await api.get('/users/notification-settings')
    return response.data
  },

  // Update notification settings
  async updateNotificationSettings(settingsData) {
    const response = await api.put('/users/notification-settings', settingsData)
    return response.data
  },

  // Get user notifications
  async getNotifications(options = {}) {
    const params = new URLSearchParams()
    if (options.limit) params.append('limit', options.limit)
    if (options.offset) params.append('offset', options.offset)
    if (options.unread_only) params.append('unread_only', 'true')
    
    const response = await api.get(`/users/notifications?${params.toString()}`)
    return response.data
  },

  // Mark notification as read
  async markNotificationAsRead(notificationId) {
    const response = await api.put(`/users/notifications/${notificationId}/read`)
    return response.data
  },
}

// Admin Services
export const adminService = {
  // Get admin settings
  async getSettings() {
    const response = await api.get('/admin/settings')
    return response.data
  },

  // Update admin settings
  async updateSettings(settingsData) {
    const response = await api.put('/admin/settings', settingsData)
    return response.data
  },

  // Get all users
  async getUsers(params = {}) {
    const response = await api.get('/admin/users', { params })
    return response.data
  },
}

// AI Services
export const aiService = {
  // Check AI status
  async getStatus() {
    const response = await api.get('/ai/status')
    return response.data
  },

  // Generate personalized reminder
  async generateReminder(scheduleId, options = {}) {
    const response = await api.post('/ai/reminder', {
      schedule_id: scheduleId,
      options
    })
    return response.data
  },

  // Get AI insights
  async getInsights() {
    const response = await api.get('/ai/insights')
    return response.data
  },

  // Generate coaching message
  async getCoaching(type, context = {}) {
    const response = await api.post('/ai/coaching', {
      type,
      context
    })
    return response.data
  },

  // Get medication education
  async getEducation(medicationName, type = 'general') {
    const response = await api.post('/ai/education', {
      medication_name: medicationName,
      type
    })
    return response.data
  },

  // Get daily summary with AI coaching
  async getDailySummary() {
    const response = await api.get('/ai/daily-summary')
    return response.data
  },

  // Generate smart reminder with context
  async getSmartReminder(scheduleId, options = {}) {
    const response = await api.post('/ai/smart-reminder', {
      schedule_id: scheduleId,
      delay_minutes: options.delayMinutes || 0,
      user_status: options.userStatus || 'normal'
    })
    return response.data
  }
}

// Schedule Services
export const scheduleService = {
  // Get all schedules
  async getSchedules() {
    const response = await api.get('/schedules')
    return response.data
  },

  // Get today's schedules
  async getTodaysSchedules() {
    const response = await api.get('/schedules/today')
    return response.data
  },

  // Get today's adherence for a specific schedule
  async getTodayAdherence(scheduleId) {
    const today = new Date().toISOString().split('T')[0]
    const response = await api.get(`/adherence?schedule_id=${scheduleId}&start_date=${today}&end_date=${today}&limit=1`)
    
    // Return the first (and only) adherence record for today
    const records = response.data?.data || []
    return {
      success: true,
      data: records.length > 0 ? records[0] : null
    }
  },

  // Create a new schedule
  async createSchedule(scheduleData) {
    const response = await api.post('/schedules', scheduleData)
    return response.data
  },

  // Update a schedule
  async updateSchedule(scheduleId, scheduleData) {
    const response = await api.put(`/schedules/${scheduleId}`, scheduleData)
    return response.data
  },

  // Delete a schedule
  async deleteSchedule(scheduleId) {
    const response = await api.delete(`/schedules/${scheduleId}`)
    return response.data
  }
}

// Adherence Services
export const adherenceService = {
  // Log adherence
  async logAdherence(adherenceData) {
    const response = await api.post('/adherence', adherenceData)
    return response.data
  },

  // Get adherence records
  async getAdherence(params = {}) {
    const response = await api.get('/adherence', { params })
    return response.data
  }
}

// Caregiver Services
export const caregiverService = {
  // Get user's caregiver relationships
  async getRelationships() {
    const response = await api.get('/caregiver/relationships')
    return response.data
  },

  // Invite a caregiver
  async inviteCaregiver(caregiverEmail, accessLevel, notes = null) {
    const response = await api.post('/caregiver/invite', {
      caregiver_email: caregiverEmail,
      access_level: accessLevel,
      notes
    })
    return response.data
  },

  // Accept caregiver invitation
  async acceptInvitation(invitationToken) {
    const response = await api.post('/caregiver/accept-invitation', {
      invitation_token: invitationToken
    })
    return response.data
  },

  // Decline caregiver invitation
  async declineInvitation(invitationToken) {
    const response = await api.post('/caregiver/decline-invitation', {
      invitation_token: invitationToken
    })
    return response.data
  },

  // Remove caregiver relationship
  async removeRelationship(relationshipId) {
    const response = await api.delete(`/caregiver/relationships/${relationshipId}`)
    return response.data
  },

  // Get patient schedules (caregiver access)
  async getPatientSchedules(patientId) {
    const response = await api.get(`/caregiver/patients/${patientId}/schedules`)
    return response.data
  },

  // Get patient adherence data (caregiver access)
  async getPatientAdherence(patientId, params = {}) {
    const response = await api.get(`/caregiver/patients/${patientId}/adherence`, { params })
    return response.data
  },

  // Emergency contacts
  async getEmergencyContacts() {
    const response = await api.get('/caregiver/emergency-contacts')
    return response.data
  },

  async addEmergencyContact(contactData) {
    const response = await api.post('/caregiver/emergency-contacts', contactData)
    return response.data
  },

  async updateEmergencyContact(contactId, contactData) {
    const response = await api.put(`/caregiver/emergency-contacts/${contactId}`, contactData)
    return response.data
  },

  async deleteEmergencyContact(contactId) {
    const response = await api.delete(`/caregiver/emergency-contacts/${contactId}`)
    return response.data
  }
}

export default api