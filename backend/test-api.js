/**
 * API Testing Script for PillPulse Backend
 * Tests all major endpoints to ensure they're working correctly
 * Run with: node test-api.js (while server is running)
 */

import axios from 'axios'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// Configuration
const BASE_URL = 'http://localhost:3000'
const API_URL = `${BASE_URL}/api`

// Test data
let authToken = ''
let testUserId = ''
let testScheduleId = ''

/**
 * Test runner utility
 * @param {string} name - Test name
 * @param {Function} testFn - Test function to run
 */
async function runTest(name, testFn) {
  try {
    console.log(`\n🔵 Testing: ${name}`)
    await testFn()
    console.log(`✅ PASSED: ${name}`)
  } catch (error) {
    console.error(`❌ FAILED: ${name}`)
    console.error(`   Error: ${error.message}`)
    if (error.response) {
      console.error(`   Status: ${error.response.status}`)
      console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`)
    }
  }
}

/**
 * Test health endpoint
 */
async function testHealth() {
  const response = await axios.get(`${API_URL}/health`)
  
  if (response.data.success !== true) {
    throw new Error('Health check failed')
  }
  
  console.log(`   Server status: ${response.data.data.status}`)
  console.log(`   Environment: ${response.data.data.environment}`)
}

/**
 * Test user registration
 */
async function testUserRegistration() {
  const testUser = {
    email: `test.user.${Date.now()}@pillpulse.test`,
    password: 'TestPassword123!'
  }
  
  const response = await axios.post(`${API_URL}/users/register`, testUser)
  
  if (response.data.success !== true) {
    throw new Error('Registration failed')
  }
  
  // Store for later tests
  authToken = response.data.data.token
  testUserId = response.data.data.user.id
  
  console.log(`   User created: ${response.data.data.user.email}`)
  console.log(`   User ID: ${testUserId}`)
}

/**
 * Test user login
 */
async function testUserLogin() {
  // First create a test user if we don't have one
  if (!authToken) {
    await testUserRegistration()
  }
  
  // Try to login with default admin
  const adminCredentials = {
    email: 'admin@pillpulse.local',
    password: 'admin123'
  }
  
  const response = await axios.post(`${API_URL}/users/login`, adminCredentials)
  
  if (response.data.success !== true) {
    throw new Error('Login failed')
  }
  
  // Use admin token for further tests
  authToken = response.data.data.token
  testUserId = response.data.data.user.id
  
  console.log(`   Logged in as: ${response.data.data.user.email}`)
  console.log(`   Role: ${response.data.data.user.role}`)
}

/**
 * Test user profile retrieval
 */
async function testUserProfile() {
  const response = await axios.get(`${API_URL}/users/profile`, {
    headers: { Authorization: `Bearer ${authToken}` }
  })
  
  if (response.data.success !== true) {
    throw new Error('Profile retrieval failed')
  }
  
  console.log(`   Profile email: ${response.data.data.email}`)
  console.log(`   Profile role: ${response.data.data.role}`)
}

/**
 * Test schedule creation
 */
async function testScheduleCreation() {
  const testSchedule = {
    medication_name: 'Test Medication',
    dosage: '100mg',
    time: '08:00',
    frequency: 'daily'
  }
  
  const response = await axios.post(`${API_URL}/schedules`, testSchedule, {
    headers: { Authorization: `Bearer ${authToken}` }
  })
  
  if (response.data.success !== true) {
    throw new Error('Schedule creation failed')
  }
  
  testScheduleId = response.data.data.id
  
  console.log(`   Schedule created: ${response.data.data.medication_name}`)
  console.log(`   Schedule ID: ${testScheduleId}`)
}

/**
 * Test schedule retrieval
 */
async function testScheduleRetrieval() {
  const response = await axios.get(`${API_URL}/schedules`, {
    headers: { Authorization: `Bearer ${authToken}` }
  })
  
  if (response.data.success !== true) {
    throw new Error('Schedule retrieval failed')
  }
  
  const schedules = response.data.data.schedules || response.data.data
  console.log(`   Found ${Array.isArray(schedules) ? schedules.length : 0} schedules`)
}

/**
 * Test schedule update
 */
async function testScheduleUpdate() {
  if (!testScheduleId) {
    await testScheduleCreation()
  }
  
  const updateData = {
    dosage: '200mg',
    time: '09:00'
  }
  
  const response = await axios.put(`${API_URL}/schedules/${testScheduleId}`, updateData, {
    headers: { Authorization: `Bearer ${authToken}` }
  })
  
  if (response.data.success !== true) {
    throw new Error('Schedule update failed')
  }
  
  console.log(`   Updated dosage: ${response.data.data.dosage}`)
  console.log(`   Updated time: ${response.data.data.time}`)
}

/**
 * Test adherence logging
 */
async function testAdherenceLogging() {
  if (!testScheduleId) {
    await testScheduleCreation()
  }
  
  const adherenceData = {
    schedule_id: testScheduleId,
    date: new Date().toISOString().split('T')[0],
    taken: true,
    notes: 'Test adherence record'
  }
  
  const response = await axios.post(`${API_URL}/adherence`, adherenceData, {
    headers: { Authorization: `Bearer ${authToken}` }
  })
  
  if (response.data.success !== true) {
    throw new Error('Adherence logging failed')
  }
  
  console.log(`   Logged adherence for schedule ${testScheduleId}`)
  console.log(`   Taken: ${response.data.data.taken}`)
}

/**
 * Test analytics retrieval
 */
async function testAnalytics() {
  const response = await axios.get(`${API_URL}/analytics`, {
    headers: { Authorization: `Bearer ${authToken}` }
  })
  
  if (response.data.success !== true) {
    throw new Error('Analytics retrieval failed')
  }
  
  const stats = response.data.data.overall_stats
  console.log(`   Total records: ${stats.total_records}`)
  console.log(`   Adherence rate: ${stats.adherence_rate}%`)
}

/**
 * Test error handling (invalid request)
 */
async function testErrorHandling() {
  try {
    // This should fail with validation error
    await axios.post(`${API_URL}/schedules`, {
      medication_name: '', // Invalid empty name
      dosage: '100mg',
      time: 'invalid-time', // Invalid time format
      frequency: 'invalid' // Invalid frequency
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
    
    throw new Error('Expected validation error but request succeeded')
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log(`   Correctly returned 400 for invalid data`)
    } else {
      throw error
    }
  }
}

/**
 * Test unauthorized access
 */
async function testUnauthorizedAccess() {
  try {
    // This should fail with 401
    await axios.get(`${API_URL}/schedules`)
    
    throw new Error('Expected 401 unauthorized but request succeeded')
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log(`   Correctly returned 401 for unauthorized access`)
    } else {
      throw error
    }
  }
}

/**
 * Cleanup test data
 */
async function cleanup() {
  console.log('\n🧹 Cleaning up test data...')
  
  try {
    // Delete test schedule if it exists
    if (testScheduleId) {
      await axios.delete(`${API_URL}/schedules/${testScheduleId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      console.log(`   Deleted test schedule ${testScheduleId}`)
    }
  } catch (error) {
    console.log(`   Cleanup warning: ${error.message}`)
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🚀 Starting PillPulse API Tests...')
  console.log(`📡 Testing against: ${API_URL}`)
  
  // Basic connectivity
  await runTest('Health Check', testHealth)
  
  // Authentication tests
  await runTest('User Login', testUserLogin)
  await runTest('User Profile', testUserProfile)
  
  // Schedule management tests
  await runTest('Schedule Creation', testScheduleCreation)
  await runTest('Schedule Retrieval', testScheduleRetrieval)
  await runTest('Schedule Update', testScheduleUpdate)
  
  // Adherence tests
  await runTest('Adherence Logging', testAdherenceLogging)
  
  // Analytics tests
  await runTest('Analytics Retrieval', testAnalytics)
  
  // Error handling tests
  await runTest('Error Handling', testErrorHandling)
  await runTest('Unauthorized Access', testUnauthorizedAccess)
  
  // Cleanup
  await cleanup()
  
  console.log('\n🎉 API Testing Complete!')
  console.log('\nTo run these tests:')
  console.log('1. Make sure the backend server is running (npm run dev)')
  console.log('2. Run: node test-api.js')
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    console.error('\n💥 Test runner failed:', error.message)
    process.exit(1)
  })
}