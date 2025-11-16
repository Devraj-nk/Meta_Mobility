const { validationResult } = require('express-validator');
const { formatError } = require('../utils/helpers');

/**
 * Validation Middleware
 * Implements CAB-SR-004: Secure input transmission & validation
 * Checks validation results from express-validator
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json(
      formatError('Validation failed', 400, formattedErrors)
    );
  }

  next();
};

/**
 * Sanitize input middleware
 * Removes potentially harmful characters from request body
 */
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }

  next();
};

module.exports = {
  validate,
  sanitizeInput
};
