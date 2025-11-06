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
  const driver = await Driver.findOne({ user: req.userId });

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

  // Find requested rides within 5km of driver location
  // Optionally match by vehicle type (simple mapping: rideType === vehicleType)
  const filter = {
    status: 'requested',
    rideType: driver.vehicleType,
    pickupLocation: {
      $near: {
        $geometry: { type: 'Point', coordinates: coords },
        $maxDistance: 5000
      }
    }
  };

  const requests = await Ride.find(filter)
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('rider', 'name phone rating');

  return res.json(formatSuccess('Nearby ride requests', { requests }));
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

  const driver = await Driver.findOne({ user: req.userId });

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

  // Update availability
  driver.isAvailable = isAvailable;

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
      `Driver is now ${isAvailable ? 'online' : 'offline'}`,
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

  const driver = await Driver.findOne({ user: req.userId });

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
  const driver = await Driver.findOne({ user: req.userId });

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
    .populate('rider', 'name phone rating profilePicture')
    .populate('driver', 'name phone rating profilePicture');

  res.json(
    formatSuccess('Active ride retrieved successfully', { ride })
  );
});

/**
 * Accept ride request
 * PUT /api/drivers/rides/:id/accept
 */
const acceptRide = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const driver = await Driver.findOne({ user: req.userId });

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

  // Atomically set driver if ride is still requested (race-safe)
  const ride = await Ride.findOneAndUpdate(
    { _id: id, status: 'requested', driver: null },
    { $set: { driver: req.userId, status: 'accepted' } },
    { new: true }
  );

  if (!ride) {
    return res.status(409).json(
      formatError('Ride already accepted or not available', 409)
    );
  }

  // Update driver
  driver.currentRide = ride._id;
  driver.isAvailable = false;
  await driver.save();

  await ride.populate('rider', 'name phone rating profilePicture');

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

  // In real app, would reassign to another driver
  // For now, just cancel the ride
  await ride.cancelRide(reason || 'Rejected by driver', 'driver');

  res.json(
    formatSuccess('Ride rejected', { ride })
  );
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

  // Verify OTP
  if (!ride.verifyOTP(otp)) {
    return res.status(400).json(
      formatError('Invalid OTP', 400)
    );
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
  const driver = await Driver.findOne({ user: req.userId });
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
  const driver = await Driver.findOne({ user: req.userId })
    .populate('user', 'name rating');

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
        name: driver.user.name,
        rating: driver.user.rating,
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
  const driver = await Driver.findOne({ user: req.userId })
    .populate('user', 'name rating totalRatings');

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
      rating: driver.user.rating,
      totalRatings: driver.user.totalRatings,
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
    .populate('user', 'name email phone role')
    .populate('currentRide')
    .select('isAvailable kycStatus currentLocation currentRide vehicleType vehicleNumber');

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
      userId: driver.user?._id,
      name: driver.user?.name || 'Unknown',
      email: driver.user?.email,
      phone: driver.user?.phone,
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
  const driver = await Driver.findOne({ user: req.userId });

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
  getNearbyRideRequests
};
