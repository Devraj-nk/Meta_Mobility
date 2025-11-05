const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  rideType: {
    type: String,
    enum: ['bike', 'mini', 'sedan', 'suv'],
    required: [true, 'Ride type is required']
  },
  isGroupRide: {
    type: Boolean,
    default: false
  },
  groupMembers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    pickupLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number],
      address: String
    },
    fare: Number
  }],
  pickupLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  dropoffLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    address: {
      type: String,
      required: true
    }
  },
  status: {
    type: String,
    enum: ['requested', 'accepted', 'driver-arrived', 'in-progress', 'completed', 'cancelled'],
    default: 'requested'
  },
  fare: {
    estimatedFare: {
      type: Number,
      required: true
    },
    finalFare: {
      type: Number,
      default: 0
    },
    baseFare: Number,
    distanceFare: Number,
    timeFare: Number,
    surgeMultiplier: {
      type: Number,
      default: 1.0
    }
  },
  distance: {
    type: Number, // in kilometers
    default: 0
  },
  duration: {
    estimated: Number, // in minutes
    actual: Number
  },
  otp: {
    type: String,
    default: null
  },
  scheduledTime: {
    type: Date,
    default: null
  },
  startTime: {
    type: Date,
    default: null
  },
  endTime: {
    type: Date,
    default: null
  },
  cancellationReason: {
    type: String,
    default: null
  },
  cancelledBy: {
    type: String,
    enum: ['rider', 'driver', 'system'],
    default: null
  },
  rating: {
    riderRating: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      feedback: String
    },
    driverRating: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      feedback: String
    }
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  sosActivated: {
    type: Boolean,
    default: false
  },
  sosTimestamp: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Create geospatial indexes
rideSchema.index({ pickupLocation: '2dsphere' });
rideSchema.index({ dropoffLocation: '2dsphere' });
rideSchema.index({ status: 1, rider: 1 });
rideSchema.index({ status: 1, driver: 1 });

// Generate OTP for ride
rideSchema.methods.generateOTP = function() {
  this.otp = Math.floor(1000 + Math.random() * 9000).toString();
  return this.save();
};

// Verify OTP
rideSchema.methods.verifyOTP = function(inputOTP) {
  return this.otp === inputOTP;
};

// Start ride
rideSchema.methods.startRide = function() {
  this.status = 'in-progress';
  this.startTime = new Date();
  return this.save();
};

// Complete ride
rideSchema.methods.completeRide = function(finalFare) {
  this.status = 'completed';
  this.endTime = new Date();
  this.fare.finalFare = finalFare || this.fare.estimatedFare;
  // Keep paymentStatus as 'pending' until payment is actually processed
  // Don't auto-set to 'completed' here
  
  // Calculate actual duration
  if (this.startTime) {
    this.duration.actual = Math.floor((this.endTime - this.startTime) / 60000); // in minutes
  }
  
  return this.save();
};

// Cancel ride
rideSchema.methods.cancelRide = function(reason, cancelledBy) {
  this.status = 'cancelled';
  this.cancellationReason = reason;
  this.cancelledBy = cancelledBy;
  return this.save();
};

const Ride = mongoose.model('Ride', rideSchema);

module.exports = Ride;
