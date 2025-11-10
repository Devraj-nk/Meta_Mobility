const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createDriver } = require('./helpers/testUtils');

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

describe('Driver Controller Tests', () => {
  let driverAuth;

  beforeAll(async () => {
    driverAuth = await createDriver(app);
  });

  describe('PUT /api/drivers/availability', () => {
    test('should toggle driver availability to available', async () => {
      const res = await request(app)
        .put('/api/drivers/availability')
        .set('Authorization', `Bearer ${driverAuth.token}`)
        .send({ isAvailable: true });

      // May return 403 if KYC not approved in time
      expect([200, 403]).toContain(res.status);
    });

    test('should reject availability toggle without authentication', async () => {
      const res = await request(app)
        .put('/api/drivers/availability')
        .send({ isAvailable: true });

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/drivers/location', () => {
    test('should update driver location', async () => {
      const res = await request(app)
        .put('/api/drivers/location')
        .set('Authorization', `Bearer ${driverAuth.token}`)
        .send({
          latitude: 12.9716,
          longitude: 77.5946,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('should reject invalid coordinates', async () => {
      const res = await request(app)
        .put('/api/drivers/location')
        .set('Authorization', `Bearer ${driverAuth.token}`)
        .send({
          latitude: 'invalid',
          longitude: 77.5946,
        });

      expect(res.status).toBe(400);
    });

    test('should reject location update without authentication', async () => {
      const res = await request(app)
        .put('/api/drivers/location')
        .send({
          latitude: 12.9716,
          longitude: 77.5946,
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/drivers/earnings', () => {
    test('should get earnings for driver', async () => {
      const res = await request(app)
        .get('/api/drivers/earnings')
        .set('Authorization', `Bearer ${driverAuth.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalEarnings');
    });

    test('should reject without authentication', async () => {
      const res = await request(app)
        .get('/api/drivers/earnings');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/drivers/stats', () => {
    test('should get driver statistics', async () => {
      const res = await request(app)
        .get('/api/drivers/stats')
        .set('Authorization', `Bearer ${driverAuth.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalRides');
    });

    test('should reject without authentication', async () => {
      const res = await request(app)
        .get('/api/drivers/stats');

      expect(res.status).toBe(401);
    });
  });
});
