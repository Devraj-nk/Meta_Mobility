const express = require('express');
const { body, query } = require('express-validator');
const rideController = require('../controllers/rideController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, sanitizeInput } = require('../middleware/validator');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/rides/estimate
 * @desc    Get fare estimate
 * @access  Private (Rider)
 */
router.post(
  '/estimate',
  sanitizeInput,
  [
    body('pickupLat').isFloat({ min: -90, max: 90 }).withMessage('Invalid pickup latitude'),
    body('pickupLng').isFloat({ min: -180, max: 180 }).withMessage('Invalid pickup longitude'),
    body('dropoffLat').isFloat({ min: -90, max: 90 }).withMessage('Invalid dropoff latitude'),
    body('dropoffLng').isFloat({ min: -180, max: 180 }).withMessage('Invalid dropoff longitude'),
    body('rideType').isIn(['bike', 'mini', 'sedan', 'suv']).withMessage('Invalid ride type'),
    body('isGroupRide').optional().isBoolean().withMessage('isGroupRide must be boolean')
  ],
  validate,
  rideController.getFareEstimate
);

/**
 * @route   POST /api/rides/request
 * @desc    Request a new ride
 * @access  Private (Rider)
 */
router.post(
  '/request',
  authorize('rider'),
  sanitizeInput,
  [
    body('pickupLat').isFloat({ min: -90, max: 90 }).withMessage('Invalid pickup latitude'),
    body('pickupLng').isFloat({ min: -180, max: 180 }).withMessage('Invalid pickup longitude'),
    body('pickupAddress').notEmpty().withMessage('Pickup address is required'),
    body('dropoffLat').isFloat({ min: -90, max: 90 }).withMessage('Invalid dropoff latitude'),
    body('dropoffLng').isFloat({ min: -180, max: 180 }).withMessage('Invalid dropoff longitude'),
    body('dropoffAddress').notEmpty().withMessage('Dropoff address is required'),
    body('rideType').isIn(['bike', 'mini', 'sedan', 'suv']).withMessage('Invalid ride type'),
    body('isGroupRide').optional().isBoolean().withMessage('isGroupRide must be boolean'),
    body('scheduledTime').optional().isISO8601().withMessage('Invalid scheduled time format')
  ],
  validate,
  rideController.requestRide
);

/**
 * @route   PUT /api/rides/:id/select-driver
 * @desc    Rider selects a specific driver for the ride
 * @access  Private (Rider)
 */
router.put(
  '/:id/select-driver',
  authorize('rider'),
  sanitizeInput,
  [
    body('driverId').notEmpty().isMongoId().withMessage('Valid driverId is required')
  ],
  validate,
  rideController.selectDriver
);

/**
 * @route   GET /api/rides/active
 * @desc    Get active ride
 * @access  Private (Rider)
 */
router.get('/active', authorize('rider'), rideController.getActiveRide);

/**
 * @route   GET /api/rides/history
 * @desc    Get ride history
 * @access  Private
 */
router.get(
  '/history',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('status').optional().isIn(['requested', 'accepted', 'in-progress', 'completed', 'cancelled'])
  ],
  validate,
  rideController.getRideHistory
);

/**
 * @route   GET /api/rides/:id
 * @desc    Get ride details
 * @access  Private
 */
router.get('/:id', rideController.getRideDetails);

/**
 * @route   PUT /api/rides/:id/cancel
 * @desc    Cancel a ride
 * @access  Private (Rider)
 */
router.put(
  '/:id/cancel',
  authorize('rider'),
  sanitizeInput,
  [
    body('reason').optional().isString().withMessage('Reason must be a string')
  ],
  validate,
  rideController.cancelRide
);

/**
 * @route   POST /api/rides/:id/rate
 * @desc    Rate a completed ride
 * @access  Private (Rider)
 */
router.post(
  '/:id/rate',
  authorize('rider'),
  sanitizeInput,
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('feedback').optional().isString().withMessage('Feedback must be a string')
  ],
  validate,
  rideController.rateRide
);

module.exports = router;
