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

/**
 * @route   GET /api/drivers/documents
 * @desc    Get driver's vehicle and license details
 * @access  Private (Driver)
 */
router.get('/documents', driverController.getDocuments);

/**
 * @route   PUT /api/drivers/documents
 * @desc    Update driver's vehicle and license details
 * @access  Private (Driver)
 */
router.put(
  '/documents',
  sanitizeInput,
  [
    body('vehicleType').optional().isIn(['bike', 'mini', 'sedan', 'suv']).withMessage('Invalid vehicle type'),
    body('vehicleNumber').optional().isString().withMessage('Vehicle number must be a string'),
    body('vehicleModel').optional().isString().withMessage('Vehicle model must be a string'),
    body('vehicleColor').optional().isString().withMessage('Vehicle color must be a string'),
    body('licenseNumber').optional().isString().withMessage('License number must be a string'),
    body('licenseExpiry').optional().isISO8601().withMessage('License expiry must be a valid date')
  ],
  validate,
  driverController.updateDocuments
);

/**
 * @route   GET /api/drivers/bank
 * @desc    Get driver's bank details (masked account number)
 * @access  Private (Driver)
 */
router.get('/bank', driverController.getBankDetails);

/**
 * @route   PUT /api/drivers/bank
 * @desc    Update driver's bank details
 * @access  Private (Driver)
 */
router.put(
  '/bank',
  sanitizeInput,
  [
    body('accountHolderName').optional().isString().isLength({ min: 2 }).withMessage('Account holder name must be at least 2 characters'),
    body('accountNumber').optional().matches(/^\d{9,18}$/).withMessage('Account number must be 9-18 digits'),
    body('ifscCode').optional().matches(/^[A-Z]{4}0[A-Z0-9]{6}$/i).withMessage('Invalid IFSC code'),
    body('bankName').optional().isString().isLength({ min: 2 }).withMessage('Bank name must be at least 2 characters'),
    body('branchName').optional().isString().isLength({ min: 2 }).withMessage('Branch name must be at least 2 characters'),
    body('upiId').optional().matches(/^[a-zA-Z0-9._-]{2,}@[A-Za-z][A-Za-z0-9]{2,}$/).withMessage('Invalid UPI ID'),
    body('qrCodeImage').optional().isURL().withMessage('QR Code image must be a valid URL')
  ],
  validate,
  driverController.updateBankDetails
);

module.exports = router;
