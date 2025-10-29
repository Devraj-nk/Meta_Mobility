const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  ride: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: true,
    unique: true
  },
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  method: {
    type: String,
    enum: ['wallet'],
    required: true,
    default: 'wallet'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true // Allows null values while maintaining uniqueness
  },
  paymentGateway: {
    type: String,
    enum: ['internal'],
    default: 'internal'
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundReason: {
    type: String,
    default: null
  },
  refundedAt: {
    type: Date,
    default: null
  },
  // Commission breakdown
  platformFee: {
    type: Number,
    default: 0
  },
  driverEarnings: {
    type: Number,
    default: 0
  },
  // Payment gateway response (for debugging)
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Receipt details
  receiptNumber: {
    type: String,
    unique: true
  },
  receiptUrl: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for faster queries
paymentSchema.index({ rider: 1, createdAt: -1 });
paymentSchema.index({ driver: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });

// Generate receipt number
paymentSchema.pre('save', function(next) {
  if (!this.receiptNumber) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    this.receiptNumber = `REC-${timestamp}-${random}`;
  }
  next();
});

// Generate transaction ID for non-cash payments
paymentSchema.methods.generateTransactionId = function() {
  if (!this.transactionId && this.method !== 'cash') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    this.transactionId = `TXN-${this.paymentGateway.toUpperCase()}-${timestamp}-${random}`;
  }
  return this.save();
};

// Process payment using wallet
paymentSchema.methods.processPayment = async function() {
  const User = mongoose.model('User');
  
  this.status = 'processing';
  await this.save();
  
  // Calculate platform fee (20% commission)
  this.platformFee = this.amount * 0.20;
  this.driverEarnings = this.amount - this.platformFee;
  
  try {
    // Deduct from rider's wallet
    const rider = await User.findById(this.rider);
    
    if (!rider) {
      throw new Error('Rider not found');
    }
    
    if (rider.walletBalance < this.amount) {
      this.status = 'failed';
      await this.save();
      throw new Error('Insufficient wallet balance');
    }
    
    // Deduct from rider wallet
    rider.walletBalance -= this.amount;
    await rider.save();
    
    // Add earnings to driver wallet
    const driver = await User.findById(this.driver);
    if (driver) {
      driver.walletBalance += this.driverEarnings;
      await driver.save();
    }
    
    // Generate transaction ID
    await this.generateTransactionId();
    this.status = 'completed';
    
    return await this.save();
  } catch (error) {
    this.status = 'failed';
    await this.save();
    throw error;
  }
};

// Refund payment to rider wallet
paymentSchema.methods.refundPayment = async function(reason, amount) {
  const User = mongoose.model('User');
  
  if (this.status !== 'completed') {
    throw new Error('Cannot refund payment that is not completed');
  }
  
  const refundAmount = amount || this.amount;
  
  // Refund to rider's wallet
  const rider = await User.findById(this.rider);
  if (rider) {
    rider.walletBalance += refundAmount;
    await rider.save();
  }
  
  // Deduct from driver's wallet
  const driver = await User.findById(this.driver);
  if (driver) {
    driver.walletBalance -= refundAmount;
    await driver.save();
  }
  
  this.status = 'refunded';
  this.refundAmount = refundAmount;
  this.refundReason = reason;
  this.refundedAt = new Date();
  
  return await this.save();
};

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
