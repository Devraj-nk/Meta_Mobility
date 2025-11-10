const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createRider, createDriver } = require('./helpers/testUtils');

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

describe('Ride Controller Tests', () => {
  let riderAuth;
  let driverAuth;

  beforeAll(async () => {
    riderAuth = await createRider(app);
    driverAuth = await createDriver(app);
  });

  describe('POST /api/rides/estimate', () => {
    test('should estimate fare for a valid route', async () => {
      const res = await request(app)
        .post('/api/rides/estimate')
        .set('Authorization', `Bearer ${riderAuth.token}`)
        .send({
          pickupLat: 12.9716,
          pickupLng: 77.5946,
          dropoffLat: 12.2958,
          dropoffLng: 76.6394,
          rideType: 'sedan',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('estimatedFare');
    });

    test('should reject estimate without authentication', async () => {
      const res = await request(app)
        .post('/api/rides/estimate')
        .send({
          pickupLat: 12.9716,
          pickupLng: 77.5946,
          dropoffLat: 12.2958,
          dropoffLng: 76.6394,
          rideType: 'sedan',
        });

      expect(res.status).toBe(401);
    });

    test('should reject estimate with invalid rideType', async () => {
      const res = await request(app)
        .post('/api/rides/estimate')
        .set('Authorization', `Bearer ${riderAuth.token}`)
        .send({
          pickupLat: 12.9716,
          pickupLng: 77.5946,
          dropoffLat: 12.2958,
          dropoffLng: 76.6394,
          rideType: 'invalid',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/rides/request', () => {
    test('should create a ride request', async () => {
      const res = await request(app)
        .post('/api/rides/request')
        .set('Authorization', `Bearer ${riderAuth.token}`)
        .send({
          pickupLat: 12.9716,
          pickupLng: 77.5946,
          pickupAddress: 'MG Road, Bangalore',
          dropoffLat: 12.9352,
          dropoffLng: 77.6245,
          dropoffAddress: 'Indiranagar, Bangalore',
          rideType: 'sedan',
        });

      // Will return 404 if no drivers available, which is expected in test env
      expect([201, 404]).toContain(res.status);
    });

    test('should reject ride request without authentication', async () => {
      const res = await request(app)
        .post('/api/rides/request')
        .send({
          pickupLat: 12.9716,
          pickupLng: 77.5946,
          pickupAddress: 'MG Road, Bangalore',
          dropoffLat: 12.9352,
          dropoffLng: 77.6245,
          dropoffAddress: 'Indiranagar, Bangalore',
          rideType: 'sedan',
        });

      expect(res.status).toBe(401);
    });

    test('should reject ride request from driver', async () => {
      const res = await request(app)
        .post('/api/rides/request')
        .set('Authorization', `Bearer ${driverAuth.token}`)
        .send({
          pickupLat: 12.9716,
          pickupLng: 77.5946,
          pickupAddress: 'MG Road, Bangalore',
          dropoffLat: 12.9352,
          dropoffLng: 77.6245,
          dropoffAddress: 'Indiranagar, Bangalore',
          rideType: 'sedan',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/rides/active', () => {
    test('should get active ride for rider', async () => {
      const res = await request(app)
        .get('/api/rides/active')
        .set('Authorization', `Bearer ${riderAuth.token}`);

      // Will return 404 if no active ride, or 200 if found
      expect([200, 404]).toContain(res.status);
    });

    test('should reject without authentication', async () => {
      const res = await request(app)
        .get('/api/rides/active');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/rides/history', () => {
    test('should get ride history for rider', async () => {
      const res = await request(app)
        .get('/api/rides/history')
        .set('Authorization', `Bearer ${riderAuth.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.rides)).toBe(true);
    });

    test('should support pagination', async () => {
      const res = await request(app)
        .get('/api/rides/history?page=1&limit=5')
        .set('Authorization', `Bearer ${riderAuth.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('currentPage');
      expect(res.body.data).toHaveProperty('totalPages');
    });

    test('should reject without authentication', async () => {
      const res = await request(app)
        .get('/api/rides/history');

      expect(res.status).toBe(401);
    });
  });
});
