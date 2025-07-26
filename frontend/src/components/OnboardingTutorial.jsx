import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

/**
 * Interactive Onboarding Tutorial Component
 * Guides new users through PillPulse features with step-by-step tutorials
 * Includes animated walkthroughs, interactive elements, and progress tracking
 */
const OnboardingTutorial = ({ onComplete, onSkip }) => {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [completedSteps, setCompletedSteps] = useState(new Set())
  const [showWelcome, setShowWelcome] = useState(true)

  // Tutorial steps configuration
  const tutorialSteps = [
    {
      id: 'welcome',
      title: 'Welcome to PillPulse! 👋',
      description: 'Your personal medication adherence companion',
      content: `Hi ${user?.email?.split('@')[0] || 'there'}! We're excited to help you manage your medications effectively. This quick tutorial will show you how to get the most out of PillPulse.`,
      icon: '🎉',
      type: 'welcome',
      estimatedTime: '3 minutes'
    },
    {
      id: 'dashboard-overview',
      title: 'Your Dashboard 📊',
      description: 'Navigate your medication hub',
      content: 'Your dashboard is mission control for your medication management. Here you can see upcoming doses, track your adherence streak, and get AI-powered insights.',
      icon: '🏠',
      type: 'overview',
      highlights: [
        { element: '.coming-up-today', text: 'See medications due today' },
        { element: '.streak-counter', text: 'Track your adherence streak' },
        { element: '.quick-actions', text: 'Quick access to common tasks' },
        { element: '.ai-features', text: 'AI-powered coaching and insights' }
      ]
    },
    {
      id: 'add-medication',
      title: 'Add Your First Medication 💊',
      description: 'Set up your medication schedule',
      content: 'Let\'s add your first medication! You can set the name, dosage, timing, and frequency. PillPulse will send you reminders at the right time.',
      icon: '➕',
      type: 'interactive',
      action: 'add-medication',
      highlights: [
        { element: '.add-medication-btn', text: 'Click here to add a medication' }
      ]
    },
    {
      id: 'notifications',
      title: 'Smart Notifications 🔔',
      description: 'Never miss a dose again',
      content: 'PillPulse sends smart notifications at your scheduled times. You can mark medications as taken, snooze reminders, or skip doses directly from the notification.',
      icon: '🔔',
      type: 'demo',
      highlights: [
        { element: '.notification-demo', text: 'Try our demo notification!' }
      ]
    },
    {
      id: 'analytics',
      title: 'Track Your Progress 📈',
      description: 'Visualize your adherence journey',
      content: 'View detailed analytics about your medication adherence. See trends, identify patterns, and share reports with your healthcare provider.',
      icon: '📊',
      type: 'feature',
      highlights: [
        { element: '.nav-analytics', text: 'Access analytics from the navigation' }
      ]
    },
    {
      id: 'caregiver',
      title: 'Caregiver Support 👨‍⚕️',
      description: 'Share your progress with loved ones',
      content: 'Invite family members or caregivers to monitor your medication adherence. They can view your schedules and receive emergency alerts if needed.',
      icon: '👥',
      type: 'feature',
      highlights: [
        { element: '.nav-caregiver', text: 'Manage caregiver access here' }
      ]
    },
    {
      id: 'ai-coaching',
      title: 'AI-Powered Coaching 🤖',
      description: 'Get personalized guidance',
      content: 'Our AI coach provides personalized reminders, motivation, and insights based on your adherence patterns. The more you use PillPulse, the smarter it gets!',
      icon: '🎯',
      type: 'feature'
    },
    {
      id: 'complete',
      title: 'You\'re All Set! 🎊',
      description: 'Ready to master your medication routine',
      content: 'Congratulations! You\'re now ready to take control of your medication adherence. Remember, consistency is key to better health outcomes.',
      icon: '✅',
      type: 'completion',
      tips: [
        'Set up all your medications for comprehensive tracking',
        'Check your dashboard daily to stay on track',
        'Use the analytics to identify improvement areas',
        'Consider adding emergency contacts for safety'
      ]
    }
  ]

  const currentStepData = tutorialSteps[currentStep]

  useEffect(() => {
    // Add tutorial overlay styles to body
    if (isVisible) {
      document.body.style.overflow = 'hidden'
      document.body.classList.add('tutorial-active')
    } else {
      document.body.style.overflow = 'auto'
      document.body.classList.remove('tutorial-active')
    }

    return () => {
      document.body.style.overflow = 'auto'
      document.body.classList.remove('tutorial-active')
    }
  }, [isVisible])

  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, currentStepData.id]))
    
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkipStep = () => {
    handleNext()
  }

  const handleComplete = () => {
    setIsVisible(false)
    // Mark tutorial as completed in localStorage
    localStorage.setItem('pillpulse_tutorial_completed', 'true')
    localStorage.setItem('pillpulse_tutorial_completed_at', new Date().toISOString())
    onComplete?.()
  }

  const handleSkipTutorial = () => {
    setIsVisible(false)
    // Mark as skipped but not completed
    localStorage.setItem('pillpulse_tutorial_skipped', 'true')
    localStorage.setItem('pillpulse_tutorial_skipped_at', new Date().toISOString())
    onSkip?.()
  }

  const progressPercentage = ((currentStep + 1) / tutorialSteps.length) * 100

  if (!isVisible) return null

  return (
    <AnimatePresence>
      {/* Tutorial Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
      >
        {/* Tutorial Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 50 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Progress Bar */}
          <div className="h-2 bg-gray-200">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-teal-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white text-2xl">
                  {currentStepData.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {currentStepData.title}
                  </h2>
                  <p className="text-gray-600 text-sm">
                    {currentStepData.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  Step {currentStep + 1} of {tutorialSteps.length}
                </span>
                {currentStepData.estimatedTime && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    ⏱️ {currentStepData.estimatedTime}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 flex-1 overflow-y-auto">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Welcome Step */}
              {currentStepData.type === 'welcome' && (
                <div className="text-center space-y-6">
                  <div className="text-6xl mb-4">🎉</div>
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-gray-800">
                      Welcome to PillPulse!
                    </h3>
                    <p className="text-gray-600 text-lg leading-relaxed">
                      {currentStepData.content}
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">What you'll learn:</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>✓ How to add and manage medications</li>
                        <li>✓ Understanding smart notifications</li>
                        <li>✓ Tracking your adherence progress</li>
                        <li>✓ Setting up caregiver support</li>
                        <li>✓ Using AI-powered coaching</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Feature Steps */}
              {['overview', 'feature', 'demo'].includes(currentStepData.type) && (
                <div className="space-y-6">
                  <p className="text-gray-700 text-lg leading-relaxed">
                    {currentStepData.content}
                  </p>
                  
                  {currentStepData.highlights && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <h4 className="font-semibold text-yellow-800 mb-3">Key Features:</h4>
                      <div className="space-y-2">
                        {currentStepData.highlights.map((highlight, index) => (
                          <div key={index} className="flex items-center space-x-2 text-yellow-700">
                            <span className="text-yellow-500">👉</span>
                            <span className="text-sm">{highlight.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Demo Notification */}
                  {currentStepData.id === 'notifications' && (
                    <div className="notification-demo bg-gradient-to-r from-blue-500 to-teal-500 rounded-xl p-4 text-white">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                          <span className="text-xl">💊</span>
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold">Medication Reminder</h5>
                          <p className="text-sm opacity-90">Time to take your Vitamin D</p>
                        </div>
                        <div className="flex space-x-2">
                          <button className="bg-white bg-opacity-20 px-3 py-1 rounded-lg text-xs">
                            ✅ Taken
                          </button>
                          <button className="bg-white bg-opacity-20 px-3 py-1 rounded-lg text-xs">
                            ⏰ Snooze
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Interactive Step */}
              {currentStepData.type === 'interactive' && (
                <div className="space-y-6">
                  <p className="text-gray-700 text-lg leading-relaxed">
                    {currentStepData.content}
                  </p>
                  
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <h4 className="font-semibold text-green-800 mb-4">Try it now:</h4>
                    <div className="add-medication-btn bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all duration-200">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">➕</span>
                        <div>
                          <h5 className="font-semibold">Add Your First Medication</h5>
                          <p className="text-sm opacity-90">Click to open the medication form</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-green-600 mt-2">
                      💡 Don't worry - this is just a tutorial. You can add real medications after completing the tour.
                    </p>
                  </div>
                </div>
              )}

              {/* Completion Step */}
              {currentStepData.type === 'completion' && (
                <div className="text-center space-y-6">
                  <div className="text-6xl mb-4">🎊</div>
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-gray-800">
                      Congratulations!
                    </h3>
                    <p className="text-gray-600 text-lg leading-relaxed">
                      {currentStepData.content}
                    </p>
                    
                    {currentStepData.tips && (
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-left">
                        <h4 className="font-semibold text-purple-800 mb-3">💡 Pro Tips:</h4>
                        <ul className="space-y-2">
                          {currentStepData.tips.map((tip, index) => (
                            <li key={index} className="flex items-start space-x-2 text-purple-700">
                              <span className="text-purple-500 mt-0.5">•</span>
                              <span className="text-sm">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-blue-800 text-sm">
                        🎯 <strong>Your next steps:</strong> Add your medications, set up notifications, 
                        and start building healthy habits with PillPulse!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrevious}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    ← Previous
                  </button>
                )}
                <button
                  onClick={handleSkipTutorial}
                  className="text-gray-500 hover:text-gray-700 transition-colors text-sm"
                >
                  Skip Tutorial
                </button>
              </div>

              <div className="flex items-center space-x-3">
                {currentStep < tutorialSteps.length - 1 && (
                  <button
                    onClick={handleSkipStep}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Skip Step
                  </button>
                )}
                
                <button
                  onClick={handleNext}
                  className="bg-gradient-to-r from-blue-500 to-teal-500 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all duration-200 font-semibold"
                >
                  {currentStep === tutorialSteps.length - 1 ? 'Get Started!' : 'Next →'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default OnboardingTutorial