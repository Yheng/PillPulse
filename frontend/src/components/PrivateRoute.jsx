import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Private Route Component
 * Protects routes that require authentication
 * Redirects unauthenticated users to login page
 */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()

  // Show loading spinner while authentication is being verified
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pillpulse-blue"></div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  return isAuthenticated() ? children : <Navigate to="/login" replace />
}

export default PrivateRoute