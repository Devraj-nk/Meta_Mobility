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
    password
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
    role: 'rider'
  });

  // Generate token (CAB-SR-003)
  const token = generateToken(user._id, user.role);

  res.status(201).json(
    formatSuccess('User registered successfully', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
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

  // Normalize inputs for reliable matching
  const normEmail = (email || '').trim().toLowerCase();
  const normPhone = (phone || '').replace(/\D/g, '');

  // Find user by email or phone
  const user = await User.findOne({
    $or: [{ email: normEmail }, { phone: normPhone }]
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
  // Determine source collection by role set in auth middleware
  const role = req.userRole || req.user?.role
  let account = null

  if (role === 'driver') {
    account = await Driver.findById(req.userId)
  } else {
    account = await User.findById(req.userId)
  }

  if (!account) {
    return res.status(404).json(
      formatError('User not found', 404)
    );
  }

  let driverProfile = null;
  if (role === 'driver') {
    // For backward compatibility, expose key driver profile fields within driverProfile
    driverProfile = {
      vehicleType: account.vehicleType,
      vehicleNumber: account.vehicleNumber,
      vehicleModel: account.vehicleModel,
      vehicleColor: account.vehicleColor,
      licenseNumber: account.licenseNumber,
      licenseExpiry: account.licenseExpiry,
      kycStatus: account.kycStatus
    };
  }

  res.json(
    formatSuccess('Profile retrieved successfully', {
      user: {
        id: account._id,
        name: account.name,
        email: account.email,
        phone: account.phone,
        role: account.role,
        rating: account.rating,
        totalRatings: account.totalRatings,
        ridesCompleted: account.ridesCompleted,
        isVerified: account.isVerified,
        profilePicture: account.profilePicture,
        driverProfile: driverProfile
      }
    })
  );
});

/**
 * Forgot/Reset password (unauthenticated)
 * POST /api/auth/forgot-password
 * Body: { username, email, newPassword }
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { username, email, newPassword } = req.body;

  // Normalize inputs
  const normEmail = (email || '').trim().toLowerCase();
  const uname = (username || '').trim();
  const phoneCandidate = uname.replace(/\D/g, '');

  // Helper to escape regex special chars
  const escapeRegExp = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const namePattern = uname ? new RegExp(`^${escapeRegExp(uname)}$`, 'i') : null;

  const findAccount = async () => {
    let doc = null;

    // Prefer exact email + (name OR phone) if provided
    if (normEmail && uname) {
      // Driver first: email + name
      doc = await Driver.findOne({ email: normEmail, name: namePattern }).select('+password');
      if (doc) return { doc, model: 'driver' };
      // Then rider: email + name
      doc = await User.findOne({ email: normEmail, name: namePattern }).select('+password');
      if (doc) return { doc, model: 'rider' };
      // If username looks like phone: email + phone
      if (phoneCandidate && phoneCandidate.length === 10) {
        doc = await Driver.findOne({ email: normEmail, phone: phoneCandidate }).select('+password');
        if (doc) return { doc, model: 'driver' };
        doc = await User.findOne({ email: normEmail, phone: phoneCandidate }).select('+password');
        if (doc) return { doc, model: 'rider' };
      }
    }

    // Email-only fallback
    if (normEmail) {
      doc = await Driver.findOne({ email: normEmail }).select('+password');
      if (doc) return { doc, model: 'driver' };
      doc = await User.findOne({ email: normEmail }).select('+password');
      if (doc) return { doc, model: 'rider' };
    }

    // Phone-only fallback if username is 10-digit phone
    if (phoneCandidate && phoneCandidate.length === 10) {
      doc = await Driver.findOne({ phone: phoneCandidate }).select('+password');
      if (doc) return { doc, model: 'driver' };
      doc = await User.findOne({ phone: phoneCandidate }).select('+password');
      if (doc) return { doc, model: 'rider' };
    }

    return null;
  };

  const found = await findAccount();
  if (!found || !found.doc) {
    return res.status(404).json(
      formatError('User not found with provided email and username', 404)
    );
  }

  // Set new password (will be hashed by pre-save hook)
  found.doc.password = newPassword;
  await found.doc.save();

  return res.json(
    formatSuccess('Password reset successful. Please login with your new password.')
  );
});

/**
 * Update user profile
 * PUT /api/auth/profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, email, profilePicture } = req.body;

  const role = req.userRole || req.user?.role;
  let accountModel = role === 'driver' ? Driver : User;
  let account = await accountModel.findById(req.userId).select('+password');

  if (!account) {
    return res.status(404).json(formatError('User not found', 404));
  }

  // Uniqueness checks for email/phone if provided and changed
  if (email && email !== account.email) {
    const exists = await accountModel.findOne({ email });
    if (exists) {
      return res.status(400).json(formatError('Email already in use', 400));
    }
    account.email = email;
  }
  if (phone && phone !== account.phone) {
    const exists = await accountModel.findOne({ phone });
    if (exists) {
      return res.status(400).json(formatError('Phone already in use', 400));
    }
    account.phone = phone;
  }

  if (name) account.name = name;
  if (profilePicture) account.profilePicture = profilePicture;

  await account.save();

  res.json(
    formatSuccess('Profile updated successfully', {
      user: {
        id: account._id,
        name: account.name,
        email: account.email,
        phone: account.phone,
        role: account.role,
        profilePicture: account.profilePicture
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

  const role = req.userRole || req.user?.role;
  let accountModel = role === 'driver' ? Driver : User;
  const account = await accountModel.findById(req.userId).select('+password');

  if (!account) {
    return res.status(404).json(formatError('User not found', 404));
  }

  // Verify current password
  const isPasswordValid = await account.comparePassword(currentPassword);
  if (!isPasswordValid) {
    return res.status(401).json(formatError('Current password is incorrect', 401));
  }

  // Update password (hashed by pre-save hook)
  account.password = newPassword;
  await account.save();

  res.json(formatSuccess('Password changed successfully'));
});

/**
 * Register new driver
 * POST /api/auth/register-driver
 */
const registerDriver = asyncHandler(async (req, res) => {
  const {
    name, email, phone, password,
    vehicleType, vehicleNumber, vehicleModel, vehicleColor,
    licenseNumber, licenseExpiry
  } = req.body;

  // Normalize inputs
  const normEmail = (email || '').trim().toLowerCase();
  const normPhone = (phone || '').replace(/\D/g, '');
  const normVehicleNumber = (vehicleNumber || '').trim().toUpperCase();
  const normLicenseNumber = (licenseNumber || '').trim().toUpperCase();

  // Check existing by email/phone in drivers
  const existingByContact = await Driver.findOne({ $or: [{ email: normEmail }, { phone: normPhone }] });
  if (existingByContact) {
    return res.status(400).json(
      formatError('Driver with this email or phone already exists', 400)
    );
  }

  // Proactive checks for unique vehicle fields to return clean 400s instead of E11000
  const dupVehicle = await Driver.findOne({ $or: [ { vehicleNumber: normVehicleNumber }, { licenseNumber: normLicenseNumber } ] });
  if (dupVehicle) {
    const conflicts = [];
    if (dupVehicle.vehicleNumber === normVehicleNumber) conflicts.push('vehicleNumber');
    if (dupVehicle.licenseNumber === normLicenseNumber) conflicts.push('licenseNumber');
    return res.status(400).json(
      formatError(`Driver with this ${conflicts.join(' and ')} already exists`, 400)
    );
  }

  // Validate required vehicle/license fields
  if (!vehicleType || !vehicleNumber || !vehicleModel || !licenseNumber || !licenseExpiry) {
    return res.status(400).json(
      formatError('Driver registration requires vehicle and license details', 400)
    );
  }

  // Create driver (auth + profile)
  const driverUser = await Driver.create({
    name,
    email: normEmail,
    phone: normPhone,
    password,
    role: 'driver',
    vehicleType,
    vehicleNumber: normVehicleNumber,
    vehicleModel,
    vehicleColor,
    licenseNumber: normLicenseNumber,
    licenseExpiry
  });

  const token = generateToken(driverUser._id, 'driver');
  res.status(201).json(
    formatSuccess('Driver registered successfully', {
      user: {
        id: driverUser._id,
        name: driverUser.name,
        email: driverUser.email,
        phone: driverUser.phone,
        role: driverUser.role
      },
      token
    })
  );
});

/**
 * Login driver
 * POST /api/auth/login-driver
 */
const loginDriver = asyncHandler(async (req, res) => {
  const { email, phone, password } = req.body;

  // Basic input validation
  if ((!email && !phone) || !password) {
    return res.status(400).json(
      formatError('Email or phone and password are required', 400)
    );
  }

  // Normalize inputs similar to registration
  const normEmail = (email || '').trim().toLowerCase();
  const normPhone = (phone || '').replace(/\D/g, '');

  const user = await Driver.findOne({ $or: [{ email: normEmail }, { phone: normPhone }] }).select('+password');
  if (!user) {
    return res.status(401).json(formatError('Invalid credentials', 401));
  }
  if (!user.isActive) {
    return res.status(401).json(formatError('Account is deactivated', 401));
  }
  // Some older driver records may not have a password (pre-refactor); guard to avoid bcrypt errors
  if (!user.password) {
    return res.status(401).json(formatError('Invalid credentials', 401));
  }
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json(formatError('Invalid credentials', 401));
  }
  const token = generateToken(user._id, 'driver');
  const driverProfile = {
    vehicleType: user.vehicleType,
    vehicleNumber: user.vehicleNumber,
    vehicleModel: user.vehicleModel,
    vehicleColor: user.vehicleColor,
    licenseNumber: user.licenseNumber,
    licenseExpiry: user.licenseExpiry,
    kycStatus: user.kycStatus
  };
  res.json(
    formatSuccess('Login successful', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        rating: user.rating,
        ridesCompleted: user.ridesCompleted,
        driverProfile
      },
      token
    })
  );
});

/**
 * Delete current account
 * DELETE /api/auth/account
 */
const deleteAccount = asyncHandler(async (req, res) => {
  const role = req.userRole || req.user?.role;

  if (role === 'driver') {
    // Block deletion if there is an active ride
    const driverProfile = await require('../models/Driver').findById(req.userId);
    if (driverProfile?.currentRide) {
      return res.status(400).json(formatError('Cannot delete account while a ride is active', 400));
    }

    // Safe to delete: remove driver profile then account
    if (driverProfile) {
      await driverProfile.deleteOne();
    }
    // Account is the same document now; nothing else to delete
  } else {
    // Rider: block if there is any active ride
    const activeRide = await require('../models/Ride').findOne({
      rider: req.userId,
      status: { $in: ['requested', 'accepted', 'driver-arrived', 'in-progress'] }
    });
    if (activeRide) {
      return res.status(400).json(formatError('Cannot delete account while a ride is active', 400));
    }
    await User.findByIdAndDelete(req.userId);
  }

  return res.json(formatSuccess('Account deleted successfully'));
});

module.exports = {
  register,
  login,
  registerDriver,
  loginDriver,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  deleteAccount
};
