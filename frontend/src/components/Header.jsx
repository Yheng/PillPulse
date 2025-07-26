import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

/**
 * Header Component
 * Reusable header with navigation, user menu, and logout functionality
 * Used across all authenticated pages for consistent navigation experience
 */
const Header = ({ title = "PillPulse", showBackButton = false, backTo = "/dashboard" }) => {
  const navigate = useNavigate()

  /**
   * Handle back navigation
   */
  const handleBackClick = () => {
    navigate(backTo)
  }

  return (
    <div className="bg-pillpulse-blue text-white px-4 sm:px-6 py-4 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Back Button */}
          {showBackButton && (
            <motion.button
              onClick={handleBackClick}
              className="w-8 h-8 sm:w-10 sm:h-10 bg-pillpulse-gray rounded-full flex items-center justify-center text-gray-600 hover:text-pillpulse-teal cursor-pointer transition-colors duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Back"
            >
              ←
            </motion.button>
          )}
          
          {/* Title */}
          <motion.h1 
            className="text-lg sm:text-2xl font-bold cursor-pointer truncate"
            onClick={() => handleNavigate('/dashboard')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {title}
          </motion.h1>
        </div>

        {/* Right side - simplified for pages */}
        <div></div>
      </div>
    </div>
  )
}

export default Header