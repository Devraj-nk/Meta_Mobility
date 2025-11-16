const jwt = require('jsonwebtoken');

/**
 * Generate JWT token for user authentication
 * Implements CAB-SR-003: JWT tokens for session management
 * @param {string} userId - User ID
 * @param {string} role - User role (rider/driver/admin)
 * @returns {string} JWT token
 */
function generateToken(userId, role) {
  const payload = {
    id: userId,
    role: role,
    iat: Date.now()
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {object} Decoded token payload
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Generate OTP (One-Time Password)
 * @param {number} length - Length of OTP (default 4)
 * @returns {string} OTP
 */
function generateOTP(length = 4) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

/**
 * Generate unique ride/payment ID
 * @param {string} prefix - Prefix for ID (e.g., 'RIDE', 'PAY')
 * @returns {string} Unique ID
 */
function generateUniqueId(prefix = 'ID') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Format coordinates for storage
 * @param {number} longitude
 * @param {number} latitude
 * @returns {object} Formatted location object
 */
function formatLocation(longitude, latitude, address = '') {
  return {
    type: 'Point',
    coordinates: [parseFloat(longitude), parseFloat(latitude)],
    address: address
  };
}

/**
 * Validate coordinates
 * @param {number} longitude
 * @param {number} latitude
 * @returns {boolean} Whether coordinates are valid
 */
function validateCoordinates(longitude, latitude) {
  return (
    typeof longitude === 'number' &&
    typeof latitude === 'number' &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

/**
 * Format error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {object} errors - Additional error details
 * @returns {object} Formatted error object
 */
function formatError(message, statusCode = 500, errors = null) {
  return {
    success: false,
    message,
    statusCode,
    errors,
    timestamp: new Date().toISOString()
  };
}

/**
 * Format success response
 * @param {string} message - Success message
 * @param {object} data - Response data
 * @returns {object} Formatted success object
 */
function formatSuccess(message, data = null) {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * Calculate ETA (Estimated Time of Arrival)
 * @param {number} distance - Distance in kilometers
 * @param {number} averageSpeed - Average speed in km/h (default 30)
 * @returns {number} ETA in minutes
 */
function calculateETA(distance, averageSpeed = 30) {
  const timeInHours = distance / averageSpeed;
  return Math.ceil(timeInHours * 60);
}

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input
 * @returns {string} Sanitized input
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim();
}

/**
 * Parse pagination parameters
 * @param {object} query - Request query object
 * @returns {object} Pagination parameters
 */
function parsePagination(query) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip
  };
}

module.exports = {
  generateToken,
  verifyToken,
  generateOTP,
  generateUniqueId,
  formatLocation,
  validateCoordinates,
  formatError,
  formatSuccess,
  calculateETA,
  sanitizeInput,
  parsePagination
};
