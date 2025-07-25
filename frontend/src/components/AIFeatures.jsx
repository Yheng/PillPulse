import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { aiService } from '../services/api'

/**
 * AI Status Indicator Component
 * Shows whether user has AI features enabled
 */
export const AIStatusIndicator = ({ className = "" }) => {
  const [aiStatus, setAiStatus] = useState({ ai_enabled: false, loading: true })

  useEffect(() => {
    const checkAIStatus = async () => {
      try {
        const response = await aiService.getStatus()
        setAiStatus({ ...response.data, loading: false })
      } catch (error) {
        console.error('Error checking AI status:', error)
        setAiStatus({ ai_enabled: false, loading: false })
      }
    }

    checkAIStatus()
  }, [])

  if (aiStatus.loading) {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        <div className="w-3 h-3 bg-gray-300 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-500">Checking AI status...</span>
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      <div className={`w-3 h-3 rounded-full ${aiStatus.ai_enabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
      <span className={`text-sm ${aiStatus.ai_enabled ? 'text-green-600' : 'text-gray-500'}`}>
        {aiStatus.ai_enabled ? '🤖 AI Enabled' : '🤖 AI Disabled'}
      </span>
    </div>
  )
}

/**
 * Smart Reminder Button Component
 * Generates AI-powered personalized reminders
 */
export const SmartReminderButton = ({ schedule, onReminderGenerated, className = "" }) => {
  const [loading, setLoading] = useState(false)
  const [reminder, setReminder] = useState('')

  const generateReminder = async () => {
    setLoading(true)
    try {
      const response = await aiService.generateReminder(schedule.id)
      const reminderText = response.data.reminder
      setReminder(reminderText)
      if (onReminderGenerated) {
        onReminderGenerated(reminderText)
      }
    } catch (error) {
      console.error('Error generating reminder:', error)
      setReminder('⏰ Time to take your ' + schedule.medication_name + '!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={className}>
      <motion.button
        onClick={generateReminder}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
        whileHover={{ scale: loading ? 1 : 1.02 }}
        whileTap={{ scale: loading ? 1 : 0.98 }}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Generating...</span>
          </>
        ) : (
          <>
            <span>🤖</span>
            <span>Smart Reminder</span>
          </>
        )}
      </motion.button>
      
      <AnimatePresence>
        {reminder && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <p className="text-blue-800 text-sm">{reminder}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * AI Insights Panel Component
 * Displays AI-powered medication insights
 */
export const AIInsightsPanel = ({ className = "" }) => {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadInsights = async () => {
      try {
        const response = await aiService.getInsights()
        setInsights(response.data)
      } catch (err) {
        setError('Failed to load AI insights')
        console.error('Error loading insights:', err)
      } finally {
        setLoading(false)
      }
    }

    loadInsights()
  }, [])

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <p>⚠️ {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">🤖 AI Insights</h3>
        {insights?.ai_powered && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
            AI-Powered
          </span>
        )}
      </div>

      {/* Performance Insights */}
      {insights?.insights && insights.insights.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">📊 Performance</h4>
          <ul className="space-y-2">
            {insights.insights.map((insight, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-sm text-gray-600 bg-blue-50 p-2 rounded-md"
              >
                {insight}
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {insights?.recommendations && insights.recommendations.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">💡 Recommendations</h4>
          <ul className="space-y-2">
            {insights.recommendations.map((rec, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-sm text-gray-600 bg-green-50 p-2 rounded-md"
              >
                {rec}
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* Patterns */}
      {insights?.patterns && insights.patterns.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">🔍 Patterns</h4>
          <ul className="space-y-2">
            {insights.patterns.map((pattern, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-sm text-gray-600 bg-purple-50 p-2 rounded-md"
              >
                {pattern}
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Daily AI Coach Component
 * Shows daily coaching message and summary
 */
export const DailyAICoach = ({ className = "" }) => {
  const [dailySummary, setDailySummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDailySummary = async () => {
      try {
        const response = await aiService.getDailySummary()
        setDailySummary(response.data)
      } catch (error) {
        console.error('Error loading daily summary:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDailySummary()
  }, [])

  if (loading) {
    return (
      <div className={`bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg shadow-md p-6 text-white ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-white/30 rounded w-1/3 mb-3"></div>
          <div className="h-3 bg-white/30 rounded mb-2"></div>
          <div className="h-3 bg-white/30 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (!dailySummary) {
    return (
      <div className={`bg-gradient-to-r from-gray-400 to-gray-500 rounded-lg shadow-md p-6 text-white text-center ${className}`}>
        <p>💊 Start logging medications to get daily AI coaching!</p>
      </div>
    )
  }

  const { summary, coaching_message, upcoming_medications } = dailySummary

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg shadow-md p-6 text-white ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">🤖 Daily AI Coach</h3>
        {dailySummary.ai_generated && (
          <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
            AI-Powered
          </span>
        )}
      </div>

      {/* Today's Summary */}
      <div className="mb-4">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <span>📊</span>
            <span>{summary.adherence_rate}% adherence</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>💊</span>
            <span>{summary.taken_doses}/{summary.total_doses} taken</span>
          </div>
          {summary.upcoming_doses > 0 && (
            <div className="flex items-center space-x-1">
              <span>⏰</span>
              <span>{summary.upcoming_doses} upcoming</span>
            </div>
          )}
        </div>
      </div>

      {/* AI Coaching Message */}
      <div className="mb-4 p-3 bg-white/10 rounded-lg">
        <p className="text-sm">{coaching_message}</p>
      </div>

      {/* Upcoming Medications */}
      {upcoming_medications && upcoming_medications.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">⏰ Coming Up Today:</h4>
          <div className="space-y-1">
            {upcoming_medications.slice(0, 2).map((med, index) => (
              <div key={index} className="text-xs bg-white/10 p-2 rounded">
                {med.medication} ({med.dosage}) at {med.time}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

/**
 * Medication Education Tooltip Component
 * Shows AI-generated educational content on hover
 */
export const MedicationEducationTooltip = ({ medicationName, children, type = "general" }) => {
  const [education, setEducation] = useState('')
  const [loading, setLoading] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  const loadEducation = async () => {
    if (education || loading) return
    
    setLoading(true)
    try {
      const response = await aiService.getEducation(medicationName, type)
      setEducation(response.data.content)
    } catch (error) {
      console.error('Error loading education:', error)
      setEducation(`Take your ${medicationName} as prescribed by your healthcare provider.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => {
          setShowTooltip(true)
          loadEducation()
        }}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {children}
      </div>
      
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-50 w-64 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg -top-2 left-full ml-2"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Loading info...</span>
              </div>
            ) : (
              <div>
                <div className="font-medium mb-1">💊 {medicationName}</div>
                <p>{education}</p>
                <div className="text-xs text-gray-300 mt-2">🤖 AI-generated info</div>
              </div>
            )}
            
            {/* Tooltip arrow */}
            <div className="absolute top-3 left-0 transform -translate-x-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default {
  AIStatusIndicator,
  SmartReminderButton,
  AIInsightsPanel,
  DailyAICoach,
  MedicationEducationTooltip
}