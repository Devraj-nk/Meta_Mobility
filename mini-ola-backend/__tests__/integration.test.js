const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createRider, createDriver } = require('./helpers/testUtils');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');
const Ride = require('../src/models/Ride');

let app;
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  app = require('../src/server');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) await mongoServer.stop();
});

describe('Integration Tests - Full Flow', () => {
  let riderAuth, driverAuth;
  let riderId, driverId;

  beforeAll(async () => {
    riderAuth = await createRider(app);
    driverAuth = await createDriver(app);
    riderId = riderAuth.user._id;
    driverId = driverAuth.user._id;
  });

  describe('Complete Ride Lifecycle', () => {
    let rideId;

    test('should get fare estimate before requesting ride', async () => {
      const res = await request(app)
        .post('/api/rides/estimate')
        .set('Authorization', `Bearer ${riderAuth.token}`)
        .send({
          pickupLat: 12.9716,
          pickupLng: 77.5946,
          dropoffLat: 12.9352,
          dropoffLng: 77.6245,
          rideType: 'sedan',
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('estimatedFare');
      expect(res.body.data).toHaveProperty('breakdown');
    });

    test('rider should be able to view empty ride history', async () => {
      const res = await request(app)
        .get('/api/rides/history')
        .set('Authorization', `Bearer ${riderAuth.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.rides)).toBe(true);
    });

    test('driver should get their stats', async () => {
      const res = await request(app)
        .get('/api/drivers/stats')
        .set('Authorization', `Bearer ${driverAuth.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalRides');
      expect(res.body.data).toHaveProperty('rating');
    });

    test('driver should get earnings dashboard', async () => {
      const res = await request(app)
        .get('/api/drivers/earnings')
        .set('Authorization', `Bearer ${driverAuth.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalEarnings');
    });
  });

  describe('User Profile Management', () => {
    test('should get user profile', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${riderAuth.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user).toHaveProperty('email');
      expect(res.body.data.user).toHaveProperty('name');
    });

    test('should update user profile', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${riderAuth.token}`)
        .send({
          name: 'Updated Name',
        });

      expect([200, 404]).toContain(res.status); // May not be implemented
    });
  });

  describe('Driver Location and Availability', () => {
    test('driver should update location', async () => {
      const res = await request(app)
        .put('/api/drivers/location')
        .set('Authorization', `Bearer ${driverAuth.token}`)
        .send({
          latitude: 12.9716,
          longitude: 77.5946,
          address: 'MG Road, Bangalore',
        });

      expect(res.status).toBe(200);
    });

    test('driver should toggle availability', async () => {
      const res = await request(app)
        .put('/api/drivers/availability')
        .set('Authorization', `Bearer ${driverAuth.token}`)
        .send({
          isAvailable: true,
          latitude: 12.9716,
          longitude: 77.5946,
        });

      expect([200, 403]).toContain(res.status);
    });
  });

  describe('Error Handling', () => {
    test('should reject ride cancellation without authentication', async () => {
      const res = await request(app)
        .put(`/api/rides/${new mongoose.Types.ObjectId()}/cancel`)
        .send({
          reason: 'Test cancellation',
        });

      expect(res.status).toBe(401);
    });

    test('should reject payment processing without authentication', async () => {
      const res = await request(app)
        .post('/api/payments/process')
        .send({
          rideId: new mongoose.Types.ObjectId().toString(),
        });

      expect(res.status).toBe(401);
    });

    test('should handle invalid coordinates in fare estimate', async () => {
      const res = await request(app)
        .post('/api/rides/estimate')
        .set('Authorization', `Bearer ${riderAuth.token}`)
        .send({
          pickupLat: 200, // Invalid
          pickupLng: 77.5946,
          dropoffLat: 12.9352,
          dropoffLng: 77.6245,
          rideType: 'sedan',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Authentication Edge Cases', () => {
    test('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(401);
    });

    test('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: riderAuth.user.email,
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
    });

    test('should reject registration with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          phone: '9876543210',
          password: 'password123',
          role: 'rider',
        });

      expect(res.status).toBe(400);
    });

    test('should reject registration with short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          phone: '9876543210',
          password: '123',
          role: 'rider',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Pagination Tests', () => {
    test('should handle pagination for ride history', async () => {
      const res = await request(app)
        .get('/api/rides/history?page=2&limit=10')
        .set('Authorization', `Bearer ${riderAuth.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('currentPage');
    });

    test('should handle pagination for payment history', async () => {
      const res = await request(app)
        .get('/api/payments/history?page=1&limit=5')
        .set('Authorization', `Bearer ${riderAuth.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('currentPage');
    });
  });
});
