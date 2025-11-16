const Payment = require('../models/Payment');
const Ride = require('../models/Ride');
const { formatSuccess, formatError } = require('../utils/helpers');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Payment Controller
 * Implements CAB-F-006: Process Payments
 */

/**
 * Process payment for a ride
 * POST /api/payments/process
 * Implements CAB-F-006
 */
const processPayment = asyncHandler(async (req, res) => {
  const { rideId, method: inputMethod } = req.body;
  const method = inputMethod || 'wallet';

  if (!['wallet', 'upi', 'cash'].includes(method)) {
    return res.status(400).json(
      formatError('Invalid payment method. Allowed: wallet, upi, cash', 400)
    );
  }

  // Get ride details
  const ride = await Ride.findById(rideId);

  if (!ride) {
    return res.status(404).json(
      formatError('Ride not found', 404)
    );
  }

  // Check if ride is completed
  if (ride.status !== 'completed') {
    return res.status(400).json(
      formatError('Cannot process payment for incomplete ride', 400)
    );
  }

  // Check if user is the rider
  if (ride.rider.toString() !== req.userId.toString() && req.userRole !== 'admin') {
    return res.status(403).json(
      formatError('Not authorized to pay for this ride', 403)
    );
  }

  // Check if payment already exists
  const existingPayment = await Payment.findOne({ ride: rideId });
  if (existingPayment) {
    if (existingPayment.status === 'completed') {
      return res.status(400).json(
        formatError('Payment already processed', 400)
      );
    }
    
    // Retry failed payment
    if (existingPayment.status === 'failed') {
      existingPayment.method = method;
      existingPayment.status = 'pending';
      await existingPayment.save();

      try {
        if (method === 'wallet') {
          await existingPayment.processPayment();
        } else {
          // Simulate non-wallet payment success (UPI/CASH)
          existingPayment.platformFee = existingPayment.amount * 0.20;
          existingPayment.driverEarnings = existingPayment.amount - existingPayment.platformFee;
          if (method === 'upi') {
            await existingPayment.generateTransactionId();
          }
          existingPayment.status = 'completed';
          await existingPayment.save();
        }

        // Update ride payment status
        ride.paymentStatus = 'completed';
        await ride.save();

        return res.json(
          formatSuccess('Payment processed successfully', { payment: existingPayment })
        );
      } catch (error) {
        return res.status(400).json(
          formatError(error.message || 'Payment processing failed', 400)
        );
      }
    }
  }

  // Create payment
  const payment = await Payment.create({
    ride: rideId,
    rider: ride.rider,
    driver: ride.driver,
    amount: ride.fare.finalFare,
    method: method,
    status: 'pending'
  });

  // Process payment
  try {
    if (method === 'wallet') {
      await payment.processPayment();
    } else {
      // Simulate non-wallet payment success (UPI/CASH)
      payment.platformFee = payment.amount * 0.20;
      payment.driverEarnings = payment.amount - payment.platformFee;
      if (method === 'upi') {
        await payment.generateTransactionId();
      }
      payment.status = 'completed';
      await payment.save();
    }

    // Update ride payment status
    ride.paymentStatus = 'completed';
    await ride.save();

    res.status(201).json(
      formatSuccess('Payment processed successfully', { payment })
    );
  } catch (error) {
    return res.status(400).json(
      formatError(error.message || 'Payment processing failed', 400)
    );
  }
});

/**
 * Get payment receipt
 * GET /api/payments/:rideId
 * Implements CAB-F-009 (Payment Receipt)
 */
const getPaymentReceipt = asyncHandler(async (req, res) => {
  const { rideId } = req.params;

  const payment = await Payment.findOne({ ride: rideId })
    .populate('ride')
    .populate('rider', 'name email phone')
    .populate('driver', 'name phone');

  if (!payment) {
    return res.status(404).json(
      formatError('Payment not found', 404)
    );
  }

  // Check authorization
  if (payment.rider._id.toString() !== req.userId.toString() && 
      payment.driver._id.toString() !== req.userId.toString() &&
      req.userRole !== 'admin') {
    return res.status(403).json(
      formatError('Not authorized to view this receipt', 403)
    );
  }

  res.json(
    formatSuccess('Payment receipt retrieved successfully', {
      receipt: {
        receiptNumber: payment.receiptNumber,
        ride: {
          id: payment.ride._id,
          pickupAddress: payment.ride.pickupLocation.address,
          dropoffAddress: payment.ride.dropoffLocation.address,
          distance: payment.ride.distance,
          duration: payment.ride.duration.actual || payment.ride.duration.estimated,
          startTime: payment.ride.startTime,
          endTime: payment.ride.endTime
        },
        rider: {
          name: payment.rider.name,
          phone: payment.rider.phone
        },
        driver: {
          name: payment.driver.name,
          phone: payment.driver.phone
        },
        fareBreakdown: {
          baseFare: payment.ride.fare.baseFare,
          distanceFare: payment.ride.fare.distanceFare,
          timeFare: payment.ride.fare.timeFare,
          surgeMultiplier: payment.ride.fare.surgeMultiplier,
          total: payment.amount
        },
        payment: {
          method: payment.method,
          status: payment.status,
          transactionId: payment.transactionId,
          paidAt: payment.updatedAt
        }
      }
    })
  );
});

/**
 * Get payment history
 * GET /api/payments/history
 */
const getPaymentHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const query = { 
    [req.userRole === 'driver' ? 'driver' : 'rider']: req.userId 
  };

  const payments = await Payment.find(query)
    .populate('ride', 'pickupLocation dropoffLocation distance status')
    .populate('rider', 'name')
    .populate('driver', 'name')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await Payment.countDocuments(query);

  res.json(
    formatSuccess('Payment history retrieved successfully', {
      payments,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalPayments: count
    })
  );
});

/**
 * Refund payment
 * POST /api/payments/:rideId/refund
 */
const refundPayment = asyncHandler(async (req, res) => {
  const { rideId } = req.params;
  const { reason, amount } = req.body;

  // Only admin can refund (in production)
  if (req.userRole !== 'admin' && req.userRole !== 'rider') {
    return res.status(403).json(
      formatError('Not authorized to process refunds', 403)
    );
  }

  const payment = await Payment.findOne({ ride: rideId });

  if (!payment) {
    return res.status(404).json(
      formatError('Payment not found', 404)
    );
  }

  if (payment.status !== 'completed') {
    return res.status(400).json(
      formatError('Can only refund completed payments', 400)
    );
  }

  // Process refund
  await payment.refundPayment(reason, amount);

  // Update ride payment status
  const ride = await Ride.findById(rideId);
  if (ride) {
    ride.paymentStatus = 'refunded';
    await ride.save();
  }

  res.json(
    formatSuccess('Payment refunded successfully', { payment })
  );
});

/**
 * Top up rider wallet (simulated)
 * POST /api/payments/wallet/topup
 */
const topUpWallet = asyncHandler(async (req, res) => {
  const { amount, method } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json(
      formatError('Amount must be greater than 0', 400)
    );
  }

  if (method && !['upi', 'cash'].includes(method)) {
    return res.status(400).json(
      formatError('Invalid top-up method. Allowed: upi, cash', 400)
    );
  }

  const User = require('../models/User');
  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(404).json(formatError('User not found', 404));
  }

  user.walletBalance += amount;
  await user.save();

  return res.status(201).json(
    formatSuccess('Wallet topped up successfully', {
      balance: user.walletBalance
    })
  );
});

module.exports = {
  processPayment,
  getPaymentReceipt,
  getPaymentHistory,
  refundPayment,
  topUpWallet
};
