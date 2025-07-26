import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import UserDashboard from '../pages/UserDashboard'
import AnalyticsPage from '../pages/AnalyticsPage'
import LoginPage from '../pages/LoginPage'
import SettingsPage from '../pages/SettingsPage'
import ScheduleManagement from '../pages/ScheduleManagement'
import AdminDashboard from '../pages/AdminDashboard'
import CaregiverDashboard from '../pages/CaregiverDashboard'
import Navbar from './Navbar'
import PrivateRoute from './PrivateRoute'
import { NotificationManager } from './NotificationModal'
import ServiceWorkerHandler from './ServiceWorkerHandler'
import NotificationSchedulerHandler from './NotificationSchedulerHandler'
import OnboardingTutorial from './OnboardingTutorial'
import { QuickHelpButton } from './ContextualHelp'
import { useOnboarding } from '../context/OnboardingContext'

/**
 * App Content Component
 * Contains the main application content with onboarding integration
 */
const AppContent = () => {
  const { showTutorial, completeTutorial, skipTutorial } = useOnboarding()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-teal-50/30 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-400/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-400/3 rounded-full blur-3xl"></div>
      </div>
      
      <Navbar />
      <main className="relative container mx-auto px-4 py-8 max-w-7xl">
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected user routes */}
          <Route path="/dashboard" element={<PrivateRoute><UserDashboard /></PrivateRoute>} />
          <Route path="/analytics" element={<PrivateRoute><AnalyticsPage /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
          <Route path="/schedule" element={<PrivateRoute><ScheduleManagement /></PrivateRoute>} />
          <Route path="/caregiver" element={<PrivateRoute><CaregiverDashboard /></PrivateRoute>} />
          
          {/* Admin route */}
          <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
          
          {/* Default redirect to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      
      {/* Global Notification Manager */}
      <NotificationManager />
      
      {/* Service Worker Handler */}
      <ServiceWorkerHandler />
      
      {/* Notification Scheduler Handler */}
      <NotificationSchedulerHandler />
      
      {/* Onboarding Tutorial */}
      {showTutorial && (
        <OnboardingTutorial
          onComplete={completeTutorial}
          onSkip={skipTutorial}
        />
      )}
      
      {/* Quick Help Button */}
      <QuickHelpButton />
    </div>
  )
}

export default AppContent