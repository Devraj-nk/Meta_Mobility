const request = require('supertest');

/**
 * Register a user and return auth token
 */
async function registerUser(app, userData) {
  const res = await request(app)
    .post('/api/auth/register')
    .send(userData);
  
  return {
    user: res.body.data.user,
    token: res.body.data.token,
  };
}

/**
 * Login and return auth token
 */
async function loginUser(app, credentials) {
  const res = await request(app)
    .post('/api/auth/login')
    .send(credentials);
  
  return {
    user: res.body.data.user,
    token: res.body.data.token,
  };
}

/**
 * Create a driver with KYC details
 */
async function createDriver(app) {
  const Driver = require('../../src/models/Driver');
  
  const driverData = {
    name: `Driver ${Date.now()}`,
    email: `driver${Date.now()}@example.com`,
    phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
    password: 'password123',
    role: 'driver',
    vehicleType: 'sedan',
    vehicleNumber: `KA01${Math.floor(1000 + Math.random() * 9000)}`,
    vehicleModel: 'Honda City',
    vehicleColor: 'White',
    licenseNumber: `DL${Date.now()}`,
    licenseExpiry: '2026-12-31',
  };

  const auth = await registerUser(app, driverData);
  
  // Verify driver KYC manually
  await Driver.findByIdAndUpdate(auth.user._id, {
    kycStatus: 'approved',
    isAvailable: true,
  });
  
  return auth;
}

/**
 * Create a rider
 */
async function createRider(app) {
  const riderData = {
    name: `Rider ${Date.now()}`,
    email: `rider${Date.now()}@example.com`,
    phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
    password: 'password123',
    role: 'rider',
  };

  return await registerUser(app, riderData);
}

module.exports = {
  registerUser,
  loginUser,
  createDriver,
  createRider,
};
