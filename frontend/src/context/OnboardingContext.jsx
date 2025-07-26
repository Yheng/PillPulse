import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

/**
 * Onboarding Context for PillPulse application
 * Manages tutorial state, user progress, and onboarding experience
 * Tracks completion status and provides guided tour functionality
 */

const OnboardingContext = createContext()

/**
 * Custom hook to access onboarding context
 * @returns {Object} Onboarding context value
 */
export const useOnboarding = () => {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}

/**
 * Onboarding Provider Component
 * Manages onboarding state and tutorial progress
 */
export const OnboardingProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth()
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false)
  const [hasSkippedTutorial, setHasSkippedTutorial] = useState(false)
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false)
  const [onboardingData, setOnboardingData] = useState({
    completedSteps: [],
    skippedSteps: [],
    startedAt: null,
    completedAt: null,
    currentProgress: 0
  })

  // Check onboarding status on auth state change
  useEffect(() => {
    if (user && isAuthenticated()) {
      checkOnboardingStatus()
    }
  }, [user, isAuthenticated])

  /**
   * Check if user has completed or needs onboarding
   */
  const checkOnboardingStatus = () => {
    const tutorialCompleted = localStorage.getItem('pillpulse_tutorial_completed')
    const tutorialSkipped = localStorage.getItem('pillpulse_tutorial_skipped')
    const userFirstLogin = localStorage.getItem(`pillpulse_first_login_${user.id}`)
    
    setHasCompletedTutorial(tutorialCompleted === 'true')
    setHasSkippedTutorial(tutorialSkipped === 'true')
    
    // Check if this is the user's first time
    const isFirstTime = !userFirstLogin && !tutorialCompleted && !tutorialSkipped
    setIsFirstTimeUser(isFirstTime)
    
    // Show tutorial for first-time users
    if (isFirstTime) {
      // Mark that user has logged in
      localStorage.setItem(`pillpulse_first_login_${user.id}`, new Date().toISOString())
      setShowTutorial(true)
    }

    // Load existing onboarding data
    const savedData = localStorage.getItem(`pillpulse_onboarding_${user.id}`)
    if (savedData) {
      try {
        setOnboardingData(JSON.parse(savedData))
      } catch (error) {
        console.error('Error loading onboarding data:', error)
      }
    }
  }

  /**
   * Start the tutorial manually
   */
  const startTutorial = () => {
    setShowTutorial(true)
    setTutorialStep(0)
    updateOnboardingData({
      startedAt: new Date().toISOString(),
      currentProgress: 0
    })
  }

  /**
   * Complete the tutorial
   */
  const completeTutorial = () => {
    setShowTutorial(false)
    setHasCompletedTutorial(true)
    
    localStorage.setItem('pillpulse_tutorial_completed', 'true')
    localStorage.setItem('pillpulse_tutorial_completed_at', new Date().toISOString())
    
    updateOnboardingData({
      completedAt: new Date().toISOString(),
      currentProgress: 100
    })
  }

  /**
   * Skip the tutorial
   */
  const skipTutorial = () => {
    setShowTutorial(false)
    setHasSkippedTutorial(true)
    
    localStorage.setItem('pillpulse_tutorial_skipped', 'true')
    localStorage.setItem('pillpulse_tutorial_skipped_at', new Date().toISOString())
    
    updateOnboardingData({
      completedAt: new Date().toISOString(),
      currentProgress: 0
    })
  }

  /**
   * Update onboarding progress data
   */
  const updateOnboardingData = (updates) => {
    const newData = { ...onboardingData, ...updates }
    setOnboardingData(newData)
    
    if (user?.id) {
      localStorage.setItem(`pillpulse_onboarding_${user.id}`, JSON.stringify(newData))
    }
  }

  /**
   * Mark a tutorial step as completed
   */
  const completeStep = (stepId) => {
    const completedSteps = [...onboardingData.completedSteps, stepId]
    updateOnboardingData({
      completedSteps,
      currentProgress: (completedSteps.length / 8) * 100 // 8 total steps
    })
  }

  /**
   * Skip a tutorial step
   */
  const skipStep = (stepId) => {
    const skippedSteps = [...onboardingData.skippedSteps, stepId]
    updateOnboardingData({ skippedSteps })
  }

  /**
   * Reset onboarding status (for testing/admin purposes)
   */
  const resetOnboarding = () => {
    if (user?.id) {
      localStorage.removeItem('pillpulse_tutorial_completed')
      localStorage.removeItem('pillpulse_tutorial_skipped')
      localStorage.removeItem(`pillpulse_first_login_${user.id}`)
      localStorage.removeItem(`pillpulse_onboarding_${user.id}`)
    }
    
    setHasCompletedTutorial(false)
    setHasSkippedTutorial(false)
    setIsFirstTimeUser(true)
    setShowTutorial(false)
    setTutorialStep(0)
    setOnboardingData({
      completedSteps: [],
      skippedSteps: [],
      startedAt: null,
      completedAt: null,
      currentProgress: 0
    })
  }

  /**
   * Get onboarding statistics
   */
  const getOnboardingStats = () => {
    return {
      isFirstTimeUser,
      hasCompletedTutorial,
      hasSkippedTutorial,
      showTutorial,
      currentStep: tutorialStep,
      progress: onboardingData.currentProgress,
      completedSteps: onboardingData.completedSteps.length,
      skippedSteps: onboardingData.skippedSteps.length,
      startedAt: onboardingData.startedAt,
      completedAt: onboardingData.completedAt
    }
  }

  /**
   * Show feature spotlight for specific elements
   */
  const showFeatureSpotlight = (targetElement, message, position = 'bottom') => {
    // This could be expanded to show contextual help tooltips
    console.log(`Feature spotlight: ${message} for element:`, targetElement)
  }

  /**
   * Check if user needs help with a specific feature
   */
  const needsHelpWith = (feature) => {
    if (hasCompletedTutorial) return false
    
    const helpNeeded = {
      'add-medication': !onboardingData.completedSteps.includes('add-medication'),
      'notifications': !onboardingData.completedSteps.includes('notifications'),
      'analytics': !onboardingData.completedSteps.includes('analytics'),
      'caregiver': !onboardingData.completedSteps.includes('caregiver'),
      'ai-coaching': !onboardingData.completedSteps.includes('ai-coaching')
    }
    
    return helpNeeded[feature] || false
  }

  // Context value
  const value = {
    // State
    showTutorial,
    tutorialStep,
    hasCompletedTutorial,
    hasSkippedTutorial,
    isFirstTimeUser,
    onboardingData,

    // Actions
    startTutorial,
    completeTutorial,
    skipTutorial,
    completeStep,
    skipStep,
    resetOnboarding,
    updateOnboardingData,
    setTutorialStep,

    // Utilities
    getOnboardingStats,
    showFeatureSpotlight,
    needsHelpWith
  }

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}