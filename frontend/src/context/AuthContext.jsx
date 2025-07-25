import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

/**
 * Authentication Context for PillPulse application
 * Manages user authentication state, login/logout functionality, and JWT token handling
 * Provides authentication status and user data throughout the application
 */

const AuthContext = createContext()

/**
 * Custom hook to access authentication context
 * Throws error if used outside of AuthProvider
 * @returns {Object} Authentication context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * Authentication Provider Component
 * Wraps the application and provides authentication state management
 * Handles token storage, user session persistence, and API authentication
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('pillpulse_token'))

  /**
   * Set up axios configuration and interceptor for automatic token inclusion in requests
   * Adds Authorization header to all API requests when token exists
   */
  useEffect(() => {
    // Set base URL for API calls
    axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [token])

  /**
   * Verify token validity and load user data on app initialization
   * Attempts to fetch user profile using stored token
   * Also handles impersonation tokens from URL parameters
   */
  useEffect(() => {
    const verifyToken = async () => {
      // Check for impersonation token in URL first
      const urlParams = new URLSearchParams(window.location.search)
      const impersonationToken = urlParams.get('token')
      const isImpersonation = urlParams.get('impersonation') === 'true'
      
      if (impersonationToken && isImpersonation) {
        // Set impersonation token and clear URL
        localStorage.setItem('pillpulse_token', impersonationToken)
        setToken(impersonationToken)
        window.history.replaceState({}, document.title, window.location.pathname)
        return // Let the token effect handle the rest
      }
      
      if (token) {
        try {
          // Manually set the Authorization header for this request
          const response = await axios.get('/api/users/profile', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          setUser(response.data.data)
          console.log('✅ Token verified successfully, user:', response.data.data.email)
        } catch (error) {
          // Token is invalid, clear it
          console.error('❌ Token verification failed:', error.response?.status, error.message)
          logout()
        }
      } else {
        console.log('ℹ️ No token found in localStorage')
      }
      setLoading(false)
    }

    // Add a small delay to ensure axios interceptors are set properly
    const timeoutId = setTimeout(verifyToken, 100)
    return () => clearTimeout(timeoutId)
  }, [token])

  /**
   * Login function - authenticates user and stores token
   * @param {string} email - User email address
   * @param {string} password - User password
   * @returns {Promise<Object>} Login response with user data
   * @throws {Error} When login fails
   */
  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/users/login', {
        email,
        password
      })
      
      const { token: newToken, user: userData } = response.data.data
      
      // Store token and update state
      localStorage.setItem('pillpulse_token', newToken)
      console.log('✅ Login successful, token stored:', newToken.substring(0, 20) + '...')
      console.log('✅ User data:', userData)
      
      setToken(newToken)
      setUser(userData)
      
      return response.data
    } catch (error) {
      console.error('❌ Login failed:', error.response?.data || error.message)
      throw new Error(error.response?.data?.error || 'Login failed')
    }
  }

  /**
   * Register function - creates new user account
   * @param {string} email - User email address
   * @param {string} password - User password
   * @returns {Promise<Object>} Registration response
   * @throws {Error} When registration fails
   */
  const register = async (email, password) => {
    try {
      const response = await axios.post('/api/users/register', {
        email,
        password
      })
      
      const { token: newToken, user: userData } = response.data.data
      
      // Store token and update state
      localStorage.setItem('pillpulse_token', newToken)
      setToken(newToken)
      setUser(userData)
      
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Registration failed')
    }
  }

  /**
   * Logout function - clears user session and token
   * Removes token from localStorage and resets user state
   */
  const logout = () => {
    localStorage.removeItem('pillpulse_token')
    setToken(null)
    setUser(null)
    delete axios.defaults.headers.common['Authorization']
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} True if user is logged in
   */
  const isAuthenticated = () => {
    return !!user && !!token
  }

  /**
   * Check if user has admin role
   * @returns {boolean} True if user is admin
   */
  const isAdmin = () => {
    return user?.role === 'admin'
  }

  // Context value object containing all authentication state and methods
  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated,
    isAdmin
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}