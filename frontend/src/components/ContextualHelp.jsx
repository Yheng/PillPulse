import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboarding } from '../context/OnboardingContext'

/**
 * Contextual Help Component
 * Provides contextual tooltips and help hints throughout the application
 * Shows relevant guidance based on user actions and current context
 */
const ContextualHelp = ({ 
  feature, 
  trigger = 'hover', 
  position = 'top',
  delay = 500,
  children 
}) => {
  const { needsHelpWith, hasCompletedTutorial } = useOnboarding()
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipContent, setTooltipContent] = useState(null)

  // Help content for different features
  const helpContent = {
    'add-medication': {
      title: 'Add Medication',
      description: 'Click here to add a new medication to your schedule. Include the name, dosage, time, and frequency.',
      tips: 'Start with your most important medications first.'
    },
    'medication-card': {
      title: 'Medication Schedule',
      description: 'This card shows your medication details. Click to edit or mark as taken.',
      tips: 'Green checkmarks indicate completed doses.'
    },
    'streak-counter': {
      title: 'Adherence Streak',
      description: 'Track your consecutive days of perfect medication adherence.',
      tips: 'Maintaining streaks improves health outcomes!'
    },
    'notifications': {
      title: 'Smart Notifications',
      description: 'Get timely reminders for your medications with smart escalation.',
      tips: 'You can snooze notifications or mark medications as taken directly.'
    },
    'analytics-chart': {
      title: 'Adherence Analytics',
      description: 'Visualize your medication adherence patterns over time.',
      tips: 'Look for trends to identify areas for improvement.'
    },
    'caregiver-invite': {
      title: 'Caregiver Support',
      description: 'Invite family members or caregivers to help monitor your medication adherence.',
      tips: 'Caregivers can receive emergency alerts for missed critical medications.'
    },
    'ai-coach': {
      title: 'AI Health Coach',
      description: 'Get personalized insights and motivation from your AI health coach.',
      tips: 'The AI learns from your patterns to provide better guidance.'
    },
    'emergency-contacts': {
      title: 'Emergency Contacts',
      description: 'Add contacts who should be notified if you miss critical medications.',
      tips: 'List contacts in priority order for emergency situations.'
    }
  }

  useEffect(() => {
    const content = helpContent[feature]
    if (content) {
      setTooltipContent(content)
    }
  }, [feature])

  // Don't show help if tutorial is completed and user doesn't need help
  if (hasCompletedTutorial && !needsHelpWith(feature)) {
    return <>{children}</>
  }

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      setTimeout(() => setShowTooltip(true), delay)
    }
  }

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setShowTooltip(false)
    }
  }

  const handleClick = () => {
    if (trigger === 'click') {
      setShowTooltip(!showTooltip)
    }
  }

  if (!tooltipContent) {
    return <>{children}</>
  }

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
      
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: position === 'top' ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: position === 'top' ? 10 : -10 }}
            className={`absolute z-50 ${getPositionClasses(position)}`}
          >
            {/* Tooltip Arrow */}
            <div className={`absolute ${getArrowClasses(position)}`} />
            
            {/* Tooltip Content */}
            <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4 max-w-xs">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0">
                  💡
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800 text-sm mb-1">
                    {tooltipContent.title}
                  </h4>
                  <p className="text-gray-600 text-xs mb-2">
                    {tooltipContent.description}
                  </p>
                  {tooltipContent.tips && (
                    <p className="text-blue-600 text-xs bg-blue-50 rounded px-2 py-1">
                      💡 {tooltipContent.tips}
                    </p>
                  )}
                </div>
              </div>
              
              {trigger === 'click' && (
                <button
                  onClick={() => setShowTooltip(false)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 w-4 h-4 flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Get CSS classes for tooltip positioning
 */
const getPositionClasses = (position) => {
  const positions = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  }
  return positions[position] || positions.top
}

/**
 * Get CSS classes for tooltip arrow
 */
const getArrowClasses = (position) => {
  const arrows = {
    top: 'top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white',
    left: 'left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-white',
    right: 'right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-white'
  }
  return arrows[position] || arrows.top
}

/**
 * Help Badge Component - Shows a pulsing help indicator
 */
export const HelpBadge = ({ feature, className = "" }) => {
  const { needsHelpWith } = useOnboarding()
  
  if (!needsHelpWith(feature)) return null
  
  return (
    <ContextualHelp feature={feature} trigger="hover" position="top">
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className={`w-6 h-6 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white text-xs cursor-help ${className}`}
      >
        ?
      </motion.div>
    </ContextualHelp>
  )
}

/**
 * Quick Help Button - Toggleable help panel
 */
export const QuickHelpButton = () => {
  const [showPanel, setShowPanel] = useState(false)
  const { startTutorial, getOnboardingStats } = useOnboarding()
  const stats = getOnboardingStats()

  const quickTips = [
    {
      icon: '💊',
      title: 'Add Medications',
      description: 'Start by adding your medications with precise timing',
      action: () => console.log('Navigate to add medication')
    },
    {
      icon: '🔔',
      title: 'Enable Notifications',
      description: 'Turn on browser notifications for timely reminders',
      action: () => console.log('Enable notifications')
    },
    {
      icon: '📊',
      title: 'Track Progress',
      description: 'View your adherence analytics and trends',
      action: () => console.log('Navigate to analytics')
    },
    {
      icon: '👥',
      title: 'Add Caregivers',
      description: 'Invite family members to help monitor your health',
      action: () => console.log('Navigate to caregiver')
    }
  ]

  return (
    <>
      <button
        onClick={() => setShowPanel(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full shadow-lg flex items-center justify-center text-white text-xl hover:shadow-xl transition-all duration-200 z-40"
        title="Get Help"
      >
        💡
      </button>

      <AnimatePresence>
        {showPanel && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
              onClick={() => setShowPanel(false)}
            />

            {/* Help Panel */}
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="fixed right-6 bottom-6 top-6 w-96 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-teal-500 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">Quick Help</h3>
                    <p className="text-sm opacity-90">Get started with PillPulse</p>
                  </div>
                  <button
                    onClick={() => setShowPanel(false)}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Tutorial Option */}
                {!stats.hasCompletedTutorial && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">🎯 Interactive Tutorial</h4>
                    <p className="text-blue-700 text-sm mb-3">
                      Take a guided tour to learn all PillPulse features
                    </p>
                    <button
                      onClick={() => {
                        setShowPanel(false)
                        startTutorial()
                      }}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors"
                    >
                      Start Tutorial
                    </button>
                  </div>
                )}

                {/* Quick Tips */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-4">Quick Tips</h4>
                  <div className="space-y-3">
                    {quickTips.map((tip, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={tip.action}
                      >
                        <span className="text-2xl">{tip.icon}</span>
                        <div>
                          <h5 className="font-medium text-gray-800 text-sm">{tip.title}</h5>
                          <p className="text-gray-600 text-xs">{tip.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progress */}
                {stats.progress > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <h4 className="font-semibold text-green-800 mb-2">Your Progress</h4>
                    <div className="w-full bg-green-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${stats.progress}%` }}
                      />
                    </div>
                    <p className="text-green-700 text-sm">
                      {stats.completedSteps} of 8 tutorial steps completed
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default ContextualHelp