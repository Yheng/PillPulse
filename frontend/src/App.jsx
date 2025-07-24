import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ScheduleProvider } from './context/ScheduleContext'
import UserDashboard from './pages/UserDashboard'
import AnalyticsPage from './pages/AnalyticsPage'
import LoginPage from './pages/LoginPage'
import SettingsPage from './pages/SettingsPage'
import AdminDashboard from './pages/AdminDashboard'
import Navbar from './components/Navbar'
import PrivateRoute from './components/PrivateRoute'
import ErrorBoundary from './components/ErrorBoundary'

/**
 * Main App component for PillPulse application
 * Sets up routing, context providers, and overall application structure
 * Provides authentication and schedule management state throughout the app
 * 
 * Routes:
 * - /login: User authentication
 * - /dashboard: Main user dashboard with medication schedules
 * - /analytics: Charts and analytics for medication adherence
 * - /settings: User settings and API key management
 * - /admin: Admin dashboard for user and schedule management
 */
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ScheduleProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Navbar />
              <main className="container mx-auto px-4 py-8">
                <Routes>
                  {/* Public route */}
                  <Route path="/login" element={<LoginPage />} />
                  
                  {/* Protected user routes */}
                  <Route path="/dashboard" element={<PrivateRoute><UserDashboard /></PrivateRoute>} />
                  <Route path="/analytics" element={<PrivateRoute><AnalyticsPage /></PrivateRoute>} />
                  <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
                  
                  {/* Admin route */}
                  <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
                  
                  {/* Default redirect to dashboard */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </main>
            </div>
          </Router>
        </ScheduleProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App