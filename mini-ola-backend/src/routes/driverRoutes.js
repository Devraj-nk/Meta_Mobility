const express = require('express');
const { body } = require('express-validator');
const driverController = require('../controllers/driverController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, sanitizeInput } = require('../middleware/validator');

const router = express.Router();

/**
 * @route   GET /api/drivers/debug/available
 * @desc    Debug endpoint to check available drivers (no auth required)
 * @access  Public
 */
router.get('/debug/available', driverController.debugAvailableDrivers);

/**
 * @route   POST /api/drivers/debug/reset/:driverId
 * @desc    Debug endpoint to reset driver status (no auth required)
 * @access  Public
 */
router.post('/debug/reset/:driverId', driverController.debugResetDriver);

// All routes below require driver authentication
router.use(authenticate);
router.use(authorize('driver'));

/**
 * @route   PUT /api/drivers/availability
 * @desc    Toggle driver availability (online/offline)
 * @access  Private (Driver)
 */
router.put(
  '/availability',
  sanitizeInput,
  [
    body('isAvailable').isBoolean().withMessage('isAvailable must be boolean'),
    body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('address').optional().isString()
  ],
  validate,
  driverController.toggleAvailability
);

/**
 * @route   GET /api/drivers/ride-requests
 * @desc    Get nearby ride requests (offers) for the driver
 * @access  Private (Driver)
 */
router.get('/ride-requests', driverController.getNearbyRideRequests);

/**
 * @route   PUT /api/drivers/location
 * @desc    Update driver location
 * @access  Private (Driver)
 */
router.put(
  '/location',
  sanitizeInput,
  [
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('address').optional().isString()
  ],
  validate,
  driverController.updateLocation
);

/**
 * @route   POST /api/drivers/clear-stuck-ride
 * @desc    Clear driver's stuck ride (self-service for drivers)
 * @access  Private (Driver)
 */
router.post('/clear-stuck-ride', driverController.clearStuckRide);

/**
 * @route   GET /api/drivers/rides/active
 * @desc    Get current active ride
 * @access  Private (Driver)
 */
router.get('/rides/active', driverController.getActiveRide);

/**
 * @route   PUT /api/drivers/rides/:id/accept
 * @desc    Accept a ride request
 * @access  Private (Driver)
 */
router.put('/rides/:id/accept', driverController.acceptRide);

/**
 * @route   PUT /api/drivers/rides/:id/reject
 * @desc    Reject a ride request
 * @access  Private (Driver)
 */
router.put(
  '/rides/:id/reject',
  sanitizeInput,
  [
    body('reason').optional().isString()
  ],
  validate,
  driverController.rejectRide
);

/**
 * @route   PUT /api/drivers/rides/:id/arrive
 * @desc    Mark arrival at pickup location
 * @access  Private (Driver)
 */
router.put('/rides/:id/arrive', driverController.arriveAtPickup);

/**
 * @route   PUT /api/drivers/rides/:id/start
 * @desc    Start ride with OTP verification
 * @access  Private (Driver)
 */
router.put(
  '/rides/:id/start',
  sanitizeInput,
  [
    body('otp').notEmpty().withMessage('OTP is required')
      .isLength({ min: 4, max: 4 }).withMessage('OTP must be 4 digits')
  ],
  validate,
  driverController.startRide
);

/**
 * @route   PUT /api/drivers/rides/:id/complete
 * @desc    Complete ride
 * @access  Private (Driver)
 */
router.put(
  '/rides/:id/complete',
  sanitizeInput,
  [
    body('finalFare').optional().isFloat({ min: 0 }).withMessage('Final fare must be positive')
  ],
  validate,
  driverController.completeRide
);

/**
 * @route   GET /api/drivers/earnings
 * @desc    Get earnings dashboard
 * @access  Private (Driver)
 */
router.get('/earnings', driverController.getEarnings);

/**
 * @route   GET /api/drivers/stats
 * @desc    Get driver statistics
 * @access  Private (Driver)
 */
router.get('/stats', driverController.getStats);

module.exports = router;
