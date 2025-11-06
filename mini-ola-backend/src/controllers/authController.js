const User = require('../models/User');
const Driver = require('../models/Driver');
const { generateToken, formatSuccess, formatError } = require('../utils/helpers');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Authentication Controller
 * Implements CAB-F-001: Secure Registration & Login
 */

/**
 * Register new user (rider or driver)
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    role,
    // Driver-specific fields
    vehicleType,
    vehicleNumber,
    vehicleModel,
    vehicleColor,
    licenseNumber,
    licenseExpiry
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { phone }]
  });

  if (existingUser) {
    return res.status(400).json(
      formatError('User with this email or phone already exists', 400)
    );
  }

  // Create user
  const user = await User.create({
    name,
    email,
    phone,
    password, // Will be hashed by pre-save hook (CAB-SR-002)
    role: role || 'rider'
  });

  // If role is driver, create driver profile
  if (user.role === 'driver') {
    if (!vehicleType || !vehicleNumber || !vehicleModel || !licenseNumber || !licenseExpiry) {
      await User.findByIdAndDelete(user._id);
      return res.status(400).json(
        formatError('Driver registration requires vehicle and license details', 400)
      );
    }

    await Driver.create({
      user: user._id,
      vehicleType,
      vehicleNumber,
      vehicleModel,
      vehicleColor,
      licenseNumber,
      licenseExpiry
    });
  }

  // Generate token (CAB-SR-003)
  const token = generateToken(user._id, user.role);

  res.status(201).json(
    formatSuccess('User registered successfully', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        walletBalance: user.walletBalance
      },
      token
    })
  );
});

/**
 * Login user
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, phone, password } = req.body;

  // Find user by email or phone
  const user = await User.findOne({
    $or: [{ email }, { phone }]
  }).select('+password');

  if (!user) {
    return res.status(401).json(
      formatError('Invalid credentials', 401)
    );
  }

  // Check if user is active
  if (!user.isActive) {
    return res.status(401).json(
      formatError('Account is deactivated', 401)
    );
  }

  // Compare password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    return res.status(401).json(
      formatError('Invalid credentials', 401)
    );
  }

  // Generate token
  const token = generateToken(user._id, user.role);

  // Get driver profile if user is driver
  let driverProfile = null;
  if (user.role === 'driver') {
    driverProfile = await Driver.findOne({ user: user._id });
  }

  res.json(
    formatSuccess('Login successful', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        rating: user.rating,
        walletBalance: user.walletBalance,
        ridesCompleted: user.ridesCompleted,
        driverProfile: driverProfile
      },
      token
    })
  );
});

/**
 * Get current user profile
 * GET /api/auth/profile
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    return res.status(404).json(
      formatError('User not found', 404)
    );
  }

  let driverProfile = null;
  if (user.role === 'driver') {
    driverProfile = await Driver.findOne({ user: user._id });
  }

  res.json(
    formatSuccess('Profile retrieved successfully', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        rating: user.rating,
        totalRatings: user.totalRatings,
        ridesCompleted: user.ridesCompleted,
        walletBalance: user.walletBalance,
        isVerified: user.isVerified,
        profilePicture: user.profilePicture,
        driverProfile: driverProfile
      }
    })
  );
});

/**
 * Update user profile
 * PUT /api/auth/profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, profilePicture } = req.body;

  const user = await User.findById(req.userId);

  if (!user) {
    return res.status(404).json(
      formatError('User not found', 404)
    );
  }

  // Update fields
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (profilePicture) user.profilePicture = profilePicture;

  await user.save();

  res.json(
    formatSuccess('Profile updated successfully', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profilePicture: user.profilePicture
      }
    })
  );
});

/**
 * Change password
 * PUT /api/auth/change-password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.userId).select('+password');

  if (!user) {
    return res.status(404).json(
      formatError('User not found', 404)
    );
  }

  // Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword);

  if (!isPasswordValid) {
    return res.status(401).json(
      formatError('Current password is incorrect', 401)
    );
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.json(
    formatSuccess('Password changed successfully')
  );
});

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
};
