/**
 * Validation Utilities for PillPulse Frontend
 * Provides form validation functions with user-friendly error messages
 */

/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @returns {Object} Validation result with isValid and error
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' }
  }
  
  const trimmedEmail = email.trim()
  
  if (trimmedEmail.length === 0) {
    return { isValid: false, error: 'Email is required' }
  }
  
  // Basic email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: 'Please enter a valid email address' }
  }
  
  if (trimmedEmail.length > 254) {
    return { isValid: false, error: 'Email address is too long' }
  }
  
  return { isValid: true, error: null }
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result with isValid and error
 */
export function validatePassword(password, options = {}) {
  const {
    minLength = 6,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = false
  } = options
  
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' }
  }
  
  if (password.length < minLength) {
    return { isValid: false, error: `Password must be at least ${minLength} characters long` }
  }
  
  if (requireUppercase && !/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' }
  }
  
  if (requireLowercase && !/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' }
  }
  
  if (requireNumbers && !/\d/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' }
  }
  
  if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one special character' }
  }
  
  return { isValid: true, error: null }
}

/**
 * Validate medication name
 * @param {string} medicationName - Medication name to validate
 * @returns {Object} Validation result with isValid and error
 */
export function validateMedicationName(medicationName) {
  if (!medicationName || typeof medicationName !== 'string') {
    return { isValid: false, error: 'Medication name is required' }
  }
  
  const trimmed = medicationName.trim()
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Medication name is required' }
  }
  
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Medication name must be at least 2 characters long' }
  }
  
  if (trimmed.length > 100) {
    return { isValid: false, error: 'Medication name must not exceed 100 characters' }
  }
  
  // Check for invalid characters (allow letters, numbers, spaces, hyphens, parentheses)
  if (!/^[a-zA-Z0-9\s\-()]+$/.test(trimmed)) {
    return { isValid: false, error: 'Medication name contains invalid characters' }
  }
  
  return { isValid: true, error: null }
}

/**
 * Validate medication dosage
 * @param {string} dosage - Dosage to validate
 * @returns {Object} Validation result with isValid and error
 */
export function validateDosage(dosage) {
  if (!dosage || typeof dosage !== 'string') {
    return { isValid: false, error: 'Dosage is required' }
  }
  
  const trimmed = dosage.trim()
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Dosage is required' }
  }
  
  if (trimmed.length > 50) {
    return { isValid: false, error: 'Dosage must not exceed 50 characters' }
  }
  
  // Allow common dosage formats: 100mg, 1 tablet, 5ml, etc.
  if (!/^[0-9]+(\.[0-9]+)?\s*(mg|g|ml|mcg|tablet|tablets|capsule|capsules|pill|pills|drop|drops|unit|units|iu|IU)?$/i.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid dosage (e.g., 100mg, 1 tablet, 5ml)' }
  }
  
  return { isValid: true, error: null }
}

/**
 * Validate time format (HH:MM)
 * @param {string} time - Time to validate
 * @returns {Object} Validation result with isValid and error
 */
export function validateTime(time) {
  if (!time || typeof time !== 'string') {
    return { isValid: false, error: 'Time is required' }
  }
  
  // Check HH:MM format
  if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
    return { isValid: false, error: 'Please enter time in HH:MM format (24-hour)' }
  }
  
  return { isValid: true, error: null }
}

/**
 * Validate medication frequency
 * @param {string} frequency - Frequency to validate
 * @returns {Object} Validation result with isValid and error
 */
export function validateFrequency(frequency) {
  const validFrequencies = ['daily', 'weekly', 'monthly']
  
  if (!frequency || typeof frequency !== 'string') {
    return { isValid: false, error: 'Frequency is required' }
  }
  
  if (!validFrequencies.includes(frequency.toLowerCase())) {
    return { isValid: false, error: 'Frequency must be daily, weekly, or monthly' }
  }
  
  return { isValid: true, error: null }
}

/**
 * Validate complete medication schedule form
 * @param {Object} formData - Form data to validate
 * @returns {Object} Validation result with isValid, errors, and firstError
 */
export function validateMedicationForm(formData) {
  const { medication_name, dosage, time, frequency } = formData
  const errors = {}
  
  // Validate each field
  const nameValidation = validateMedicationName(medication_name)
  if (!nameValidation.isValid) {
    errors.medication_name = nameValidation.error
  }
  
  const dosageValidation = validateDosage(dosage)
  if (!dosageValidation.isValid) {
    errors.dosage = dosageValidation.error
  }
  
  const timeValidation = validateTime(time)
  if (!timeValidation.isValid) {
    errors.time = timeValidation.error
  }
  
  const frequencyValidation = validateFrequency(frequency)
  if (!frequencyValidation.isValid) {
    errors.frequency = frequencyValidation.error
  }
  
  const isValid = Object.keys(errors).length === 0
  const firstError = isValid ? null : errors[Object.keys(errors)[0]]
  
  return {
    isValid,
    errors,
    firstError
  }
}

/**
 * Validate user registration form
 * @param {Object} formData - Registration form data
 * @returns {Object} Validation result
 */
export function validateRegistrationForm(formData) {
  const { email, password, confirmPassword } = formData
  const errors = {}
  
  // Validate email
  const emailValidation = validateEmail(email)
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error
  }
  
  // Validate password
  const passwordValidation = validatePassword(password)
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error
  }
  
  // Validate password confirmation
  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password'
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
  }
  
  const isValid = Object.keys(errors).length === 0
  const firstError = isValid ? null : errors[Object.keys(errors)[0]]
  
  return {
    isValid,
    errors,
    firstError
  }
}

/**
 * Validate login form
 * @param {Object} formData - Login form data
 * @returns {Object} Validation result
 */
export function validateLoginForm(formData) {
  const { email, password } = formData
  const errors = {}
  
  // Validate email
  const emailValidation = validateEmail(email)
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error
  }
  
  // Validate password (less strict for login)
  if (!password) {
    errors.password = 'Password is required'
  }
  
  const isValid = Object.keys(errors).length === 0
  const firstError = isValid ? null : errors[Object.keys(errors)[0]]
  
  return {
    isValid,
    errors,
    firstError
  }
}

/**
 * Sanitize text input
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
  if (!input || typeof input !== 'string') {
    return ''
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000) // Limit length
}

/**
 * Validate API key format
 * @param {string} apiKey - OpenAI API key to validate
 * @returns {Object} Validation result
 */
export function validateApiKey(apiKey) {
  if (!apiKey) {
    return { isValid: true, error: null } // Optional field
  }
  
  if (typeof apiKey !== 'string') {
    return { isValid: false, error: 'API key must be a string' }
  }
  
  const trimmed = apiKey.trim()
  
  if (trimmed.length === 0) {
    return { isValid: true, error: null } // Empty is ok
  }
  
  if (!trimmed.startsWith('sk-')) {
    return { isValid: false, error: 'OpenAI API key must start with "sk-"' }
  }
  
  if (trimmed.length < 20) {
    return { isValid: false, error: 'API key appears to be too short' }
  }
  
  return { isValid: true, error: null }
}