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
      className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 sticky top-0 z-50"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex justify-between items-center h-16">
          {/* Logo and brand name */}
          <Link to="/dashboard" className="flex items-center space-x-3">
            <motion.div
              className="relative w-10 h-10"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl shadow-lg"></div>
              <div className="relative w-full h-full bg-gradient-to-br from-blue-600 to-teal-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">💊</span>
              </div>
            </motion.div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">PillPulse</span>
          </Link>

          {/* Navigation links - only show if authenticated */}
          {isAuthenticated() && (
            <div className="hidden md:flex items-center space-x-2">
              {/* Dashboard link */}
              <Link
                to="/dashboard"
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActiveRoute('/dashboard')
                    ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-lg'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50/80'
                }`}
              >
                🏠 Dashboard
              </Link>

              {/* Schedule Management link */}
              <Link
                to="/schedule"
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActiveRoute('/schedule')
                    ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-lg'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50/80'
                }`}
              >
                📅 Schedules
              </Link>

              {/* Analytics link */}
              <Link
                to="/analytics"
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActiveRoute('/analytics')
                    ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-lg'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50/80'
                }`}
              >
                📊 Analytics
              </Link>

              {/* Settings link */}
              <Link
                to="/settings"
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActiveRoute('/settings')
                    ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-lg'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50/80'
                }`}
              >
                ⚙️ Settings
              </Link>

              {/* Admin link - only show for admin users */}
              {isAdmin() && (
                <Link
                  to="/admin"
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActiveRoute('/admin')
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'text-gray-700 hover:text-purple-600 hover:bg-purple-50/80'
                  }`}
                >
                  👑 Admin
                </Link>
              )}
            </div>
          )}

          {/* User menu and logout */}
          {isAuthenticated() ? (
            <div className="flex items-center space-x-4">
              {/* User email display */}
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-800">{user?.email?.split('@')[0]}</p>
                <p className="text-xs text-gray-500">{user?.role || 'User'}</p>
              </div>
              
              {/* Logout button */}
              <motion.button
                onClick={handleLogout}
                className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                🚪 Logout
              </motion.button>
            </div>
          ) : (
            /* Login link for unauthenticated users */
            <Link
              to="/login"
              className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white px-6 py-2 rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              🚀 Login
            </Link>
          )}
        </div>

        {/* Mobile navigation menu - responsive design for smaller screens */}
        {isAuthenticated() && (
          <div className="md:hidden pb-4 pt-4 border-t border-gray-200/50">
            <div className="flex flex-col space-y-2">
              <Link
                to="/dashboard"
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActiveRoute('/dashboard')
                    ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-lg'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50/80'
                }`}
              >
                🏠 Dashboard
              </Link>
              <Link
                to="/schedule"
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActiveRoute('/schedule')
                    ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-lg'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50/80'
                }`}
              >
                📅 Schedules
              </Link>
              <Link
                to="/analytics"
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActiveRoute('/analytics')
                    ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-lg'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50/80'
                }`}
              >
                📊 Analytics
              </Link>
              <Link
                to="/settings"
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActiveRoute('/settings')
                    ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-lg'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50/80'
                }`}
              >
                ⚙️ Settings
              </Link>
              {isAdmin() && (
                <Link
                  to="/admin"
                  className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActiveRoute('/admin')
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'text-gray-700 hover:text-purple-600 hover:bg-purple-50/80'
                  }`}
                >
                  👑 Admin
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