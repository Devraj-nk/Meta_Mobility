const express = require('express');
const { body, query } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const { validate, sanitizeInput } = require('../middleware/validator');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/payments/process
 * @desc    Process payment for a ride
 * @access  Private (Rider)
 */
router.post(
  '/process',
  sanitizeInput,
  [
    body('rideId').notEmpty().withMessage('Ride ID is required')
      .isMongoId().withMessage('Invalid ride ID'),
    body('method').optional().isIn(['wallet', 'upi', 'cash']).withMessage('Invalid method')
  ],
  validate,
  paymentController.processPayment
);

/**
 * @route   GET /api/payments/history
 * @desc    Get payment history
 * @access  Private
 */
router.get(
  '/history',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
  ],
  validate,
  paymentController.getPaymentHistory
);

/**
 * @route   GET /api/payments/:rideId
 * @desc    Get payment receipt
 * @access  Private
 */
router.get('/:rideId', paymentController.getPaymentReceipt);

/**
 * @route   POST /api/payments/:rideId/refund
 * @desc    Refund a payment
 * @access  Private (Admin/Rider)
 */
router.post(
  '/:rideId/refund',
  sanitizeInput,
  [
    body('reason').notEmpty().withMessage('Refund reason is required'),
    body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be positive')
  ],
  validate,
  paymentController.refundPayment
);

/**
 * @route   POST /api/payments/wallet/topup
 * @desc    Top up wallet balance
 * @access  Private (Rider)
 */
router.post(
  '/wallet/topup',
  sanitizeInput,
  [
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1'),
    body('method').optional().isIn(['upi', 'cash']).withMessage('Invalid top-up method')
  ],
  validate,
  paymentController.topUpWallet
);

module.exports = router;
