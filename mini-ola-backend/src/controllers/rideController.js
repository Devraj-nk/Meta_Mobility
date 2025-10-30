const Ride = require('../models/Ride');
const User = require('../models/User');
const Driver = require('../models/Driver');
const { formatSuccess, formatError, formatLocation } = require('../utils/helpers');
const { calculateDistance, estimateTime, calculateFare, calculateSurgeMultiplier } = require('../utils/fareCalculator');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Ride Controller
 * Implements CAB-F-002, CAB-F-003, CAB-F-004, CAB-F-008
 */

/**
 * Get fare estimate
 * POST /api/rides/estimate
 * Implements CAB-F-004
 */
const getFareEstimate = asyncHandler(async (req, res) => {
  const {
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    rideType,
    isGroupRide
  } = req.body;

  // Calculate distance
  const distance = calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
  
  // Estimate time
  const estimatedTime = estimateTime(distance);

  // Calculate surge multiplier based on current demand
  const activeRidesCount = await Ride.countDocuments({ 
    status: { $in: ['requested', 'accepted', 'in-progress'] } 
  });
  const availableDriversCount = await Driver.countDocuments({ 
    isAvailable: true,
    kycStatus: 'approved'
  });
  
  const surgeMultiplier = calculateSurgeMultiplier(activeRidesCount, availableDriversCount);

  // Calculate fare
  const fareDetails = calculateFare(
    rideType,
    distance,
    estimatedTime,
    surgeMultiplier,
    isGroupRide || false
  );

  res.json(
    formatSuccess('Fare estimated successfully', fareDetails)
  );
});

/**
 * Request a ride
 * POST /api/rides/request
 * Implements CAB-F-002, CAB-F-003
 */
const requestRide = asyncHandler(async (req, res) => {
  const {
    pickupLat,
    pickupLng,
    pickupAddress,
    dropoffLat,
    dropoffLng,
    dropoffAddress,
    rideType,
    isGroupRide,
    scheduledTime
  } = req.body;

  // Calculate distance and fare
  const distance = calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
  const estimatedTime = estimateTime(distance);

  // Calculate surge
  const activeRidesCount = await Ride.countDocuments({ 
    status: { $in: ['requested', 'accepted', 'in-progress'] } 
  });
  const availableDriversCount = await Driver.countDocuments({ 
    isAvailable: true,
    kycStatus: 'approved'
  });
  const surgeMultiplier = calculateSurgeMultiplier(activeRidesCount, availableDriversCount);

  // Calculate fare
  const fareDetails = calculateFare(rideType, distance, estimatedTime, surgeMultiplier, isGroupRide);

  // Create ride
  const ride = await Ride.create({
    rider: req.userId,
    rideType,
    isGroupRide: isGroupRide || false,
    pickupLocation: formatLocation(pickupLng, pickupLat, pickupAddress),
    dropoffLocation: formatLocation(dropoffLng, dropoffLat, dropoffAddress),
    fare: {
      estimatedFare: fareDetails.estimatedFare,
      baseFare: fareDetails.baseFare,
      distanceFare: fareDetails.distanceFare,
      timeFare: fareDetails.timeFare,
      surgeMultiplier: surgeMultiplier
    },
    distance,
    duration: {
      estimated: estimatedTime
    },
    scheduledTime: scheduledTime || null,
    status: 'requested'
  });

  // Generate OTP
  await ride.generateOTP();

  // Find nearby available drivers (within 5km radius) - CAB-F-003
  const nearbyDrivers = await Driver.find({
    isAvailable: true,
    kycStatus: 'approved',
    currentRide: null,
    currentLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [pickupLng, pickupLat]
        },
        $maxDistance: 5000 // 5km in meters
      }
    }
  }).limit(10).populate('user', 'name phone rating');

  if (nearbyDrivers.length === 0) {
    // Update ride status if no drivers available
    ride.status = 'cancelled';
    ride.cancellationReason = 'No drivers available';
    ride.cancelledBy = 'system';
    await ride.save();

    return res.status(404).json(
      formatError('No drivers available nearby. Please try again later.', 404)
    );
  }

  // Auto-assign to nearest driver
  const assignedDriver = nearbyDrivers[0];
  ride.driver = assignedDriver.user;
  ride.status = 'accepted';
  await ride.save();

  // Update driver status
  assignedDriver.currentRide = ride._id;
  assignedDriver.isAvailable = false;
  await assignedDriver.save();

  // Populate rider and driver details
  await ride.populate('rider', 'name phone rating profilePicture');
  await ride.populate('driver', 'name phone rating profilePicture');

  res.status(201).json(
    formatSuccess('Ride requested and driver assigned successfully', {
      ride: ride,
      otp: ride.otp,
      nearbyDriversCount: nearbyDrivers.length
    })
  );
});

/**
 * Get ride details
 * GET /api/rides/:id
 */
const getRideDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const ride = await Ride.findById(id)
    .populate('rider', 'name phone rating profilePicture')
    .populate('driver', 'name phone rating profilePicture');

  if (!ride) {
    return res.status(404).json(
      formatError('Ride not found', 404)
    );
  }

  // Check if user is authorized to view this ride
  if (ride.rider._id.toString() !== req.userId.toString() && 
      ride.driver?._id.toString() !== req.userId.toString() &&
      req.userRole !== 'admin') {
    return res.status(403).json(
      formatError('Not authorized to view this ride', 403)
    );
  }

  res.json(
    formatSuccess('Ride details retrieved successfully', { ride })
  );
});

/**
 * Get ride history
 * GET /api/rides/history
 * Implements CAB-F-009
 */
const getRideHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  
  const query = { rider: req.userId };
  if (status) {
    query.status = status;
  }

  const rides = await Ride.find(query)
    .populate('driver', 'name phone rating')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await Ride.countDocuments(query);

  res.json(
    formatSuccess('Ride history retrieved successfully', {
      rides,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalRides: count
    })
  );
});

/**
 * Cancel ride
 * PUT /api/rides/:id/cancel
 */
const cancelRide = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const ride = await Ride.findById(id);

  if (!ride) {
    return res.status(404).json(
      formatError('Ride not found', 404)
    );
  }

  // Check if user is authorized
  if (ride.rider.toString() !== req.userId.toString() && req.userRole !== 'admin') {
    return res.status(403).json(
      formatError('Not authorized to cancel this ride', 403)
    );
  }

  // Check if ride can be cancelled
  if (ride.status === 'completed' || ride.status === 'cancelled') {
    return res.status(400).json(
      formatError(`Cannot cancel ${ride.status} ride`, 400)
    );
  }

  // Cancel ride
  await ride.cancelRide(reason || 'Cancelled by rider', 'rider');

  // Update driver availability if driver was assigned
  if (ride.driver) {
    const driver = await Driver.findOne({ user: ride.driver });
    if (driver) {
      driver.currentRide = null;
      driver.isAvailable = true;
      await driver.save();
    }
  }

  res.json(
    formatSuccess('Ride cancelled successfully', { ride })
  );
});

/**
 * Rate completed ride
 * POST /api/rides/:id/rate
 */
const rateRide = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, feedback } = req.body;

  const ride = await Ride.findById(id);

  if (!ride) {
    return res.status(404).json(
      formatError('Ride not found', 404)
    );
  }

  // Check if ride is completed
  if (ride.status !== 'completed') {
    return res.status(400).json(
      formatError('Can only rate completed rides', 400)
    );
  }

  // Check if user is the rider
  if (ride.rider.toString() !== req.userId.toString()) {
    return res.status(403).json(
      formatError('Only the rider can rate this ride', 403)
    );
  }

  // Check if already rated
  if (ride.rating.riderRating?.rating) {
    return res.status(400).json(
      formatError('Ride already rated', 400)
    );
  }

  // Add rating
  ride.rating.riderRating = {
    rating,
    feedback: feedback || ''
  };
  await ride.save();

  // Update driver rating
  const driverUser = await User.findById(ride.driver);
  if (driverUser) {
    await driverUser.updateRating(rating);
  }

  res.json(
    formatSuccess('Ride rated successfully', { ride })
  );
});

/**
 * Get active ride
 * GET /api/rides/active
 */
const getActiveRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findOne({
    rider: req.userId,
    status: { $in: ['requested', 'accepted', 'driver-arrived', 'in-progress'] }
  })
    .populate('rider', 'name phone rating profilePicture')
    .populate('driver', 'name phone rating profilePicture');

  if (!ride) {
    return res.status(404).json(
      formatError('No active ride found', 404)
    );
  }

  res.json(
    formatSuccess('Active ride retrieved successfully', { ride })
  );
});

module.exports = {
  getFareEstimate,
  requestRide,
  getRideDetails,
  getRideHistory,
  cancelRide,
  rateRide,
  getActiveRide
};
