import { body, validationResult } from 'express-validator'

/**
 * Validation Middleware
 * Provides request validation utilities for API endpoints
 */

/**
 * Generic validation request handler
 * @param {Array} validators - Array of express-validator validation rules
 * @returns {Function} Middleware function
 */
export const validateRequest = (validators) => {
  return async (req, res, next) => {
    // Run all validators
    await Promise.all(validators.map(validator => validator.run(req)))
    
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      })
    }
    
    next()
  }
}

/**
 * Common validation rules
 */
export const validationRules = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  password: body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
    
  required: (field) => body(field)
    .notEmpty()
    .withMessage(`${field} is required`),
    
  optional: (field) => body(field).optional(),
  
  isInt: (field) => body(field)
    .isInt()
    .withMessage(`${field} must be an integer`),
    
  isIn: (field, values) => body(field)
    .isIn(values)
    .withMessage(`${field} must be one of: ${values.join(', ')}`)
}