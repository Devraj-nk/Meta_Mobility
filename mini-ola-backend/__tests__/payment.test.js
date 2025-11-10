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

describe('Payment Controller Tests', () => {
  let riderAuth;
  let driverAuth;

  beforeAll(async () => {
    riderAuth = await createRider(app);
    driverAuth = await createDriver(app);
  });

  describe('POST /api/payments/process', () => {
    test('should reject payment without authentication', async () => {
      const res = await request(app)
        .post('/api/payments/process')
        .send({
          rideId: new mongoose.Types.ObjectId().toString(),
        });

      expect(res.status).toBe(401);
    });

    test('should reject payment for non-existent ride', async () => {
      const res = await request(app)
        .post('/api/payments/process')
        .set('Authorization', `Bearer ${riderAuth.token}`)
        .send({
          rideId: new mongoose.Types.ObjectId().toString(),
        });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/payments/:rideId', () => {
    test('should reject without authentication', async () => {
      const res = await request(app)
        .get(`/api/payments/${new mongoose.Types.ObjectId()}`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/payments/history', () => {
    test('should get empty payment history for rider', async () => {
      const res = await request(app)
        .get('/api/payments/history')
        .set('Authorization', `Bearer ${riderAuth.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.payments)).toBe(true);
    });

    test('should support pagination', async () => {
      const res = await request(app)
        .get('/api/payments/history?page=1&limit=5')
        .set('Authorization', `Bearer ${riderAuth.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('currentPage');
      expect(res.body.data).toHaveProperty('totalPages');
    });

    test('should reject without authentication', async () => {
      const res = await request(app)
        .get('/api/payments/history');

      expect(res.status).toBe(401);
    });
  });
});
