import axios from 'axios'

const API_URL = 'http://localhost:3000/api'

// Test admin functionality
async function testAdminFunctionality() {
  try {
    console.log('🧪 Testing Admin Functionality...')
    
    // 1. Login as admin
    console.log('1. Logging in as admin...')
    const loginResponse = await axios.post(`${API_URL}/users/login`, {
      email: 'admin@pillpulse.local',
      password: 'admin123'
    })
    
    const adminToken = loginResponse.data.data.token
    console.log('✅ Admin login successful')
    
    // Set authorization header
    axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`
    
    // 2. Seed database
    console.log('2. Seeding database...')
    const seedResponse = await axios.post(`${API_URL}/admin/seed`)
    console.log('✅ Database seeded:', seedResponse.data.data)
    
    // 3. Get users
    console.log('3. Fetching users...')
    const usersResponse = await axios.get(`${API_URL}/admin/users`)
    console.log('✅ Users fetched:', usersResponse.data.data.users.length, 'users')
    
    const regularUsers = usersResponse.data.data.users.filter(u => u.role === 'user')
    if (regularUsers.length === 0) {
      console.log('❌ No regular users found')
      return
    }
    
    // 4. Test login-as-user
    console.log('4. Testing login-as-user...')
    const targetUser = regularUsers[0]
    console.log(`   Impersonating user: ${targetUser.email} (ID: ${targetUser.id})`)
    
    const impersonationResponse = await axios.post(`${API_URL}/admin/login-as-user`, {
      user_id: targetUser.id
    })
    
    console.log('✅ Impersonation token generated successfully')
    console.log('   Token length:', impersonationResponse.data.data.token.length)
    console.log('   Target user:', impersonationResponse.data.data.user)
    console.log('   Impersonated by:', impersonationResponse.data.data.impersonated_by)
    
    // 5. Test the impersonation token
    console.log('5. Testing impersonation token...')
    const impersonationToken = impersonationResponse.data.data.token
    
    const profileResponse = await axios.get(`${API_URL}/users/profile`, {
      headers: {
        'Authorization': `Bearer ${impersonationToken}`
      }
    })
    
    console.log('✅ Impersonation token works! User profile:', {
      id: profileResponse.data.data.id,
      email: profileResponse.data.data.email,
      role: profileResponse.data.data.role
    })
    
    console.log('🎉 All admin functionality tests passed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message)
  }
}

testAdminFunctionality()