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
    // Only riders allowed in this collection
    body('role')
      .optional()
      .equals('rider').withMessage('Only rider registrations are allowed')
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
 * @route   POST /api/auth/register-driver
 * @desc    Register driver (auth + profile)
 * @access  Public
 */
router.post(
  '/register-driver',
  sanitizeInput,
  [
    body('name').trim().notEmpty(),
    body('email').trim().notEmpty().isEmail().normalizeEmail(),
    body('phone').trim().notEmpty().matches(/^[0-9]{10}$/),
    body('password').notEmpty().isLength({ min: 6 }),
    body('vehicleType').notEmpty().isIn(['bike', 'mini', 'sedan', 'suv']),
    body('vehicleNumber').notEmpty(),
    body('vehicleModel').notEmpty(),
    body('licenseNumber').notEmpty(),
    body('licenseExpiry').notEmpty().isISO8601()
  ],
  validate,
  authController.registerDriver
);

/**
 * @route   POST /api/auth/login-driver
 * @desc    Login driver
 * @access  Public
 */
router.post(
  '/login-driver',
  sanitizeInput,
  [
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('phone').optional().matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  authController.loginDriver
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
    body('phone')
      .optional()
      .trim()
      .matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits')
      ,
    body('email')
      .optional()
      .trim()
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail()
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
 * @desc    Delete current account
 * @access  Private
 */
router.delete('/account', authenticate, authController.deleteAccount);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Reset password using username and email
 * @access  Public
 */
router.post(
  '/forgot-password',
  sanitizeInput,
  [
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 2, max: 100 }).withMessage('Username must be 2-100 characters'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('newPassword')
      .notEmpty().withMessage('New password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmPassword')
      .custom((value, { req }) => value === req.body.newPassword)
      .withMessage('Passwords do not match')
  ],
  validate,
  authController.forgotPassword
);

module.exports = router;
