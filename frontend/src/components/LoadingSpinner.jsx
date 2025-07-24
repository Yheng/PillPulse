import React from 'react'
import { motion } from 'framer-motion'

/**
 * Loading Spinner Component
 * Reusable loading indicator with different sizes and styles
 * Provides consistent loading feedback throughout the application
 */

/**
 * Loading Spinner
 * @param {Object} props - Component props
 * @param {string} props.size - Size variant: 'sm', 'md', 'lg', 'xl'
 * @param {string} props.color - Color variant: 'blue', 'white', 'gray'
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.text - Optional loading text
 */
const LoadingSpinner = ({ 
  size = 'md', 
  color = 'blue', 
  className = '', 
  text = null 
}) => {
  // Size configurations
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  }

  // Color configurations
  const colorClasses = {
    blue: 'border-pillpulse-blue',
    white: 'border-white',
    gray: 'border-gray-600',
    green: 'border-pillpulse-green',
    teal: 'border-pillpulse-teal'
  }

  // Text size based on spinner size
  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center space-y-2">
        {/* Spinning circle */}
        <motion.div
          className={`
            ${sizeClasses[size]} 
            ${colorClasses[color]} 
            border-2 border-t-transparent rounded-full
          `}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
        
        {/* Optional loading text */}
        {text && (
          <motion.p
            className={`
              ${textSizeClasses[size]} 
              text-gray-600 font-medium
            `}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {text}
          </motion.p>
        )}
      </div>
    </div>
  )
}

/**
 * Full Screen Loading Overlay
 * Covers the entire screen with a loading indicator
 * @param {Object} props - Component props
 * @param {string} props.text - Loading message
 * @param {boolean} props.blur - Whether to blur the background
 */
export const FullScreenLoader = ({ text = 'Loading...', blur = true }) => {
  return (
    <motion.div
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        ${blur ? 'backdrop-blur-sm' : ''}
        bg-black bg-opacity-30
      `}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-lg shadow-xl p-8"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <LoadingSpinner size="lg" text={text} />
      </motion.div>
    </motion.div>
  )
}

/**
 * Inline Loading State
 * Shows loading within a content area
 * @param {Object} props - Component props
 * @param {string} props.text - Loading message
 * @param {string} props.height - Height class (e.g., 'h-64')
 */
export const InlineLoader = ({ text = 'Loading...', height = 'h-32' }) => {
  return (
    <div className={`flex items-center justify-center ${height}`}>
      <LoadingSpinner size="md" text={text} />
    </div>
  )
}

/**
 * Button Loading State
 * Loading indicator for buttons
 * @param {Object} props - Component props
 * @param {string} props.text - Button text while loading
 */
export const ButtonLoader = ({ text = 'Loading...' }) => {
  return (
    <div className="flex items-center justify-center space-x-2">
      <LoadingSpinner size="sm" color="white" />
      <span>{text}</span>
    </div>
  )
}

/**
 * Card Loading Skeleton
 * Placeholder for card content while loading
 */
export const CardSkeleton = () => {
  return (
    <div className="animate-pulse bg-white rounded-lg shadow-md p-6">
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="flex space-x-4 mt-6">
          <div className="h-8 bg-gray-200 rounded w-20"></div>
          <div className="h-8 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    </div>
  )
}

/**
 * Table Loading Skeleton
 * Placeholder for table content while loading
 * @param {Object} props - Component props
 * @param {number} props.rows - Number of skeleton rows
 * @param {number} props.columns - Number of skeleton columns
 */
export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="animate-pulse">
      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="border-b border-gray-200">
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className="text-left py-3 px-4">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-gray-100">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="py-3 px-4">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Loading States for Different Content Types
 */
export const LoadingStates = {
  // Chart loading placeholder
  Chart: () => (
    <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center animate-pulse">
      <div className="text-center">
        <div className="h-6 w-32 bg-gray-200 rounded mx-auto mb-4"></div>
        <LoadingSpinner size="md" text="Loading chart..." />
      </div>
    </div>
  ),

  // Dashboard cards loading
  DashboardCards: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  ),

  // List loading
  List: ({ items = 5 }) => (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="animate-pulse flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm">
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default LoadingSpinner