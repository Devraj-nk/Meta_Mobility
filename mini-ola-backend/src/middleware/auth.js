const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { formatError } = require('../utils/helpers');

/**
 * Authentication Middleware
 * Implements CAB-SR-003: Enforce JWT tokens for session management
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json(
        formatError('Access denied. No token provided.', 401)
      );
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json(
        formatError('Invalid token or user not found.', 401)
      );
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;
    req.userRole = user.role;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(
        formatError('Invalid token.', 401)
      );
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(
        formatError('Token expired.', 401)
      );
    }
    return res.status(500).json(
      formatError('Authentication failed.', 500, error.message)
    );
  }
};

/**
 * Authorization Middleware
 * Checks if user has required role
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(
        formatError('Authentication required.', 401)
      );
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json(
        formatError(`Access denied. Required role: ${roles.join(' or ')}`, 403)
      );
    }

    next();
  };
};

/**
 * Optional authentication
 * Attaches user if token is provided, but doesn't fail if not
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (user && user.isActive) {
        req.user = user;
        req.userId = user._id;
        req.userRole = user.role;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};
