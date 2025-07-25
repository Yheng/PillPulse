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

export default api