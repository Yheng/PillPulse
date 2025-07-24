import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Import route handlers
import userRoutes from './src/routes/userRoutes.js'
import scheduleRoutes from './src/routes/scheduleRoutes.js'
import adherenceRoutes from './src/routes/adherenceRoutes.js'
import analyticsRoutes from './src/routes/analyticsRoutes.js'
import adminRoutes from './src/routes/adminRoutes.js'

// Import database initialization
import { initializeDatabase } from './src/models/database.js'

// Import middleware
import { errorHandler } from './src/middleware/errorHandler.js'
import { requestLogger } from './src/middleware/requestLogger.js'

/**
 * PillPulse Express Server
 * Main server file for the medication adherence tracking application
 * Configures middleware, routes, and database connections
 * Provides RESTful API for frontend React application
 */

// Load environment variables
dotenv.config()

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Create Express application
const app = express()
const PORT = process.env.PORT || 3000

/**
 * Security Configuration
 * Applies security headers, CORS, and rate limiting
 */

// Apply security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}))

// Configure CORS for frontend communication
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Apply rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    data: null
  },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api', limiter)

/**
 * Middleware Configuration
 * Applies parsing, logging, and request processing middleware
 */

// Parse JSON bodies with size limit
app.use(express.json({ limit: '10mb' }))

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging middleware
app.use(requestLogger)

/**
 * API Routes Configuration
 * Defines all API endpoints with their respective route handlers
 */

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'PillPulse API is running',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  })
})

// User authentication and profile routes
app.use('/api/users', userRoutes)

// Medication schedule management routes
app.use('/api/schedules', scheduleRoutes)

// Adherence tracking routes
app.use('/api/adherence', adherenceRoutes)

// Analytics and reporting routes
app.use('/api/analytics', analyticsRoutes)

// Admin management routes (protected)
app.use('/api/admin', adminRoutes)

/**
 * Error Handling
 * Catches and processes all errors with consistent response format
 */

// Handle 404 errors for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
    data: null
  })
})

// Global error handler middleware
app.use(errorHandler)

/**
 * Database Initialization and Server Startup
 * Initializes SQLite database and starts the Express server
 */

async function startServer() {
  try {
    // Initialize database schema and tables
    console.log('🔄 Initializing database...')
    await initializeDatabase()
    console.log('✅ Database initialized successfully')

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 PillPulse API server running on port ${PORT}`)
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
      console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`)
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)
    })

  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

/**
 * Graceful Shutdown Handling
 * Properly closes database connections and server on termination signals
 */

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...')
  // Close database connections here if needed
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully...')
  // Close database connections here if needed
  process.exit(0)
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  process.exit(1)
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Start the server
startServer()

export default app