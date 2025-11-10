const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const User = require('../models/User');
const { formatSuccess, formatError } = require('../utils/helpers');
const { asyncHandler } = require('../middleware/errorHandler');
/**
 * Get nearby ride requests (polling for offers)
 * GET /api/drivers/ride-requests
 */
const getNearbyRideRequests = asyncHandler(async (req, res) => {
  // Use driver id from auth; driver documents are separate from users
  const driver = await Driver.findById(req.userId);

  if (!driver) {
    return res.status(404).json(formatError('Driver profile not found', 404));
  }

  if (!driver.isAvailable) {
    return res.json(formatSuccess('Driver offline - no requests', { requests: [] }));
  }

  const coords = driver.currentLocation?.coordinates;
  if (!coords || coords.length !== 2 || (coords[0] === 0 && coords[1] === 0)) {
    return res.json(formatSuccess('Driver location not set', { requests: [] }));
  }

  // Build query for two cases:
  // 1) Generic: requested rides within 5km and matching vehicle type
  // 2) Targeted: rides where rider pre-selected THIS driver (status=driver-selected)
  const genericFilter = {
    status: 'requested',
    rideType: driver.vehicleType,
    pickupLocation: {
      $near: {
        $geometry: { type: 'Point', coordinates: coords },
        $maxDistance: 5000
      }
    }
  };
  const targetedFilter = { status: 'driver-selected', driver: driver._id };

  let requests = [];
  try {
    requests = await Ride.find({ $or: [genericFilter, targetedFilter] })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('rider', 'name phone rating');
  } catch (err) {
    // Geospatial query might fail if index not ready; fallback to manual distance
    const allCandidateRides = await Ride.find({
      status: { $in: ['requested', 'driver-selected'] },
      rideType: driver.vehicleType
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('rider', 'name phone rating');

    const toRad = deg => deg * Math.PI / 180;
    const haversine = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // km
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };
    const dLat = driver.currentLocation.coordinates[1];
    const dLon = driver.currentLocation.coordinates[0];
    requests = allCandidateRides.filter(r => {
      if (r.status === 'driver-selected' && String(r.driver) !== String(driver._id)) return false;
      const coords = r.pickupLocation?.coordinates;
      if (!coords || coords.length !== 2) return false;
      const dist = haversine(coords[1], coords[0], dLat, dLon); // km
      return dist <= 5; // within 5km
    }).slice(0, 10);
  }

  // Filter and cleanup expired 'driver-selected' requests (>4 min without acceptance)
  const timeoutMs = 4 * 60 * 1000;
  const now = Date.now();
  const filtered = [];
  for (const r of requests) {
    if (r.status === 'driver-selected' && r.driverSelectedAt) {
      const elapsed = now - new Date(r.driverSelectedAt).getTime();
      if (elapsed > timeoutMs) {
        // auto-cancel expired selection
        await r.cancelRide('Driver did not accept within 4 minutes', 'system');
        continue;
      }
    }
    filtered.push(r);
  }

  return res.json(formatSuccess('Nearby ride requests', { requests: filtered }));
});

/**
 * Driver Controller
 * Implements CAB-F-007: Driver Operations
 */

/**
 * Toggle driver availability
 * PUT /api/drivers/availability
 * Implements CAB-F-007
 */
const toggleAvailability = asyncHandler(async (req, res) => {
  const { isAvailable, latitude, longitude, address } = req.body;

  const driver = await Driver.findById(req.userId).select('+password');

  if (!driver) {
    return res.status(404).json(
      formatError('Driver profile not found', 404)
    );
  }

  // Check KYC status
  if (driver.kycStatus !== 'approved') {
    return res.status(403).json(
      formatError('KYC verification required to go online', 403)
    );
  }

  // If trying to go online while a ride is active, block it
  if (typeof isAvailable === 'boolean' && isAvailable === true && driver.currentRide) {
    return res.status(400).json(
      formatError('Cannot go online while an active ride is assigned. Complete or clear the ride first.', 400)
    );
  }

  // Update availability only if provided explicitly
  if (typeof isAvailable === 'boolean') {
    driver.isAvailable = isAvailable;
  }

  // Update location if provided
  if (latitude && longitude) {
    driver.currentLocation = {
      type: 'Point',
      coordinates: [longitude, latitude],
      address: address || ''
    };
  }

  await driver.save();

  res.json(
    formatSuccess(
      `Driver is now ${driver.isAvailable ? 'online' : 'offline'}`,
      { driver }
    )
  );
});

/**
 * Update driver location
 * PUT /api/drivers/location
 */
const updateLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude, address } = req.body;

  const driver = await Driver.findById(req.userId);

  if (!driver) {
    return res.status(404).json(
      formatError('Driver profile not found', 404)
    );
  }

  await driver.updateLocation(longitude, latitude, address);

  res.json(
    formatSuccess('Location updated successfully', { 
      location: driver.currentLocation 
    })
  );
});

/**
 * Get active ride
 * GET /api/drivers/rides/active
 */
const getActiveRide = asyncHandler(async (req, res) => {
  const driver = await Driver.findById(req.userId);

  if (!driver) {
    return res.status(404).json(
      formatError('Driver profile not found', 404)
    );
  }

  if (!driver.currentRide) {
    return res.status(404).json(
      formatError('No active ride', 404)
    );
  }

  const ride = await Ride.findById(driver.currentRide)
    .populate({ path: 'rider', select: 'name phone rating profilePicture', model: 'User' })
    .populate({ path: 'driver', select: 'name phone rating profilePicture', model: 'Driver' });

  res.json(
    formatSuccess('Active ride retrieved successfully', { ride })
  );
});

/**
 * Accept ride request (requires OTP from rider)
 * PUT /api/drivers/rides/:id/accept
 */
const acceptRide = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { otp } = req.body;

  const driver = await Driver.findById(req.userId);

  if (!driver) {
    return res.status(404).json(
      formatError('Driver profile not found', 404)
    );
  }

  if (!driver.isAvailable) {
    return res.status(400).json(
      formatError('Driver must be available to accept rides', 400)
    );
  }

  if (!otp) {
    return res.status(400).json(
      formatError('OTP is required to accept the ride', 400)
    );
  }

  // First check ride state to provide precise error messages
  const rideDoc = await Ride.findById(id).select('status driver otp preferredDriver driverSelectedAt');
  if (!rideDoc) {
    return res.status(404).json(formatError('Ride not found', 404));
  }
  
  // OTP required
  if (!otp) {
    return res.status(400).json(formatError('OTP is required to accept the ride', 400));
  }
  if (String(otp) !== String(rideDoc.otp)) {
    return res.status(400).json(formatError('Invalid OTP', 400));
  }

  let query;
  let update;
  if (rideDoc.status === 'requested' && !rideDoc.driver) {
    // normal case: unassigned
    query = { _id: id, status: 'requested', driver: null };
    update = { $set: { driver: req.userId, status: 'accepted', otpVerified: true } };
  } else if (rideDoc.status === 'driver-selected' && String(rideDoc.driver) === String(req.userId)) {
    // Check timeout before accepting
    const timeoutMs = 4 * 60 * 1000;
    if (rideDoc.driverSelectedAt && (Date.now() - new Date(rideDoc.driverSelectedAt).getTime()) > timeoutMs) {
      // Cancel ride; tell driver it's expired
      const expired = await Ride.findById(id);
      if (expired) {
        await expired.cancelRide('Driver did not accept within 4 minutes', 'system');
      }
      return res.status(409).json(formatError('Ride offer expired due to timeout', 409));
    }
    // rider pre-selected this driver
    query = { _id: id, status: 'driver-selected', driver: req.userId };
    update = { $set: { status: 'accepted', otpVerified: true } };
  } else {
    return res.status(409).json(formatError('Ride already accepted or assigned to another driver', 409));
  }

  // Atomically update
  const ride = await Ride.findOneAndUpdate(query, update, { new: true });
  if (!ride) {
    return res.status(409).json(formatError('Ride already accepted', 409));
  }

  // Update driver
  driver.currentRide = ride._id;
  driver.isAvailable = false;
  await driver.save();

  await ride.populate({ path: 'rider', select: 'name phone rating profilePicture', model: 'User' });

  res.json(
    formatSuccess('Ride accepted successfully', { ride })
  );
});

/**
 * Reject ride request
 * PUT /api/drivers/rides/:id/reject
 */
const rejectRide = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const ride = await Ride.findById(id);

  if (!ride) {
    return res.status(404).json(
      formatError('Ride not found', 404)
    );
  }

  if (ride.driver?.toString() !== req.userId.toString()) {
    return res.status(403).json(
      formatError('Not authorized to reject this ride', 403)
    );
  }

  if (ride.status === 'driver-selected') {
    // Return to pool for other drivers
    ride.driver = null;
    ride.preferredDriver = null;
    ride.status = 'requested';
    await ride.save();
    return res.json(formatSuccess('Ride returned to queue', { ride }));
  } else {
    // If already accepted/in-progress, treat as cancel by driver
    await ride.cancelRide(reason || 'Rejected by driver', 'driver');
    return res.json(formatSuccess('Ride rejected', { ride }));
  }
});

/**
 * Arrive at pickup location
 * PUT /api/drivers/rides/:id/arrive
 */
const arriveAtPickup = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const ride = await Ride.findById(id)
    .populate('rider', 'name phone');

  if (!ride) {
    return res.status(404).json(
      formatError('Ride not found', 404)
    );
  }

  if (ride.driver?.toString() !== req.userId.toString()) {
    return res.status(403).json(
      formatError('Not authorized', 403)
    );
  }

  if (ride.status !== 'accepted') {
    return res.status(400).json(
      formatError('Invalid ride status', 400)
    );
  }

  ride.status = 'driver-arrived';
  await ride.save();

  res.json(
    formatSuccess('Marked as arrived at pickup', { ride })
  );
});

/**
 * Start ride
 * PUT /api/drivers/rides/:id/start
 */
const startRide = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { otp } = req.body;

  const ride = await Ride.findById(id)
    .populate('rider', 'name phone rating profilePicture');

  if (!ride) {
    return res.status(404).json(
      formatError('Ride not found', 404)
    );
  }

  if (ride.driver?.toString() !== req.userId.toString()) {
    return res.status(403).json(
      formatError('Not authorized', 403)
    );
  }

  if (!['accepted', 'driver-arrived'].includes(ride.status)) {
    return res.status(400).json(
      formatError('Cannot start ride with current status', 400)
    );
  }

  // Verify OTP unless already verified at accept
  if (!ride.otpVerified) {
    if (!ride.verifyOTP(otp)) {
      return res.status(400).json(
        formatError('Invalid OTP', 400)
      );
    }
    ride.otpVerified = true;
    await ride.save();
  }

  // Start ride
  await ride.startRide();

  res.json(
    formatSuccess('Ride started successfully', { ride })
  );
});

/**
 * Complete ride
 * PUT /api/drivers/rides/:id/complete
 */
const completeRide = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { finalFare } = req.body;

  const ride = await Ride.findById(id)
    .populate('rider', 'name phone rating')
    .populate('driver', 'name phone rating');

  if (!ride) {
    return res.status(404).json(
      formatError('Ride not found', 404)
    );
  }

  if (ride.driver._id.toString() !== req.userId.toString()) {
    return res.status(403).json(
      formatError('Not authorized', 403)
    );
  }

  if (ride.status !== 'in-progress') {
    return res.status(400).json(
      formatError('Ride is not in progress', 400)
    );
  }

  // Complete ride
  await ride.completeRide(finalFare);

  // Update driver stats
  const driver = await Driver.findById(req.userId);
  if (driver) {
    await driver.addEarnings(ride.fare.finalFare);
    driver.currentRide = null;
    driver.isAvailable = true;
    await driver.save();
  }

  // Update rider stats
  const riderUser = await User.findById(ride.rider._id);
  if (riderUser) {
    riderUser.ridesCompleted += 1;
    await riderUser.save();
  }

  res.json(
    formatSuccess('Ride completed successfully', { ride })
  );
});

/**
 * Get earnings dashboard
 * GET /api/drivers/earnings
 */
const getEarnings = asyncHandler(async (req, res) => {
  const driver = await Driver.findById(req.userId);

  if (!driver) {
    return res.status(404).json(
      formatError('Driver profile not found', 404)
    );
  }

  // Get completed rides
  const completedRides = await Ride.find({
    driver: req.userId,
    status: 'completed'
  }).sort({ endTime: -1 }).limit(10);

  // Calculate today's earnings
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayRides = await Ride.find({
    driver: req.userId,
    status: 'completed',
    endTime: { $gte: today }
  });

  const todayEarnings = todayRides.reduce((sum, ride) => sum + ride.fare.finalFare, 0);

  res.json(
    formatSuccess('Earnings retrieved successfully', {
      driver: {
        name: driver.name,
        rating: driver.rating,
        level: driver.level,
        badges: driver.badges,
        vehicleType: driver.vehicleType,
        vehicleNumber: driver.vehicleNumber
      },
      totalEarnings: driver.totalEarnings,
      totalRides: driver.totalRides,
      todayEarnings,
      todayRides: todayRides.length,
      recentRides: completedRides
    })
  );
});

/**
 * Get driver stats
 * GET /api/drivers/stats
 */
const getStats = asyncHandler(async (req, res) => {
  const driver = await Driver.findById(req.userId);

  if (!driver) {
    return res.status(404).json(
      formatError('Driver profile not found', 404)
    );
  }

  // Get ride statistics
  const totalRides = await Ride.countDocuments({
    driver: req.userId,
    status: 'completed'
  });

  const cancelledRides = await Ride.countDocuments({
    driver: req.userId,
    status: 'cancelled',
    cancelledBy: 'driver'
  });

  res.json(
    formatSuccess('Stats retrieved successfully', {
      totalRides: driver.totalRides,
      totalEarnings: driver.totalEarnings,
  rating: driver.rating,
  totalRatings: driver.totalRatings,
      acceptanceRate: driver.acceptanceRate,
      cancelledRides,
      level: driver.level,
      experience: driver.experience,
      badges: driver.badges,
      kycStatus: driver.kycStatus
    })
  );
});

/**
 * Debug endpoint to check available drivers
 * GET /api/drivers/debug/available
 */
const debugAvailableDrivers = asyncHandler(async (req, res) => {
  // Get all drivers with their details
  const allDrivers = await Driver.find()
    .populate('currentRide')
    .select('name email phone role isAvailable kycStatus currentLocation currentRide vehicleType vehicleNumber');

  const availableDrivers = allDrivers.filter(d => 
    d.isAvailable === true && 
    d.kycStatus === 'approved' && 
    d.currentRide === null
  );

  const response = {
    totalDrivers: allDrivers.length,
    availableDrivers: availableDrivers.length,
    drivers: allDrivers.map(driver => ({
      _id: driver._id,
      userId: driver._id,
      name: driver.name || 'Unknown',
      email: driver.email,
      phone: driver.phone,
      isAvailable: driver.isAvailable,
      kycStatus: driver.kycStatus,
      currentRide: driver.currentRide ? 'Has active ride' : 'No active ride',
      currentRideId: driver.currentRide?._id || null,
      currentRideStatus: driver.currentRide?.status || null,
      vehicleType: driver.vehicleType,
      vehicleNumber: driver.vehicleNumber,
      location: {
        coordinates: driver.currentLocation?.coordinates || null,
        address: driver.currentLocation?.address || 'Not set'
      },
      canAcceptRides: driver.isAvailable && driver.kycStatus === 'approved' && !driver.currentRide
    }))
  };

  res.json(formatSuccess('Driver debug info', response));
});

/**
 * Debug endpoint to reset driver status (clear stuck rides)
 * POST /api/drivers/debug/reset/:driverId
 */
const debugResetDriver = asyncHandler(async (req, res) => {
  const { driverId } = req.params;

  const driver = await Driver.findById(driverId);
  if (!driver) {
    return res.status(404).json(formatError('Driver not found', 404));
  }

  // Clear current ride
  const oldRideId = driver.currentRide;
  driver.currentRide = null;
  driver.isAvailable = true; // Also set as available
  await driver.save();

  res.json(
    formatSuccess('Driver reset successfully', {
      driverId: driver._id,
      clearedRideId: oldRideId,
      nowAvailable: true
    })
  );
});

/**
 * Clear driver's own stuck ride (self-service)
 * POST /api/drivers/clear-stuck-ride
 */
const clearStuckRide = asyncHandler(async (req, res) => {
  const driver = await Driver.findById(req.userId);

  if (!driver) {
    return res.status(404).json(formatError('Driver profile not found', 404));
  }

  if (!driver.currentRide) {
    return res.status(400).json(
      formatError('No active ride to clear', 400)
    );
  }

  // Get the ride details
  const ride = await Ride.findById(driver.currentRide)
    .populate('rider', 'name phone rating')
    .populate('driver', 'name phone rating');

  if (!ride) {
    // Ride doesn't exist, just clear the reference
    driver.currentRide = null;
    driver.isAvailable = true;
    await driver.save();
    return res.json(
      formatSuccess('Ride reference cleared (ride not found in database)', {})
    );
  }

  // If ride is already completed or cancelled, just clear the driver's reference
  if (ride.status === 'completed' || ride.status === 'cancelled') {
    driver.currentRide = null;
    driver.isAvailable = true;
    await driver.save();

    return res.json(
      formatSuccess('Stuck ride cleared successfully', {
        clearedRideId: driver.currentRide,
        rideStatus: ride.status
      })
    );
  }

  // If ride is in active state (accepted, driver-arrived, in-progress), offer to complete it
  if (['accepted', 'driver-arrived', 'in-progress'].includes(ride.status)) {
    // Auto-complete the ride
    await ride.completeRide(ride.fare?.estimatedFare || 0);

    // Update driver stats
    await driver.addEarnings(ride.fare.finalFare);
    driver.currentRide = null;
    driver.isAvailable = true;
    await driver.save();

    // Update rider stats
    const riderUser = await User.findById(ride.rider._id);
    if (riderUser) {
      riderUser.ridesCompleted += 1;
      await riderUser.save();
    }

    return res.json(
      formatSuccess('Ride completed and cleared successfully', {
        ride,
        message: 'Ride has been marked as completed'
      })
    );
  }

  return res.status(400).json(
    formatError(`Cannot clear ride with status: ${ride.status}`, 400)
  );
});

module.exports = {
  toggleAvailability,
  updateLocation,
  getActiveRide,
  acceptRide,
  rejectRide,
  arriveAtPickup,
  startRide,
  completeRide,
  getEarnings,
  getStats,
  debugAvailableDrivers,
  debugResetDriver,
  clearStuckRide,
  // new exports
  getDocuments: asyncHandler(async (req, res) => {
    const driver = await Driver.findById(req.userId);
    if (!driver) {
      return res.status(404).json(formatError('Driver profile not found', 404));
    }
    const docs = {
      vehicleType: driver.vehicleType,
      vehicleNumber: driver.vehicleNumber,
      vehicleModel: driver.vehicleModel,
      vehicleColor: driver.vehicleColor,
      licenseNumber: driver.licenseNumber,
      licenseExpiry: driver.licenseExpiry,
      kycStatus: driver.kycStatus
    };
    return res.json(formatSuccess('Driver documents', docs));
  }),
  updateDocuments: asyncHandler(async (req, res) => {
    const driver = await Driver.findById(req.userId);
    if (!driver) {
      return res.status(404).json(formatError('Driver profile not found', 404));
    }
    const {
      vehicleType,
      vehicleNumber,
      vehicleModel,
      vehicleColor,
      licenseNumber,
      licenseExpiry
    } = req.body;

    if (vehicleType !== undefined) driver.vehicleType = vehicleType;
    if (vehicleNumber !== undefined) driver.vehicleNumber = vehicleNumber;
    if (vehicleModel !== undefined) driver.vehicleModel = vehicleModel;
    if (vehicleColor !== undefined) driver.vehicleColor = vehicleColor;
    if (licenseNumber !== undefined) driver.licenseNumber = licenseNumber;
    if (licenseExpiry !== undefined) driver.licenseExpiry = licenseExpiry;

    await driver.save();
    const docs = {
      vehicleType: driver.vehicleType,
      vehicleNumber: driver.vehicleNumber,
      vehicleModel: driver.vehicleModel,
      vehicleColor: driver.vehicleColor,
      licenseNumber: driver.licenseNumber,
      licenseExpiry: driver.licenseExpiry,
      kycStatus: driver.kycStatus
    };
    return res.json(formatSuccess('Driver documents updated', docs));
  }),
  // Bank details
  getBankDetails: asyncHandler(async (req, res) => {
    const driver = await Driver.findById(req.userId);
    if (!driver) {
      return res.status(404).json(formatError('Driver profile not found', 404));
    }

    const bd = driver.bankDetails || {};
    const accNum = bd.accountNumber || '';
    const masked = accNum
      ? accNum.length <= 4
        ? '*'.repeat(Math.max(0, accNum.length - 0)) + accNum
        : '*'.repeat(accNum.length - 4) + accNum.slice(-4)
      : '';

    return res.json(
      formatSuccess('Bank details retrieved', {
        accountHolderName: bd.accountHolderName || '',
        ifscCode: bd.ifscCode || '',
        bankName: bd.bankName || '',
        branchName: bd.branchName || '',
        upiId: bd.upiId || '',
        qrCodeImage: bd.qrCodeImage || '',
        accountNumberMasked: masked,
        hasAccountNumber: !!accNum
      })
    );
  }),
  updateBankDetails: asyncHandler(async (req, res) => {
    const driver = await Driver.findById(req.userId);
    if (!driver) {
      return res.status(404).json(formatError('Driver profile not found', 404));
    }

    const { accountHolderName, accountNumber, ifscCode, bankName, branchName, upiId, qrCodeImage } = req.body;

    driver.bankDetails = {
      accountHolderName: accountHolderName ?? driver.bankDetails?.accountHolderName ?? '',
      accountNumber: accountNumber ?? driver.bankDetails?.accountNumber ?? '',
      ifscCode: ifscCode ?? driver.bankDetails?.ifscCode ?? '',
      bankName: bankName ?? driver.bankDetails?.bankName ?? '',
      branchName: branchName ?? driver.bankDetails?.branchName ?? '',
      upiId: upiId ?? driver.bankDetails?.upiId ?? '',
      qrCodeImage: qrCodeImage ?? driver.bankDetails?.qrCodeImage ?? ''
    };

    await driver.save();

    const accNum = driver.bankDetails.accountNumber || '';
    const masked = accNum
      ? accNum.length <= 4
        ? '*'.repeat(Math.max(0, accNum.length - 0)) + accNum
        : '*'.repeat(accNum.length - 4) + accNum.slice(-4)
      : '';

    return res.json(
      formatSuccess('Bank details updated successfully', {
        accountHolderName: driver.bankDetails.accountHolderName,
        ifscCode: driver.bankDetails.ifscCode,
        bankName: driver.bankDetails.bankName,
        branchName: driver.bankDetails.branchName,
        upiId: driver.bankDetails.upiId,
        qrCodeImage: driver.bankDetails.qrCodeImage,
        accountNumberMasked: masked
      })
    );
  })
  ,getNearbyRideRequests
};
