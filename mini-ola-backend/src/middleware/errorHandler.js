const { formatError } = require('../utils/helpers');

/**
 * Global Error Handler Middleware
 * Centralized error handling for the application
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    return res.status(400).json(
      formatError('Validation error', 400, errors)
    );
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json(
      formatError(`${field} already exists`, 400)
    );
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json(
      formatError('Invalid ID format', 400)
    );
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(
      formatError('Invalid token', 401)
    );
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(
      formatError('Token expired', 401)
    );
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json(
    formatError(message, statusCode)
  );
};

/**
 * 404 Not Found Handler
 */
const notFound = (req, res, next) => {
  res.status(404).json(
    formatError(`Route not found: ${req.originalUrl}`, 404)
  );
};

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler
};
