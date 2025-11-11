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

  // Debug: Check total available drivers first
  const totalAvailableDrivers = await Driver.countDocuments({
    isAvailable: true,
    kycStatus: 'approved',
    currentRide: null
  });

  console.log('🔍 Driver Search Debug:', {
    pickupLocation: { lat: pickupLat, lng: pickupLng },
    totalAvailableDrivers: totalAvailableDrivers,
    searchRadius: '5km'
  });

  // Get all available drivers to check their locations
  const allAvailableDrivers = await Driver.find({
    isAvailable: true,
    kycStatus: 'approved',
    currentRide: null
  });
  
  console.log('📍 Available drivers locations:');
  allAvailableDrivers.forEach(driver => {
    const coords = driver.currentLocation?.coordinates;
    console.log(`  - ${driver.user?.name}: [${coords?.[0] || 'none'}, ${coords?.[1] || 'none'}] ${driver.currentLocation?.address || ''}`);
  });

  // Find nearby available drivers (within 5km radius) - CAB-F-003
  let nearbyDrivers = [];
  
  try {
    nearbyDrivers = await Driver.find({
      isAvailable: true,
      kycStatus: 'approved',
      currentRide: null,
      'currentLocation.coordinates': { $exists: true, $ne: null, $ne: [0, 0] },
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

    console.log(`✅ Geospatial query found ${nearbyDrivers.length} drivers`);
  } catch (error) {
    console.error('❌ Geospatial query failed:', error.message);
    console.log('🔄 Falling back to manual distance calculation...');
    
    // Fallback: Calculate distances manually for drivers with valid locations
    const calculateManualDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371e3; // Earth radius in meters
      const φ1 = lat1 * Math.PI / 180;
      const φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lon2 - lon1) * Math.PI / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c; // Distance in meters
    };

    nearbyDrivers = allAvailableDrivers.filter(driver => {
      const coords = driver.currentLocation?.coordinates;
      if (!coords || coords.length !== 2 || (coords[0] === 0 && coords[1] === 0)) {
        console.log(`  ⚠️ Skipping ${driver.user?.name} - invalid location`);
        return false;
      }
      
      const distance = calculateManualDistance(pickupLat, pickupLng, coords[1], coords[0]);
      console.log(`  � ${driver.user?.name} is ${(distance / 1000).toFixed(2)}km away`);
      return distance <= 5000;
    }).slice(0, 10);

    console.log(`✅ Manual calculation found ${nearbyDrivers.length} drivers within 5km`);
  }

  if (nearbyDrivers.length === 0) {
    // Update ride status if no drivers available
    ride.status = 'cancelled';
    ride.cancellationReason = 'No drivers available';
    ride.cancelledBy = 'system';
    await ride.save();

    // Create helpful error message
    let errorMessage = `No drivers available nearby.\n\n`;
    errorMessage += `📍 Your pickup location: ${pickupLat.toFixed(4)}, ${pickupLng.toFixed(4)}\n`;
    errorMessage += `👥 Total drivers online: ${totalAvailableDrivers}\n\n`;
    
    if (totalAvailableDrivers > 0) {
      errorMessage += `Possible reasons:\n`;
      const driversWithoutLocation = allAvailableDrivers.filter(d => {
        const coords = d.currentLocation?.coordinates;
        return !coords || coords.length !== 2 || (coords[0] === 0 && coords[1] === 0);
      });
      
      if (driversWithoutLocation.length > 0) {
        errorMessage += `• ${driversWithoutLocation.length} driver(s) don't have their location enabled\n`;
        errorMessage += `  Drivers: ${driversWithoutLocation.map(d => d.user?.name).join(', ')}\n`;
      }
      
      const driversWithLocation = allAvailableDrivers.filter(d => {
        const coords = d.currentLocation?.coordinates;
        return coords && coords.length === 2 && !(coords[0] === 0 && coords[1] === 0);
      });
      
      if (driversWithLocation.length > 0) {
        errorMessage += `• ${driversWithLocation.length} driver(s) are more than 5km away from you\n`;
      }
    } else {
      errorMessage += `• No drivers are currently online\n`;
    }
    
    errorMessage += `\n💡 Solution: Drivers need to turn ON their location and go ONLINE`;

    return res.status(404).json(
      formatError(errorMessage, 404)
    );
  }
  await ride.save();
  await ride.populate('rider', 'name phone rating profilePicture');

  res.status(201).json(
    formatSuccess('Ride requested. Waiting for a driver to accept the offer.', {
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
    .populate({ path: 'rider', select: 'name phone rating profilePicture', model: 'User' })
  .populate({ path: 'driver', select: 'name phone rating profilePicture', model: 'Driver' });

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

  // Support both rider and driver histories
  const isDriver = req.userRole === 'driver';
  const query = isDriver ? { driver: req.userId } : { rider: req.userId };
  if (status) {
    query.status = status;
  }

  const rides = await Ride.find(query)
    .populate({ path: 'rider', select: 'name phone rating profilePicture', model: 'User' })
  .populate({ path: 'driver', select: 'name phone rating profilePicture', model: 'Driver' })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await Ride.countDocuments(query);

  // Apply timeout auto-cancel logic for stale driver-selected rides
  const timeoutMs = 4 * 60 * 1000;
  const now = Date.now();
  for (const r of rides) {
    if (r.status === 'driver-selected' && r.driverSelectedAt) {
      const elapsed = now - new Date(r.driverSelectedAt).getTime();
      if (elapsed > timeoutMs) {
        await r.cancelRide('Driver did not accept within 4 minutes', 'system');
      }
    }
  }

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
 * Select a specific driver for the ride
 * PUT /api/rides/:id/select-driver
 */
// Deprecated manual driver selection endpoint.
// Always returns 410 to indicate feature removed in favor of auto-assignment.
const selectDriver = asyncHandler(async (req, res) => {
  return res.status(410).json(
    formatError('Manual driver selection has been removed. The system now auto-assigns drivers.', 410)
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
  const driver = await Driver.findById(ride.driver);
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
  const driverUser = await Driver.findById(ride.driver);
  if (driverUser) {
    driverUser.rating = ((driverUser.rating * driverUser.totalRatings) + rating) / (driverUser.totalRatings + 1);
    driverUser.totalRatings += 1;
    await driverUser.save();
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
  // Include 'driver-selected'. Also enforce timeout for driver-selected rides (>4 minutes without acceptance).
  let ride = await Ride.findOne({
    rider: req.userId,
    status: { $in: ['requested', 'driver-selected', 'accepted', 'driver-arrived', 'in-progress'] }
  })
    .populate({ path: 'rider', select: 'name phone rating profilePicture', model: 'User' })
  .populate({ path: 'driver', select: 'name phone rating profilePicture', model: 'Driver' });

  if (!ride) {
    return res.status(404).json(
      formatError('No active ride found', 404)
    );
  }

  // Timeout: if driver-selected for >4 minutes without acceptance, cancel automatically
  if (ride.status === 'driver-selected' && ride.driverSelectedAt) {
    const elapsedMs = Date.now() - new Date(ride.driverSelectedAt).getTime();
    const timeoutMs = 4 * 60 * 1000; // 4 minutes
    if (elapsedMs > timeoutMs) {
      await ride.cancelRide('Driver did not accept within 4 minutes', 'system');
      // Release driver if still linked
      if (ride.driver) {
        const driver = await Driver.findById(ride.driver);
        if (driver && String(driver.currentRide) === String(ride._id)) {
          driver.currentRide = null;
          driver.isAvailable = true;
          await driver.save();
        }
      }
      return res.json(formatSuccess('Ride auto-cancelled due to driver timeout', { ride }));
    }
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
  getActiveRide,
  selectDriver
};
