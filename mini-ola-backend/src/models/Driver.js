const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  // Auth and identity fields (migrated from DriverAccount)
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['driver'],
    default: 'driver'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  profilePicture: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    default: 5.0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  ridesCompleted: {
    type: Number,
    default: 0
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
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
    accountHolderName: { type: String, default: '' },
    bankName: { type: String, default: '' },
    branchName: { type: String, default: '' },
    upiId: { type: String, default: '' },
    qrCodeImage: { type: String, default: '' }
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
driverSchema.index({ email: 1 }, { unique: true });
driverSchema.index({ phone: 1 }, { unique: true });

// Hash password before saving
driverSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) { next(err); }
});

// Compare password
driverSchema.methods.comparePassword = async function(candidatePassword) {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(candidatePassword, this.password);
};

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
