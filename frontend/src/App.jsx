import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ScheduleProvider } from './context/ScheduleContext'
import { OnboardingProvider } from './context/OnboardingContext'
import ErrorBoundary from './components/ErrorBoundary'
import AppContent from './components/AppContent'

/**
 * Main App component for PillPulse application
 * Sets up routing, context providers, and overall application structure
 * Provides authentication, schedule management, and onboarding state throughout the app
 */
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ScheduleProvider>
          <OnboardingProvider>
            <Router>
              <AppContent />
            </Router>
          </OnboardingProvider>
        </ScheduleProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App