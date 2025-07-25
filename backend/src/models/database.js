import sqlite3 from 'sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { promises as fs } from 'fs'

/**
 * Database Configuration and Management
 * Handles SQLite database initialization, schema creation, and connection management
 * Provides the main database interface for the PillPulse application
 */

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Database file path - stored in backend root directory
const DB_PATH = join(__dirname, '../../pillpulse.db')

// Enable verbose mode for debugging (disable in production)
const sqlite = sqlite3.verbose()

/**
 * Database connection instance
 * Singleton pattern to ensure single database connection
 */
let db = null

/**
 * Get database connection
 * Returns existing connection or creates new one
 * @returns {sqlite3.Database} Database connection instance
 */
export function getDatabase() {
  if (!db) {
    db = new sqlite.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Error opening database:', err.message)
        throw err
      }
      console.log('📄 Connected to SQLite database at:', DB_PATH)
    })
    
    // Enable foreign key constraints
    db.run('PRAGMA foreign_keys = ON')
    
    // Enable WAL mode for better concurrency
    db.run('PRAGMA journal_mode = WAL')
    
    // Set timeout for busy database
    db.run('PRAGMA busy_timeout = 30000')
  }
  
  return db
}

/**
 * Close database connection
 * Gracefully closes the database connection
 */
export function closeDatabase() {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message)
      } else {
        console.log('📄 Database connection closed')
      }
    })
    db = null
  }
}

/**
 * Database Schema Definitions
 * SQL statements for creating all required tables
 */

const SCHEMA_STATEMENTS = [
  // Users table - stores user accounts and authentication data
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    api_key TEXT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    push_notifications BOOLEAN DEFAULT 1,
    email_notifications BOOLEAN DEFAULT 1,
    sms_notifications BOOLEAN DEFAULT 0,
    reminder_frequency INTEGER DEFAULT 30,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  // Schedules table - stores medication schedules
  `CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    time TEXT NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`,

  // Adherence records table - tracks medication taking behavior
  `CREATE TABLE IF NOT EXISTS adherence_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    taken BOOLEAN NOT NULL,
    notes TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (schedule_id) REFERENCES schedules (id) ON DELETE CASCADE,
    UNIQUE(schedule_id, date)
  )`,

  // Settings table - stores admin and system settings
  `CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    reminder_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (reminder_frequency IN ('hourly', 'daily', 'weekly')),
    reminder_format TEXT NOT NULL DEFAULT 'text' CHECK (reminder_format IN ('text', 'email', 'both')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE CASCADE
  )`,

  // Create indexes for better query performance
  'CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)',
  'CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules (user_id)',
  'CREATE INDEX IF NOT EXISTS idx_schedules_time ON schedules (time)',
  'CREATE INDEX IF NOT EXISTS idx_adherence_schedule_id ON adherence_records (schedule_id)',
  'CREATE INDEX IF NOT EXISTS idx_adherence_date ON adherence_records (date)',
  'CREATE INDEX IF NOT EXISTS idx_adherence_schedule_date ON adherence_records (schedule_id, date)',
  'CREATE INDEX IF NOT EXISTS idx_settings_admin_id ON settings (admin_id)'
]

/**
 * Database Migration Statements
 * ALTER TABLE statements for adding new columns to existing databases
 */
const MIGRATION_STATEMENTS = [
  // Add notification settings columns to users table if they don't exist
  `ALTER TABLE users ADD COLUMN push_notifications BOOLEAN DEFAULT 1`,
  `ALTER TABLE users ADD COLUMN email_notifications BOOLEAN DEFAULT 1`,
  `ALTER TABLE users ADD COLUMN sms_notifications BOOLEAN DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN reminder_frequency INTEGER DEFAULT 30`
]

/**
 * Initialize Database
 * Creates database schema and inserts default data if needed
 * This function is called when the server starts
 */
export async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const database = getDatabase()
    
    // Execute schema creation statements sequentially
    let completed = 0
    const total = SCHEMA_STATEMENTS.length
    
    const executeNext = (index) => {
      if (index >= total) {
        console.log('✅ Database schema initialized successfully')
        // Run migrations after schema creation
        runMigrations(database)
          .then(() => insertDefaultData(database))
          .then(() => resolve())
          .catch(reject)
        return
      }
      
      database.run(SCHEMA_STATEMENTS[index], (err) => {
        if (err) {
          console.error(`❌ Error executing schema statement ${index + 1}:`, err.message)
          reject(err)
          return
        }
        
        completed++
        console.log(`📊 Schema progress: ${completed}/${total} statements completed`)
        executeNext(index + 1)
      })
    }
    
    executeNext(0)
  })
}

/**
 * Run Database Migrations
 * Executes ALTER TABLE statements for existing databases
 * Safely adds new columns if they don't already exist
 * @param {sqlite3.Database} database - Database connection
 */
async function runMigrations(database) {
  return new Promise((resolve, reject) => {
    let completed = 0
    const total = MIGRATION_STATEMENTS.length
    
    if (total === 0) {
      console.log('📊 No migrations to run')
      resolve()
      return
    }
    
    const executeMigration = (index) => {
      if (index >= total) {
        console.log('✅ Database migrations completed successfully')
        resolve()
        return
      }
      
      database.run(MIGRATION_STATEMENTS[index], (err) => {
        // Ignore "duplicate column name" errors since columns might already exist
        if (err && !err.message.includes('duplicate column name')) {
          console.error(`❌ Error executing migration ${index + 1}:`, err.message)
          reject(err)
          return
        }
        
        if (err) {
          console.log(`⚠️ Migration ${index + 1} skipped (column already exists)`)
        } else {
          console.log(`📊 Migration ${index + 1} executed successfully`)
        }
        
        completed++
        executeMigration(index + 1)
      })
    }
    
    console.log(`📊 Running ${total} database migrations...`)
    executeMigration(0)
  })
}

/**
 * Insert Default Data
 * Creates default admin user and system settings if they don't exist
 * @param {sqlite3.Database} database - Database connection
 */
async function insertDefaultData(database) {
  return new Promise((resolve, reject) => {
    // Check if admin user exists
    database.get(
      'SELECT id FROM users WHERE role = ? LIMIT 1',
      ['admin'],
      async (err, row) => {
        if (err) {
          reject(err)
          return
        }
        
        // If no admin user exists, create default one
        if (!row) {
          try {
            await createDefaultAdmin(database)
            console.log('👑 Default admin user created')
          } catch (error) {
            console.error('❌ Failed to create default admin:', error)
            reject(error)
            return
          }
        }
        
        console.log('✅ Default data initialization completed')
        resolve()
      }
    )
  })
}

/**
 * Create Default Admin User
 * Creates a default admin account for initial system access
 * @param {sqlite3.Database} database - Database connection
 */
async function createDefaultAdmin(database) {
  const bcrypt = await import('bcrypt')
  
  const defaultAdmin = {
    email: 'admin@pillpulse.local',
    password: await bcrypt.hash('admin123', 12), // Hash with salt rounds
    role: 'admin'
  }
  
  return new Promise((resolve, reject) => {
    database.run(
      'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
      [defaultAdmin.email, defaultAdmin.password, defaultAdmin.role],
      function(err) {
        if (err) {
          reject(err)
          return
        }
        
        const adminId = this.lastID
        
        // Create default settings for admin
        database.run(
          'INSERT INTO settings (admin_id, reminder_frequency, reminder_format) VALUES (?, ?, ?)',
          [adminId, 'daily', 'text'],
          (settingsErr) => {
            if (settingsErr) {
              console.warn('⚠️ Warning: Could not create default settings:', settingsErr.message)
            }
            resolve(adminId)
          }
        )
      }
    )
  })
}

/**
 * Database Query Helpers
 * Utility functions for common database operations
 */

/**
 * Execute a database query with promise wrapper
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise} Promise resolving to query results
 */
export function query(sql, params = []) {
  const database = getDatabase()
  
  return new Promise((resolve, reject) => {
    database.all(sql, params, (err, rows) => {
      if (err) {
        console.error('❌ Database query error:', err.message)
        console.error('❌ SQL:', sql)
        console.error('❌ Params:', params)
        reject(err)
        return
      }
      resolve(rows)
    })
  })
}

/**
 * Execute a database query that returns a single row
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise} Promise resolving to single row or null
 */
export function queryOne(sql, params = []) {
  const database = getDatabase()
  
  return new Promise((resolve, reject) => {
    database.get(sql, params, (err, row) => {
      if (err) {
        console.error('❌ Database query error:', err.message)
        console.error('❌ SQL:', sql)
        console.error('❌ Params:', params)
        reject(err)
        return
      }
      resolve(row || null)
    })
  })
}

/**
 * Execute a database statement (INSERT, UPDATE, DELETE)
 * @param {string} sql - SQL statement string
 * @param {Array} params - Statement parameters
 * @returns {Promise} Promise resolving to statement result
 */
export function execute(sql, params = []) {
  const database = getDatabase()
  
  return new Promise((resolve, reject) => {
    database.run(sql, params, function(err) {
      if (err) {
        console.error('❌ Database execute error:', err.message)
        console.error('❌ SQL:', sql)
        console.error('❌ Params:', params)
        reject(err)
        return
      }
      
      // Return useful information about the operation
      resolve({
        lastID: this.lastID,
        changes: this.changes,
        sql,
        params
      })
    })
  })
}

/**
 * Begin database transaction
 * @returns {Promise} Promise resolving when transaction begins
 */
export function beginTransaction() {
  return execute('BEGIN TRANSACTION')
}

/**
 * Commit database transaction
 * @returns {Promise} Promise resolving when transaction commits
 */
export function commitTransaction() {
  return execute('COMMIT')
}

/**
 * Rollback database transaction
 * @returns {Promise} Promise resolving when transaction rolls back
 */
export function rollbackTransaction() {
  return execute('ROLLBACK')
}

// Export database instance for direct access if needed
export { db }