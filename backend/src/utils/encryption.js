import crypto from 'crypto'

/**
 * Encryption Utilities
 * Provides secure encryption and decryption for sensitive data like API keys
 * Uses AES-256-GCM for authenticated encryption with random initialization vectors
 */

// Encryption configuration
const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 12 // 96 bits for GCM
const TAG_LENGTH = 16 // 128 bits authentication tag

/**
 * Get or generate encryption key
 * Uses environment variable or falls back to a derived key for development
 * In production, this should be a securely generated and stored key
 * @returns {Buffer} 32-byte encryption key
 */
function getEncryptionKey() {
  // Try to get key from environment variable
  const envKey = process.env.ENCRYPTION_KEY
  
  if (envKey) {
    // If key is provided as hex string, convert to buffer
    if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
      return Buffer.from(envKey, 'hex')
    }
    
    // If key is provided as base64, convert to buffer
    if (envKey.length === 44 && /^[A-Za-z0-9+/=]+$/.test(envKey)) {
      return Buffer.from(envKey, 'base64')
    }
    
    // Otherwise, hash the key to get consistent 32 bytes
    return crypto.createHash('sha256').update(envKey).digest()
  }
  
  // Development fallback - derive key from app secret
  const appSecret = process.env.JWT_SECRET || 'pillpulse-dev-secret'
  const derivedKey = crypto.createHash('sha256').update(appSecret + '-encryption').digest()
  
  // Log warning in development
  if (process.env.NODE_ENV !== 'production') {
    console.warn('⚠️ Using derived encryption key. Set ENCRYPTION_KEY environment variable for production.')
  }
  
  return derivedKey
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * Returns base64-encoded string containing IV, encrypted data, and authentication tag
 * @param {string} plaintext - Data to encrypt
 * @returns {string} Base64-encoded encrypted data
 * @throws {Error} If encryption fails
 */
export function encryptApiKey(plaintext) {
  try {
    if (!plaintext || typeof plaintext !== 'string') {
      throw new Error('Invalid plaintext provided for encryption')
    }
    
    // Generate random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH)
    
    // Get encryption key
    const key = getEncryptionKey()
    
    // Create cipher
    const cipher = crypto.createCipherGCM(ALGORITHM, key, iv)
    cipher.setAAD(Buffer.from('pillpulse-api-key', 'utf8')) // Additional authenticated data
    
    // Encrypt the data
    let encrypted = cipher.update(plaintext, 'utf8')
    cipher.final()
    
    // Get authentication tag
    const tag = cipher.getAuthTag()
    
    // Combine IV, encrypted data, and tag
    const combined = Buffer.concat([iv, encrypted, tag])
    
    // Return as base64 string
    return combined.toString('base64')
    
  } catch (error) {
    console.error('❌ Encryption error:', error.message)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt data encrypted with encryptApiKey
 * @param {string} encryptedData - Base64-encoded encrypted data
 * @returns {string} Decrypted plaintext
 * @throws {Error} If decryption fails or data is tampered with
 */
export function decryptApiKey(encryptedData) {
  try {
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Invalid encrypted data provided for decryption')
    }
    
    // Decode from base64
    const combined = Buffer.from(encryptedData, 'base64')
    
    // Validate minimum length
    const minLength = IV_LENGTH + TAG_LENGTH + 1 // IV + tag + at least 1 byte of data
    if (combined.length < minLength) {
      throw new Error('Invalid encrypted data format')
    }
    
    // Extract components
    const iv = combined.subarray(0, IV_LENGTH)
    const tag = combined.subarray(combined.length - TAG_LENGTH)
    const encrypted = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH)
    
    // Get decryption key
    const key = getEncryptionKey()
    
    // Create decipher
    const decipher = crypto.createDecipherGCM(ALGORITHM, key, iv)
    decipher.setAAD(Buffer.from('pillpulse-api-key', 'utf8')) // Same AAD as encryption
    decipher.setAuthTag(tag)
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, null, 'utf8')
    decipher.final()
    
    return decrypted
    
  } catch (error) {
    console.error('❌ Decryption error:', error.message)
    
    // Provide different error messages for different failure types
    if (error.code === 'OSSL_EVP_BAD_DECRYPT') {
      throw new Error('Invalid encrypted data or wrong encryption key')
    } else if (error.message.includes('Unsupported state')) {
      throw new Error('Data may have been tampered with')
    } else {
      throw new Error('Failed to decrypt data')
    }
  }
}

/**
 * Generate a secure random encryption key
 * Useful for generating keys for production environments
 * @param {string} format - Output format: 'hex', 'base64', or 'buffer'
 * @returns {string|Buffer} Generated key in specified format
 */
export function generateEncryptionKey(format = 'hex') {
  const key = crypto.randomBytes(KEY_LENGTH)
  
  switch (format.toLowerCase()) {
    case 'hex':
      return key.toString('hex')
    case 'base64':
      return key.toString('base64')
    case 'buffer':
      return key
    default:
      throw new Error('Invalid format. Use "hex", "base64", or "buffer"')
  }
}

/**
 * Hash sensitive data for storage (one-way)
 * Useful for storing data that needs to be verified but not retrieved
 * @param {string} data - Data to hash
 * @param {string} salt - Optional salt (generated if not provided)
 * @returns {Object} Object containing hash and salt
 */
export function hashSensitiveData(data, salt = null) {
  try {
    if (!data || typeof data !== 'string') {
      throw new Error('Invalid data provided for hashing')
    }
    
    // Generate salt if not provided
    if (!salt) {
      salt = crypto.randomBytes(16).toString('hex')
    }
    
    // Create hash
    const hash = crypto.createHash('sha256')
    hash.update(data + salt)
    const hashedData = hash.digest('hex')
    
    return {
      hash: hashedData,
      salt: salt
    }
    
  } catch (error) {
    console.error('❌ Hashing error:', error.message)
    throw new Error('Failed to hash data')
  }
}

/**
 * Verify hashed data
 * @param {string} data - Original data to verify
 * @param {string} hash - Stored hash
 * @param {string} salt - Salt used for hashing
 * @returns {boolean} True if data matches hash
 */
export function verifyHashedData(data, hash, salt) {
  try {
    const { hash: newHash } = hashSensitiveData(data, salt)
    return newHash === hash
  } catch (error) {
    console.error('❌ Hash verification error:', error.message)
    return false
  }
}

/**
 * Securely compare two strings to prevent timing attacks
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} True if strings are equal
 */
export function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false
  }
  
  if (a.length !== b.length) {
    return false
  }
  
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  
  return result === 0
}

/**
 * Generate secure random token
 * Useful for generating session tokens, reset tokens, etc.
 * @param {number} length - Token length in bytes
 * @param {string} format - Output format: 'hex', 'base64', or 'url-safe'
 * @returns {string} Generated token
 */
export function generateSecureToken(length = 32, format = 'hex') {
  const token = crypto.randomBytes(length)
  
  switch (format.toLowerCase()) {
    case 'hex':
      return token.toString('hex')
    case 'base64':
      return token.toString('base64')
    case 'url-safe':
      return token.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
    default:
      throw new Error('Invalid format. Use "hex", "base64", or "url-safe"')
  }
}

/**
 * Encrypt data with password-based encryption
 * Uses PBKDF2 to derive key from password
 * @param {string} plaintext - Data to encrypt
 * @param {string} password - Password for encryption
 * @param {number} iterations - PBKDF2 iterations (default: 100000)
 * @returns {string} Base64-encoded encrypted data
 */
export function encryptWithPassword(plaintext, password, iterations = 100000) {
  try {
    // Generate random salt and IV
    const salt = crypto.randomBytes(16)
    const iv = crypto.randomBytes(IV_LENGTH)
    
    // Derive key from password
    const key = crypto.pbkdf2Sync(password, salt, iterations, KEY_LENGTH, 'sha256')
    
    // Encrypt data
    const cipher = crypto.createCipherGCM(ALGORITHM, key, iv)
    let encrypted = cipher.update(plaintext, 'utf8')
    cipher.final()
    
    const tag = cipher.getAuthTag()
    
    // Combine salt, iterations, IV, encrypted data, and tag
    const combined = Buffer.concat([
      Buffer.from([iterations >> 24, iterations >> 16, iterations >> 8, iterations]),
      salt,
      iv,
      encrypted,
      tag
    ])
    
    return combined.toString('base64')
    
  } catch (error) {
    console.error('❌ Password encryption error:', error.message)
    throw new Error('Failed to encrypt with password')
  }
}

/**
 * Decrypt data encrypted with encryptWithPassword
 * @param {string} encryptedData - Base64-encoded encrypted data
 * @param {string} password - Password for decryption
 * @returns {string} Decrypted plaintext
 */
export function decryptWithPassword(encryptedData, password) {
  try {
    const combined = Buffer.from(encryptedData, 'base64')
    
    // Extract components
    const iterations = (combined[0] << 24) | (combined[1] << 16) | (combined[2] << 8) | combined[3]
    const salt = combined.subarray(4, 20)
    const iv = combined.subarray(20, 20 + IV_LENGTH)
    const tag = combined.subarray(combined.length - TAG_LENGTH)
    const encrypted = combined.subarray(20 + IV_LENGTH, combined.length - TAG_LENGTH)
    
    // Derive key from password
    const key = crypto.pbkdf2Sync(password, salt, iterations, KEY_LENGTH, 'sha256')
    
    // Decrypt data
    const decipher = crypto.createDecipherGCM(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    
    let decrypted = decipher.update(encrypted, null, 'utf8')
    decipher.final()
    
    return decrypted
    
  } catch (error) {
    console.error('❌ Password decryption error:', error.message)
    throw new Error('Failed to decrypt with password')
  }
}