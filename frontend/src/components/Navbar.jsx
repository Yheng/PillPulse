import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

/**
 * Navigation Bar Component
 * Provides site-wide navigation with responsive design and authentication-aware menu items
 * Displays different navigation options based on user authentication and role status
 * Includes smooth animations and active route highlighting
 */
const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  /**
   * Handle user logout
   * Logs out user and redirects to login page
   */
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  /**
   * Check if a route is currently active
   * @param {string} path - Route path to check
   * @returns {boolean} True if route is active
   */
  const isActiveRoute = (path) => {
    return location.pathname === path
  }

  // Don't show navbar on login page
  if (location.pathname === '/login') {
    return null
  }

  return (
    <motion.nav 
      className="bg-white shadow-lg border-b border-gray-200"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo and brand name */}
          <Link to="/dashboard" className="flex items-center space-x-2">
            <motion.div
              className="w-8 h-8 bg-pillpulse-blue rounded-full flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-white font-bold text-sm">P</span>
            </motion.div>
            <span className="text-xl font-bold text-gray-800">PillPulse</span>
          </Link>

          {/* Navigation links - only show if authenticated */}
          {isAuthenticated() && (
            <div className="hidden md:flex items-center space-x-6">
              {/* Dashboard link */}
              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isActiveRoute('/dashboard')
                    ? 'bg-pillpulse-blue text-white'
                    : 'text-gray-700 hover:text-pillpulse-blue hover:bg-blue-50'
                }`}
              >
                Dashboard
              </Link>

              {/* Analytics link */}
              <Link
                to="/analytics"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isActiveRoute('/analytics')
                    ? 'bg-pillpulse-blue text-white'
                    : 'text-gray-700 hover:text-pillpulse-blue hover:bg-blue-50'
                }`}
              >
                Analytics
              </Link>

              {/* Settings link */}
              <Link
                to="/settings"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isActiveRoute('/settings')
                    ? 'bg-pillpulse-blue text-white'
                    : 'text-gray-700 hover:text-pillpulse-blue hover:bg-blue-50'
                }`}
              >
                Settings
              </Link>

              {/* Admin link - only show for admin users */}
              {isAdmin() && (
                <Link
                  to="/admin"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActiveRoute('/admin')
                      ? 'bg-pillpulse-teal text-white'
                      : 'text-gray-700 hover:text-pillpulse-teal hover:bg-teal-50'
                  }`}
                >
                  Admin
                </Link>
              )}
            </div>
          )}

          {/* User menu and logout */}
          {isAuthenticated() ? (
            <div className="flex items-center space-x-4">
              {/* User email display */}
              <span className="hidden sm:block text-sm text-gray-600">
                {user?.email}
              </span>
              
              {/* Logout button */}
              <motion.button
                onClick={handleLogout}
                className="bg-pillpulse-gray hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Logout
              </motion.button>
            </div>
          ) : (
            /* Login link for unauthenticated users */
            <Link
              to="/login"
              className="bg-pillpulse-blue hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile navigation menu - responsive design for smaller screens */}
        {isAuthenticated() && (
          <div className="md:hidden pb-4">
            <div className="flex flex-col space-y-2">
              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isActiveRoute('/dashboard')
                    ? 'bg-pillpulse-blue text-white'
                    : 'text-gray-700 hover:text-pillpulse-blue hover:bg-blue-50'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/analytics"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isActiveRoute('/analytics')
                    ? 'bg-pillpulse-blue text-white'
                    : 'text-gray-700 hover:text-pillpulse-blue hover:bg-blue-50'
                }`}
              >
                Analytics
              </Link>
              <Link
                to="/settings"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isActiveRoute('/settings')
                    ? 'bg-pillpulse-blue text-white'
                    : 'text-gray-700 hover:text-pillpulse-blue hover:bg-blue-50'
                }`}
              >
                Settings
              </Link>
              {isAdmin() && (
                <Link
                  to="/admin"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActiveRoute('/admin')
                      ? 'bg-pillpulse-teal text-white'
                      : 'text-gray-700 hover:text-pillpulse-teal hover:bg-teal-50'
                  }`}
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.nav>
  )
}

export default Navbar