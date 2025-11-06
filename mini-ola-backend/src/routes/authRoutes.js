const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate, sanitizeInput } = require('../middleware/validator');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post(
  '/register',
  sanitizeInput,
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('phone')
      .trim()
      .notEmpty().withMessage('Phone is required')
      .matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits'),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role')
      .optional()
      .isIn(['rider', 'driver', 'admin']).withMessage('Invalid role'),
    // Driver-specific validations
    body('vehicleType')
      .if(body('role').equals('driver'))
      .notEmpty().withMessage('Vehicle type is required for drivers')
      .isIn(['bike', 'mini', 'sedan', 'suv']).withMessage('Invalid vehicle type'),
    body('vehicleNumber')
      .if(body('role').equals('driver'))
      .notEmpty().withMessage('Vehicle number is required for drivers'),
    body('vehicleModel')
      .if(body('role').equals('driver'))
      .notEmpty().withMessage('Vehicle model is required for drivers'),
    body('licenseNumber')
      .if(body('role').equals('driver'))
      .notEmpty().withMessage('License number is required for drivers'),
    body('licenseExpiry')
      .if(body('role').equals('driver'))
      .notEmpty().withMessage('License expiry is required for drivers')
      .isISO8601().withMessage('Invalid date format')
  ],
  validate,
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  sanitizeInput,
  [
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('phone').optional().matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  authController.login
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  authenticate,
  sanitizeInput,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('email')
      .optional()
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('phone')
      .optional()
      .trim()
      .matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits')
  ],
  validate,
  authController.updateProfile
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .notEmpty().withMessage('New password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  validate,
  authController.changePassword
);

/**
 * @route   DELETE /api/auth/account
 * @desc    Delete current user account (soft-delete)
 * @access  Private
 */
router.delete('/account', authenticate, authController.deleteAccount);

module.exports = router;
