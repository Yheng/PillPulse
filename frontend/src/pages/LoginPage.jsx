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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pillpulse-blue to-pillpulse-teal px-4">
      <motion.div
        className="max-w-md w-full bg-white rounded-lg shadow-xl p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <motion.div
            className="w-16 h-16 bg-pillpulse-blue rounded-full flex items-center justify-center mx-auto mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <span className="text-white font-bold text-2xl">P</span>
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-800">PillPulse</h1>
          <p className="text-gray-600 mt-2">
            {isLogin ? 'Welcome back!' : 'Create your account'}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-red-700 text-sm">{error}</p>
          </motion.div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`input-field ${formErrors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
            {formErrors.email && (
              <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
            )}
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`input-field ${formErrors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Enter your password"
              required
              disabled={loading}
              minLength={6}
            />
            {formErrors.password && (
              <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
            )}
          </div>

          {/* Confirm Password Input - Only for Registration */}
          {!isLogin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`input-field ${formErrors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Confirm your password"
                required
                disabled={loading}
                minLength={6}
              />
              {formErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{formErrors.confirmPassword}</p>
              )}
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            className="w-full btn-primary py-3 text-base font-semibold"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {isLogin ? 'Signing In...' : 'Creating Account...'}
              </div>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </motion.button>
        </form>

        {/* Toggle Between Login and Registration */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
          </p>
          <motion.button
            onClick={toggleMode}
            className="text-pillpulse-blue hover:text-blue-600 font-medium text-sm mt-1 transition-colors duration-200"
            disabled={loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isLogin ? 'Create Account' : 'Sign In'}
          </motion.button>
        </div>

        {/* App Description */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-gray-500 text-xs text-center leading-relaxed">
            PillPulse helps you track medication adherence and improve your health outcomes. 
            Secure, private, and designed with your healthcare needs in mind.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default LoginPage