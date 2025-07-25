import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Header Component
 * Reusable header with navigation, user menu, and logout functionality
 * Used across all authenticated pages for consistent navigation experience
 */
const Header = ({ title = "PillPulse", showBackButton = false, backTo = "/dashboard" }) => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  /**
   * Handle navigation to settings page
   */
  const handleSettingsClick = () => {
    navigate('/settings')
    setShowUserMenu(false)
  }

  /**
   * Handle user profile menu toggle
   */
  const handleProfileClick = () => {
    setShowUserMenu(!showUserMenu)
  }

  /**
   * Handle user logout
   */
  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  /**
   * Handle back navigation
   */
  const handleBackClick = () => {
    navigate(backTo)
  }

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-container')) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  return (
    <div className="bg-pillpulse-blue text-white px-6 py-4 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {/* Back Button */}
          {showBackButton && (
            <motion.button
              onClick={handleBackClick}
              className="w-10 h-10 bg-pillpulse-gray rounded-full flex items-center justify-center text-gray-600 hover:text-pillpulse-teal cursor-pointer transition-colors duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Back"
            >
              ←
            </motion.button>
          )}
          
          {/* Title */}
          <motion.h1 
            className="text-2xl font-bold cursor-pointer"
            onClick={() => navigate('/dashboard')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {title}
          </motion.h1>
        </div>

        <div className="flex items-center space-x-4 relative">
          {/* Settings Icon */}
          <motion.div 
            className="w-10 h-10 bg-pillpulse-gray rounded-full flex items-center justify-center text-gray-600 hover:text-pillpulse-teal cursor-pointer transition-colors duration-200"
            onClick={handleSettingsClick}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Settings"
          >
            ⚙️
          </motion.div>
          
          {/* Profile/User Menu Icon */}
          <div className="user-menu-container relative">
            <motion.div 
              className="w-10 h-10 bg-pillpulse-gray rounded-full flex items-center justify-center text-gray-600 hover:text-pillpulse-teal cursor-pointer transition-colors duration-200"
              onClick={handleProfileClick}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Profile Menu"
            >
              👤
            </motion.div>
            
            {/* User Menu Dropdown */}
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  className="absolute top-12 right-0 bg-white rounded-lg shadow-xl border py-2 min-w-48 z-20"
                  initial={{ opacity: 0, y: -10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="font-medium text-gray-800">{user?.email}</p>
                    <p className="text-sm text-gray-500">{user?.role || 'User'}</p>
                  </div>
                  <motion.button
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    onClick={() => {
                      navigate('/dashboard')
                      setShowUserMenu(false)
                    }}
                    whileHover={{ backgroundColor: '#f3f4f6' }}
                  >
                    🏠 Dashboard
                  </motion.button>
                  <motion.button
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    onClick={() => {
                      navigate('/settings')
                      setShowUserMenu(false)
                    }}
                    whileHover={{ backgroundColor: '#f3f4f6' }}
                  >
                    ⚙️ Settings
                  </motion.button>
                  <motion.button
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    onClick={() => {
                      navigate('/analytics')
                      setShowUserMenu(false)
                    }}
                    whileHover={{ backgroundColor: '#f3f4f6' }}
                  >
                    📊 Analytics
                  </motion.button>
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <motion.button
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors duration-150"
                      onClick={() => {
                        handleLogout()
                        setShowUserMenu(false)
                      }}
                      whileHover={{ backgroundColor: '#fef2f2' }}
                    >
                      🚪 Logout
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Logout Icon */}
          <motion.div 
            className="w-10 h-10 bg-pillpulse-gray rounded-full flex items-center justify-center text-gray-600 hover:text-red-500 cursor-pointer transition-colors duration-200"
            onClick={handleLogout}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Logout"
          >
            🚪
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default Header