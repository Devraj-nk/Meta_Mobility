/**
 * Fare Calculation Utility
 * Implements CAB-F-004: Display Fare Estimate
 * Based on distance, time, ride type, and surge pricing
 */

// Base fares from environment or defaults
const BASE_FARES = {
  bike: parseFloat(process.env.BASE_FARE_BIKE) || 30,
  mini: parseFloat(process.env.BASE_FARE_MINI) || 50,
  sedan: parseFloat(process.env.BASE_FARE_SEDAN) || 80,
  suv: parseFloat(process.env.BASE_FARE_SUV) || 120
};

const FARE_PER_KM = parseFloat(process.env.FARE_PER_KM) || 12;
const FARE_PER_MINUTE = parseFloat(process.env.FARE_PER_MINUTE) || 2;

/**
 * Calculate fare estimate
 * @param {string} rideType - Type of ride (bike, mini, sedan, suv)
 * @param {number} distance - Distance in kilometers
 * @param {number} estimatedTime - Estimated time in minutes
 * @param {number} surgeMultiplier - Surge pricing multiplier (default 1.0)
 * @param {boolean} isGroupRide - Whether it's a group ride
 * @returns {object} Fare breakdown
 */
function calculateFare(rideType, distance, estimatedTime, surgeMultiplier = 1.0, isGroupRide = false) {
  // Validate inputs
  if (!BASE_FARES[rideType]) {
    throw new Error(`Invalid ride type: ${rideType}`);
  }

  if (distance < 0 || estimatedTime < 0) {
    throw new Error('Distance and time must be positive');
  }

  // Calculate components
  const baseFare = BASE_FARES[rideType];
  const distanceFare = distance * FARE_PER_KM;
  const timeFare = estimatedTime * FARE_PER_MINUTE;

  // Calculate subtotal before surge
  let subtotal = baseFare + distanceFare + timeFare;

  // Apply surge pricing
  const surgeAmount = subtotal * (surgeMultiplier - 1);
  subtotal = subtotal * surgeMultiplier;

  // Apply group ride discount (20% off if group ride)
  let groupDiscount = 0;
  if (isGroupRide) {
    groupDiscount = subtotal * 0.20;
    subtotal -= groupDiscount;
  }

  // Round to 2 decimal places
  const total = Math.round(subtotal * 100) / 100;

  return {
    baseFare: Math.round(baseFare * 100) / 100,
    distanceFare: Math.round(distanceFare * 100) / 100,
    timeFare: Math.round(timeFare * 100) / 100,
    surgeMultiplier,
    surgeAmount: Math.round(surgeAmount * 100) / 100,
    groupDiscount: Math.round(groupDiscount * 100) / 100,
    estimatedFare: total,
    breakdown: {
      rideType,
      distance: `${distance} km`,
      estimatedTime: `${estimatedTime} min`,
      isGroupRide
    }
  };
}

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number} Radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Estimate time based on distance (assuming average speed of 30 km/h)
 * @param {number} distance - Distance in kilometers
 * @returns {number} Estimated time in minutes
 */
function estimateTime(distance) {
  const averageSpeed = 30; // km/h
  const timeInHours = distance / averageSpeed;
  const timeInMinutes = timeInHours * 60;
  return Math.round(timeInMinutes);
}

/**
 * Calculate current surge multiplier based on demand
 * @param {number} activeRides - Number of active rides
 * @param {number} availableDrivers - Number of available drivers
 * @returns {number} Surge multiplier
 */
function calculateSurgeMultiplier(activeRides, availableDrivers) {
  if (availableDrivers === 0) {
    return 2.0; // Maximum surge
  }

  const demandRatio = activeRides / availableDrivers;

  if (demandRatio > 3) {
    return 2.0;
  } else if (demandRatio > 2) {
    return 1.8;
  } else if (demandRatio > 1.5) {
    return 1.5;
  } else if (demandRatio > 1) {
    return 1.3;
  } else {
    return 1.0;
  }
}

module.exports = {
  calculateFare,
  calculateDistance,
  estimateTime,
  calculateSurgeMultiplier,
  BASE_FARES
};
