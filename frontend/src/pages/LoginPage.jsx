import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { validateLoginForm, validateRegistrationForm } from '../utils/validation'

/**
 * Login Page Component
 * Handles user authentication with login and registration functionality
 * Features responsive design with form validation and error handling
 */
const LoginPage = () => {
  const navigate = useNavigate()
  const { login, register } = useAuth()
  
  // Component state for form handling
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formErrors, setFormErrors] = useState({})

  /**
   * Handle input changes in authentication forms
   * @param {Event} e - Input change event
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear field-specific error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
    
    // Clear general error when user starts typing
    if (error) setError('')
  }

  /**
   * Handle form submission for login or registration
   * @param {Event} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setFormErrors({})

    try {
      // Validate form based on mode
      const validation = isLogin 
        ? validateLoginForm(formData)
        : validateRegistrationForm(formData)
      
      if (!validation.isValid) {
        setFormErrors(validation.errors)
        setError(validation.firstError)
        return
      }

      if (isLogin) {
        // Handle login
        await login(formData.email, formData.password)
        navigate('/dashboard')
      } else {
        // Handle registration
        await register(formData.email, formData.password)
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Toggle between login and registration forms
   */
  const toggleMode = () => {
    setIsLogin(!isLogin)
    setError('')
    setFormErrors({})
    setFormData({
      email: '',
      password: '',
      confirmPassword: ''
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-teal-50 px-4 py-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-teal-50/20 pointer-events-none">
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl"></div>
      </div>
      
      <motion.div
        className="relative max-w-md w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8"
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <motion.div
            className="relative w-20 h-20 mx-auto mb-6"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-teal-500 rounded-2xl shadow-lg"></div>
            <div className="relative w-full h-full bg-gradient-to-br from-blue-600 to-teal-600 rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-3xl">💊</span>
            </div>
          </motion.div>
          <motion.h1 
            className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            PillPulse
          </motion.h1>
          <motion.p 
            className="text-gray-600 text-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {isLogin ? 'Welcome back!' : 'Join PillPulse today'}
          </motion.p>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            className="bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-xl p-4 mb-6"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </motion.div>
        )}

        {/* Authentication Form */}
        <motion.form 
          onSubmit={handleSubmit} 
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {/* Email Input */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 bg-white/50 border-2 rounded-xl transition-all duration-200 placeholder-gray-400 focus:outline-none focus:bg-white ${
                  formErrors.email 
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                    : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                }`}
                placeholder="your@email.com"
                required
                disabled={loading}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-gray-400">📧</span>
              </div>
            </div>
            {formErrors.email && (
              <motion.p 
                className="text-sm text-red-600 font-medium"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {formErrors.email}
              </motion.p>
            )}
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 bg-white/50 border-2 rounded-xl transition-all duration-200 placeholder-gray-400 focus:outline-none focus:bg-white ${
                  formErrors.password 
                    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                    : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                }`}
                placeholder="Enter your password"
                required
                disabled={loading}
                minLength={6}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-gray-400">🔒</span>
              </div>
            </div>
            {formErrors.password && (
              <motion.p 
                className="text-sm text-red-600 font-medium"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {formErrors.password}
              </motion.p>
            )}
          </div>

          {/* Confirm Password Input - Only for Registration */}
          {!isLogin && (
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4 }}
            >
              <label className="block text-sm font-semibold text-gray-700">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-white/50 border-2 rounded-xl transition-all duration-200 placeholder-gray-400 focus:outline-none focus:bg-white ${
                    formErrors.confirmPassword 
                      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                      : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                  placeholder="Confirm your password"
                  required
                  disabled={loading}
                  minLength={6}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-400">🔐</span>
                </div>
              </div>
              {formErrors.confirmPassword && (
                <motion.p 
                  className="text-sm text-red-600 font-medium"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {formErrors.confirmPassword}
                </motion.p>
              )}
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            className={`w-full py-4 text-base font-semibold rounded-xl transition-all duration-200 ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 shadow-lg hover:shadow-xl'
            } text-white`}
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                {isLogin ? 'Signing In...' : 'Creating Account...'}
              </div>
            ) : (
              <span className="flex items-center justify-center">
                {isLogin ? '🚀 Sign In' : '✨ Create Account'}
              </span>
            )}
          </motion.button>
        </motion.form>

        {/* Toggle Between Login and Registration */}
        <motion.div 
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <p className="text-gray-600 text-sm font-medium">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
          </p>
          <motion.button
            onClick={toggleMode}
            className="text-transparent bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text hover:from-blue-700 hover:to-teal-700 font-semibold text-sm mt-2 transition-all duration-200"
            disabled={loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isLogin ? '✨ Create Account' : '🚀 Sign In Instead'}
          </motion.button>
        </motion.div>

        {/* App Description */}
        <motion.div 
          className="mt-8 pt-6 border-t border-gray-200/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
        >
          <p className="text-gray-500 text-xs text-center leading-relaxed">
            🏥 PillPulse helps you track medication adherence and improve your health outcomes.<br />
            🔒 Secure, private, and designed with your healthcare needs in mind.
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default LoginPage