const request = require('supertest');
const jwt = require('jsonwebtoken');
const { startMemoryMongo, close, clear } = require('../helpers/testDb');
let app;
const User = require('../../src/models/User');
const Driver = require('../../src/models/Driver');
const Ride = require('../../src/models/Ride');
const { generateToken } = require('../../src/utils/helpers');

// Helper to create auth header
function authHeader(id, role) {
  const token = generateToken(id, role);
  return { Authorization: `Bearer ${token}` };
}

describe('DELETE /api/auth/account', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
    await startMemoryMongo();
    // Require app AFTER MONGODB_URI is set so server connects to memory DB
    app = require('../../src/server');
  });

  afterAll(async () => {
    await close();
  });

  afterEach(async () => {
    await clear();
  });

  test('soft-deletes rider account when no active ride', async () => {
    const rider = await User.create({
      name: 'Rider One',
      email: 'rider1@example.com',
      phone: '9999999990',
      password: 'password123',
      role: 'rider'
    });

    const res = await request(app)
      .delete('/api/auth/account')
      .set(authHeader(rider._id, 'rider'));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await User.findById(rider._id).select('+password');
    expect(updated).toBeTruthy();
    expect(updated.isActive).toBe(false);
    expect(updated.email).toMatch(/deleted\+/);
    expect(updated.phone).not.toBe('9999999990');
  });

  test('blocks rider deletion with active ride', async () => {
    const rider = await User.create({
      name: 'Rider Two',
      email: 'rider2@example.com',
      phone: '9999999991',
      password: 'password123',
      role: 'rider'
    });

    await Ride.create({
      rider: rider._id,
      rideType: 'mini',
      pickupLocation: { type: 'Point', coordinates: [77.1, 12.9], address: 'A' },
      dropoffLocation: { type: 'Point', coordinates: [77.2, 12.95], address: 'B' },
      fare: { estimatedFare: 100 },
      status: 'requested'
    });

    const res = await request(app)
      .delete('/api/auth/account')
      .set(authHeader(rider._id, 'rider'));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Cannot delete account while a ride is active/);
  });

  test('soft-deletes driver account when no active ride', async () => {
    const driver = await Driver.create({
      name: 'Driver One',
      email: 'driver1@example.com',
      phone: '8888888880',
      password: 'password123',
      role: 'driver',
      vehicleType: 'mini',
      vehicleNumber: 'KA01AB1234',
      vehicleModel: 'Model X',
      vehicleColor: 'Black',
      licenseNumber: 'LIC12345',
      licenseExpiry: new Date(Date.now() + 86400000)
    });

    const res = await request(app)
      .delete('/api/auth/account')
      .set(authHeader(driver._id, 'driver'));

    expect(res.status).toBe(200);
    const updated = await Driver.findById(driver._id);
    expect(updated.isActive).toBe(false);
    expect(updated.email).toMatch(/deleted\+/);
    expect(updated.phone).not.toBe('8888888880');
  });

  test('blocks driver deletion with active ride by currentRide', async () => {
    const driver = await Driver.create({
      name: 'Driver Two',
      email: 'driver2@example.com',
      phone: '8888888881',
      password: 'password123',
      role: 'driver',
      vehicleType: 'mini',
      vehicleNumber: 'KA01AB5678',
      vehicleModel: 'Model Y',
      vehicleColor: 'White',
      licenseNumber: 'LIC67890',
      licenseExpiry: new Date(Date.now() + 86400000)
    });

    const ride = await Ride.create({
      rider: (await User.create({
        name: 'Temp Rider',
        email: 'temprider@example.com',
        phone: '9999999992',
        password: 'password123',
        role: 'rider'
      }))._id,
      driver: driver._id,
      rideType: 'mini',
      pickupLocation: { type: 'Point', coordinates: [77.1, 12.9], address: 'A' },
      dropoffLocation: { type: 'Point', coordinates: [77.2, 12.95], address: 'B' },
      fare: { estimatedFare: 120 },
      status: 'in-progress'
    });

    driver.currentRide = ride._id;
    await driver.save();

    const res = await request(app)
      .delete('/api/auth/account')
      .set(authHeader(driver._id, 'driver'));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Cannot delete account while a ride is active/);
  });
});
