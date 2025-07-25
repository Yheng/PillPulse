import bcrypt from 'bcrypt'
import { 
  getDatabase, 
  execute, 
  queryOne, 
  beginTransaction, 
  commitTransaction, 
  rollbackTransaction 
} from '../models/database.js'

/**
 * Database Seeding Utility
 * Populates the database with sample users and medication data for development and testing
 */

/**
 * Sample users data with hashed passwords
 */
const sampleUsers = [
  {
    email: 'john.doe@example.com',
    password: 'password123',
    role: 'user'
  },
  {
    email: 'jane.smith@example.com',
    password: 'password123',
    role: 'user'
  },
  {
    email: 'mike.johnson@example.com',
    password: 'password123',
    role: 'user'
  },
  {
    email: 'sarah.wilson@example.com',
    password: 'password123',
    role: 'user'
  },
  {
    email: 'david.brown@example.com',
    password: 'password123',
    role: 'user'
  },
  {
    email: 'lisa.davis@example.com',
    password: 'password123',
    role: 'user'
  },
  {
    email: 'robert.miller@example.com',
    password: 'password123',
    role: 'user'
  },
  {
    email: 'admin2@pillpulse.local',
    password: 'admin123',
    role: 'admin'
  }
]

/**
 * Sample medication schedules for each user
 */
const sampleSchedulesTemplates = [
  { medication_name: 'Metformin', dosage: '500mg', time: '08:00', frequency: 'daily' },
  { medication_name: 'Lisinopril', dosage: '10mg', time: '09:00', frequency: 'daily' },
  { medication_name: 'Atorvastatin', dosage: '20mg', time: '20:00', frequency: 'daily' },
  { medication_name: 'Aspirin', dosage: '81mg', time: '08:30', frequency: 'daily' },
  { medication_name: 'Omeprazole', dosage: '20mg', time: '07:30', frequency: 'daily' },
  { medication_name: 'Levothyroxine', dosage: '75mcg', time: '07:00', frequency: 'daily' },
  { medication_name: 'Amlodipine', dosage: '5mg', time: '19:00', frequency: 'daily' },
  { medication_name: 'Vitamin D3', dosage: '2000 IU', time: '08:00', frequency: 'daily' },
  { medication_name: 'Fish Oil', dosage: '1000mg', time: '18:00', frequency: 'daily' },
  { medication_name: 'Multivitamin', dosage: '1 tablet', time: '08:00', frequency: 'daily' },
  { medication_name: 'Prednisone', dosage: '5mg', time: '09:00', frequency: 'weekly' },
  { medication_name: 'Vitamin B12', dosage: '1000mcg', time: '08:00', frequency: 'weekly' },
  { medication_name: 'Iron Supplement', dosage: '65mg', time: '12:00', frequency: 'daily' }
]

/**
 * Generate random adherence records for the past 30 days
 */
function generateAdherenceRecords(scheduleId) {
  const records = []
  const now = new Date()
  
  // Generate records for the past 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    
    // 85% chance of taking medication (realistic adherence rate)
    const taken = Math.random() < 0.85
    
    records.push({
      schedule_id: scheduleId,
      date: date.toISOString().split('T')[0],
      taken: taken,
      notes: taken ? null : (Math.random() < 0.3 ? 'Forgot to take' : null)
    })
  }
  
  return records
}

/**
 * Seed the database with sample data
 */
export async function seedDatabase() {
  console.log('🌱 Starting database seeding...')
  
  try {
    await beginTransaction()
    
    // Check if data already exists
    const existingUsers = await queryOne('SELECT COUNT(*) as count FROM users WHERE email != ?', ['admin@pillpulse.local'])
    
    if (existingUsers.count > 0) {
      console.log('📋 Database already contains sample data. Skipping seeding.')
      await commitTransaction()
      return
    }
    
    console.log('👥 Creating sample users...')
    const createdUsers = []
    
    // Create users with hashed passwords
    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 12)
      
      const result = await execute(
        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
        [userData.email, hashedPassword, userData.role]
      )
      
      createdUsers.push({
        id: result.lastID,
        email: userData.email,
        role: userData.role
      })
      
      console.log(`✅ Created user: ${userData.email} (${userData.role})`)
    }
    
    console.log('💊 Creating sample medication schedules...')
    const createdSchedules = []
    
    // Create schedules for each user (excluding admin users)
    const regularUsers = createdUsers.filter(user => user.role === 'user')
    
    for (const user of regularUsers) {
      // Each user gets 2-4 random medications
      const numberOfMeds = Math.floor(Math.random() * 3) + 2
      const userMeds = sampleSchedulesTemplates
        .sort(() => 0.5 - Math.random())
        .slice(0, numberOfMeds)
      
      for (const med of userMeds) {
        const result = await execute(
          'INSERT INTO schedules (user_id, medication_name, dosage, time, frequency) VALUES (?, ?, ?, ?, ?)',
          [user.id, med.medication_name, med.dosage, med.time, med.frequency]
        )
        
        createdSchedules.push({
          id: result.lastID,
          user_id: user.id,
          user_email: user.email,
          medication_name: med.medication_name
        })
        
        console.log(`💊 Created schedule: ${med.medication_name} for ${user.email}`)
      }
    }
    
    console.log('📊 Creating sample adherence records...')
    let totalAdherenceRecords = 0
    
    // Create adherence records for each schedule
    for (const schedule of createdSchedules) {
      const adherenceRecords = generateAdherenceRecords(schedule.id)
      
      for (const record of adherenceRecords) {
        await execute(
          'INSERT INTO adherence_records (schedule_id, date, taken, notes) VALUES (?, ?, ?, ?)',
          [record.schedule_id, record.date, record.taken, record.notes]
        )
        totalAdherenceRecords++
      }
      
      console.log(`📈 Created ${adherenceRecords.length} adherence records for ${schedule.medication_name}`)
    }
    
    // Create settings for admin users
    console.log('⚙️ Creating admin settings...')
    const adminUsers = createdUsers.filter(user => user.role === 'admin')
    
    for (const admin of adminUsers) {
      await execute(
        'INSERT INTO settings (admin_id, reminder_frequency, reminder_format) VALUES (?, ?, ?)',
        [admin.id, 'daily', 'both']
      )
      console.log(`⚙️ Created settings for admin: ${admin.email}`)
    }
    
    await commitTransaction()
    
    console.log('🎉 Database seeding completed successfully!')
    console.log(`📊 Summary:`)
    console.log(`   👥 Users created: ${createdUsers.length}`)
    console.log(`   💊 Schedules created: ${createdSchedules.length}`)
    console.log(`   📈 Adherence records created: ${totalAdherenceRecords}`)
    console.log(`   ⚙️ Admin settings created: ${adminUsers.length}`)
    
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    await rollbackTransaction()
    throw error
  }
}

/**
 * Clear all sample data (keep only default admin)
 */
export async function clearSampleData() {
  console.log('🧹 Clearing sample data...')
  
  try {
    await beginTransaction()
    
    // Delete all users except the default admin
    await execute('DELETE FROM users WHERE email != ?', ['admin@pillpulse.local'])
    
    console.log('✅ Sample data cleared successfully!')
    await commitTransaction()
    
  } catch (error) {
    console.error('❌ Error clearing sample data:', error)
    await rollbackTransaction()
    throw error
  }
}

/**
 * Reset and reseed the database
 */
export async function reseedDatabase() {
  console.log('🔄 Reseeding database...')
  
  await clearSampleData()
  await seedDatabase()
  
  console.log('✅ Database reseeded successfully!')
}

// CLI interface
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const command = process.argv[2]
  
  switch (command) {
    case 'seed':
      seedDatabase().catch(console.error)
      break
    case 'clear':
      clearSampleData().catch(console.error)
      break
    case 'reseed':
      reseedDatabase().catch(console.error)
      break
    default:
      console.log('Usage: node seedDatabase.js [seed|clear|reseed]')
  }
}