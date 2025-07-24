/**
 * Test Helpers for PillPulse Frontend
 * Utilities for testing React components and user interactions
 * Provides mock data and helper functions for component testing
 */

/**
 * Mock user data for testing
 */
export const mockUsers = {
  regularUser: {
    id: 1,
    email: 'user@pillpulse.test',
    role: 'user',
    has_api_key: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  
  adminUser: {
    id: 2,
    email: 'admin@pillpulse.test',
    role: 'admin',
    has_api_key: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
}

/**
 * Mock schedule data for testing
 */
export const mockSchedules = [
  {
    id: 1,
    user_id: 1,
    medication_name: 'Aspirin',
    dosage: '100mg',
    time: '08:00',
    frequency: 'daily',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 2,
    user_id: 1,
    medication_name: 'Vitamin D',
    dosage: '1000 IU',
    time: '20:00',
    frequency: 'daily',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 3,
    user_id: 1,
    medication_name: 'Calcium',
    dosage: '500mg',
    time: '12:00',
    frequency: 'weekly',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
]

/**
 * Mock adherence records for testing
 */
export const mockAdherenceRecords = [
  {
    id: 1,
    schedule_id: 1,
    date: '2025-01-24',
    taken: true,
    notes: 'Taken with breakfast',
    created_at: '2025-01-24T08:30:00Z'
  },
  {
    id: 2,
    schedule_id: 2,
    date: '2025-01-24',
    taken: false,
    notes: 'Forgot to take',
    created_at: '2025-01-24T22:00:00Z'
  },
  {
    id: 3,
    schedule_id: 1,
    date: '2025-01-23',
    taken: true,
    notes: null,
    created_at: '2025-01-23T08:15:00Z'
  }
]

/**
 * Mock analytics data for testing
 */
export const mockAnalyticsData = {
  period: {
    start_date: '2025-01-01',
    end_date: '2025-01-24',
    days_included: 24
  },
  overall_stats: {
    total_records: 48,
    taken_count: 41,
    missed_count: 7,
    adherence_rate: 85.42
  },
  adherence_by_medication: [
    {
      schedule_id: 1,
      medication_name: 'Aspirin',
      dosage: '100mg',
      frequency: 'daily',
      total_records: 24,
      taken_count: 22,
      missed_count: 2,
      adherence_rate: 91.67
    },
    {
      schedule_id: 2,
      medication_name: 'Vitamin D',
      dosage: '1000 IU',
      frequency: 'daily',
      total_records: 24,
      taken_count: 19,
      missed_count: 5,
      adherence_rate: 79.17
    }
  ],
  daily_trend: [
    { date: '2025-01-20', total_doses: 2, taken_doses: 2, missed_doses: 0, daily_adherence_rate: 100 },
    { date: '2025-01-21', total_doses: 2, taken_doses: 1, missed_doses: 1, daily_adherence_rate: 50 },
    { date: '2025-01-22', total_doses: 2, taken_doses: 2, missed_doses: 0, daily_adherence_rate: 100 },
    { date: '2025-01-23', total_doses: 2, taken_doses: 2, missed_doses: 0, daily_adherence_rate: 100 },
    { date: '2025-01-24', total_doses: 2, taken_doses: 1, missed_doses: 1, daily_adherence_rate: 50 }
  ]
}

/**
 * Mock context providers for testing
 */
export const createMockAuthContext = (user = mockUsers.regularUser, isAuthenticated = true) => ({
  user,
  token: isAuthenticated ? 'mock-jwt-token' : null,
  loading: false,
  login: jest.fn().mockResolvedValue({ user, token: 'mock-jwt-token' }),
  register: jest.fn().mockResolvedValue({ user, token: 'mock-jwt-token' }),
  logout: jest.fn(),
  isAuthenticated: jest.fn().mockReturnValue(isAuthenticated),
  isAdmin: jest.fn().mockReturnValue(user.role === 'admin')
})

export const createMockScheduleContext = (schedules = mockSchedules, loading = false) => ({
  schedules,
  adherenceRecords: mockAdherenceRecords,
  loading,
  error: null,
  fetchSchedules: jest.fn().mockResolvedValue(schedules),
  createSchedule: jest.fn().mockResolvedValue(mockSchedules[0]),
  updateSchedule: jest.fn().mockResolvedValue(mockSchedules[0]),
  deleteSchedule: jest.fn().mockResolvedValue(),
  logAdherence: jest.fn().mockResolvedValue(mockAdherenceRecords[0]),
  fetchAnalytics: jest.fn().mockResolvedValue(mockAnalyticsData),
  getTodaysSchedules: jest.fn().mockReturnValue(schedules.filter(s => s.frequency === 'daily')),
  getAdherenceStatus: jest.fn().mockReturnValue(true),
  setError: jest.fn()
})

/**
 * Test utilities for form validation
 */
export const testFormValidation = {
  /**
   * Fill form inputs with test data
   * @param {Object} container - Testing container
   * @param {Object} data - Form data to fill
   */
  fillForm: (container, data) => {
    Object.entries(data).forEach(([field, value]) => {
      const input = container.querySelector(`[name="${field}"]`)
      if (input) {
        input.value = value
        input.dispatchEvent(new Event('change', { bubbles: true }))
      }
    })
  },

  /**
   * Check for validation errors
   * @param {Object} container - Testing container
   * @param {Array} expectedErrors - Expected error messages
   */
  expectValidationErrors: (container, expectedErrors) => {
    expectedErrors.forEach(error => {
      expect(container.textContent).toContain(error)
    })
  },

  /**
   * Submit form
   * @param {Object} container - Testing container
   */
  submitForm: (container) => {
    const form = container.querySelector('form')
    if (form) {
      form.dispatchEvent(new Event('submit', { bubbles: true }))
    }
  }
}

/**
 * Mock API responses for testing
 */
export const mockApiResponses = {
  // Successful responses
  success: {
    login: {
      success: true,
      message: 'Login successful',
      data: {
        user: mockUsers.regularUser,
        token: 'mock-jwt-token'
      }
    },
    
    schedules: {
      success: true,
      message: 'Schedules retrieved successfully',
      data: {
        schedules: mockSchedules,
        pagination: {
          total: mockSchedules.length,
          limit: 50,
          offset: 0,
          has_more: false
        }
      }
    },
    
    analytics: {
      success: true,
      message: 'Analytics retrieved successfully',
      data: mockAnalyticsData
    }
  },

  // Error responses
  error: {
    unauthorized: {
      success: false,
      error: 'Authentication required',
      data: null
    },
    
    validation: {
      success: false,
      error: 'Validation failed',
      data: null,
      details: [
        { field: 'medication_name', message: 'Medication name is required' },
        { field: 'dosage', message: 'Dosage is required' }
      ]
    },
    
    notFound: {
      success: false,
      error: 'Resource not found',
      data: null
    },
    
    serverError: {
      success: false,
      error: 'Internal server error',
      data: null
    }
  }
}

/**
 * Test data generators
 */
export const generateTestData = {
  /**
   * Generate random medication schedule
   * @param {Object} overrides - Override default values
   * @returns {Object} Mock schedule data
   */
  schedule: (overrides = {}) => ({
    id: Math.floor(Math.random() * 1000),
    user_id: 1,
    medication_name: 'Test Medication',
    dosage: '100mg',
    time: '08:00',
    frequency: 'daily',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Generate random adherence record
   * @param {Object} overrides - Override default values
   * @returns {Object} Mock adherence record
   */
  adherenceRecord: (overrides = {}) => ({
    id: Math.floor(Math.random() * 1000),
    schedule_id: 1,
    date: new Date().toISOString().split('T')[0],
    taken: Math.random() > 0.5,
    notes: 'Test notes',
    created_at: new Date().toISOString(),
    ...overrides
  }),

  /**
   * Generate random user
   * @param {Object} overrides - Override default values
   * @returns {Object} Mock user data
   */
  user: (overrides = {}) => ({
    id: Math.floor(Math.random() * 1000),
    email: `test${Math.floor(Math.random() * 1000)}@pillpulse.test`,
    role: 'user',
    has_api_key: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  })
}

/**
 * Common test scenarios
 */
export const testScenarios = {
  /**
   * Test authentication flow
   */
  authentication: {
    validLogin: {
      email: 'user@pillpulse.test',
      password: 'ValidPassword123!'
    },
    
    invalidLogin: {
      email: 'invalid@email.com',
      password: 'wrong'
    },
    
    validRegistration: {
      email: 'newuser@pillpulse.test',
      password: 'ValidPassword123!',
      confirmPassword: 'ValidPassword123!'
    },
    
    invalidRegistration: {
      email: 'invalid-email',
      password: '123',
      confirmPassword: '456'
    }
  },

  /**
   * Test medication schedule creation
   */
  scheduleCreation: {
    validSchedule: {
      medication_name: 'Test Medication',
      dosage: '100mg',
      time: '08:00',
      frequency: 'daily'
    },
    
    invalidSchedule: {
      medication_name: '',
      dosage: '',
      time: 'invalid-time',
      frequency: 'invalid'
    }
  }
}

/**
 * Performance testing helpers
 */
export const performanceHelpers = {
  /**
   * Measure component render time
   * @param {Function} renderFn - Function that renders the component
   * @returns {number} Render time in milliseconds
   */
  measureRenderTime: async (renderFn) => {
    const start = performance.now()
    await renderFn()
    const end = performance.now()
    return end - start
  },

  /**
   * Test component with large datasets
   * @param {number} itemCount - Number of items to generate
   * @returns {Array} Large dataset for testing
   */
  generateLargeDataset: (itemCount = 1000) => {
    return Array.from({ length: itemCount }, (_, index) => 
      generateTestData.schedule({ id: index + 1 })
    )
  }
}

/**
 * Accessibility testing helpers
 */
export const a11yHelpers = {
  /**
   * Check for required ARIA attributes
   * @param {HTMLElement} element - Element to check
   * @returns {Array} Missing ARIA attributes
   */
  checkAriaAttributes: (element) => {
    const requiredAttrs = ['aria-label', 'aria-labelledby', 'aria-describedby']
    return requiredAttrs.filter(attr => !element.hasAttribute(attr))
  },

  /**
   * Check color contrast
   * @param {string} foreground - Foreground color
   * @param {string} background - Background color
   * @returns {boolean} Whether contrast meets WCAG standards
   */
  checkColorContrast: (foreground, background) => {
    // Simplified contrast check - in real tests, use a proper contrast library
    return foreground !== background
  }
}

export default {
  mockUsers,
  mockSchedules,
  mockAdherenceRecords,
  mockAnalyticsData,
  createMockAuthContext,
  createMockScheduleContext,
  testFormValidation,
  mockApiResponses,
  generateTestData,
  testScenarios,
  performanceHelpers,
  a11yHelpers
}