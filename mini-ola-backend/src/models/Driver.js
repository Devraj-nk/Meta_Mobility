const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  vehicleType: {
    type: String,
    enum: ['bike', 'mini', 'sedan', 'suv'],
    required: [true, 'Vehicle type is required']
  },
  vehicleNumber: {
    type: String,
    required: [true, 'Vehicle number is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  vehicleModel: {
    type: String,
    required: [true, 'Vehicle model is required'],
    trim: true
  },
  vehicleColor: {
    type: String,
    trim: true
  },
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  licenseExpiry: {
    type: Date,
    required: [true, 'License expiry date is required']
  },
  isAvailable: {
    type: Boolean,
    default: false
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    },
    address: {
      type: String,
      default: ''
    }
  },
  currentRide: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    default: null
  },
  totalEarnings: {
    type: Number,
    default: 0,
    min: 0
  },
  totalRides: {
    type: Number,
    default: 0,
    min: 0
  },
  acceptanceRate: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },
  kycStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  kycDocuments: {
    aadhar: String,
    pan: String,
    drivingLicense: String,
    vehicleRC: String
  },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String
  },
  // Gamification features
  badges: [{
    name: String,
    earnedAt: {
      type: Date,
      default: Date.now
    }
  }],
  level: {
    type: Number,
    default: 1,
    min: 1
  },
  experience: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Create geospatial index for location-based queries
driverSchema.index({ currentLocation: '2dsphere' });
driverSchema.index({ isAvailable: 1, kycStatus: 1 });

// Method to toggle availability (CAB-F-007)
driverSchema.methods.toggleAvailability = function() {
  this.isAvailable = !this.isAvailable;
  return this.save();
};

// Method to update earnings
driverSchema.methods.addEarnings = function(amount) {
  this.totalEarnings += amount;
  this.totalRides += 1;
  
  // Update level based on rides (gamification)
  this.experience = this.totalRides * 10;
  this.level = Math.floor(this.totalRides / 10) + 1;
  
  // Award badges
  if (this.totalRides === 10 && !this.badges.find(b => b.name === 'Rookie')) {
    this.badges.push({ name: 'Rookie' });
  }
  if (this.totalRides === 50 && !this.badges.find(b => b.name === 'Experienced')) {
    this.badges.push({ name: 'Experienced' });
  }
  if (this.totalRides === 100 && !this.badges.find(b => b.name === 'Expert')) {
    this.badges.push({ name: 'Expert' });
  }
  
  return this.save();
};

// Method to update location
driverSchema.methods.updateLocation = function(longitude, latitude, address) {
  this.currentLocation = {
    type: 'Point',
    coordinates: [longitude, latitude],
    address: address || ''
  };
  return this.save();
};

const Driver = mongoose.model('Driver', driverSchema);

module.exports = Driver;
