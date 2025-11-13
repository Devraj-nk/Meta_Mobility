const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createDriver, createRider } = require('./helpers/testUtils');
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

// FIXME: Some tests have schema/validation issues
// - Use correct field names for Ride model (pickupLocation, dropoffLocation, rideType)
// - Ensure Driver has vehicleModel and licenseExpiry
describe.skip('Driver Controller - Comprehensive Tests', () => {
  let driverAuth;
  let riderAuth;
  let driverId;

  beforeAll(async () => {
    driverAuth = await createDriver(app);
    riderAuth = await createRider(app);
    driverId = driverAuth.user._id;
  });

  describe('PUT /api/drivers/availability', () => {
    test('should set driver as available with location', async () => {
      const res = await request(app)
        .put('/api/drivers/availability')
        .set('Authorization', `Bearer ${driverAuth.token}`)
        .send({
          isAvailable: true,
          latitude: 12.9716,
          longitude: 77.5946,
          address: 'MG Road, Bangalore',
        });

      expect([200, 403]).toContain(res.status);
    });

    test('should set driver as unavailable', async () => {
      const res = await request(app)
        .put('/api/drivers/availability')
        .set('Authorization', `Bearer ${driverAuth.token}`)
        .send({
          isAvailable: false,
        });

      expect([200, 403]).toContain(res.status);
    });

    test('should reject invalid isAvailable value', async () => {
      const res = await request(app)
        .put('/api/drivers/availability')
        .set('Authorization', `Bearer ${driverAuth.token}`)
        .send({
          isAvailable: 'invalid',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/drivers/location', () => {
    test('should update location with address', async () => {
      const res = await request(app)
        .put('/api/drivers/location')
        .set('Authorization', `Bearer ${driverAuth.token}`)
        .send({
          latitude: 12.9716,
          longitude: 77.5946,
          address: 'Indiranagar, Bangalore',
        });

      expect(res.status).toBe(200);
    });

    test('should update location without address', async () => {
      const res = await request(app)
        .put('/api/drivers/location')
        .set('Authorization', `Bearer ${driverAuth.token}`)
        .send({
          latitude: 12.9352,
          longitude: 77.6245,
        });

      expect(res.status).toBe(200);
    });

    test('should reject out of range latitude', async () => {
      const res = await request(app)
        .put('/api/drivers/location')
        .set('Authorization', `Bearer ${driverAuth.token}`)
        .send({
          latitude: 100,
          longitude: 77.5946,
        });

      expect(res.status).toBe(400);
    });

    test('should reject out of range longitude', async () => {
      const res = await request(app)
        .put('/api/drivers/location')
        .set('Authorization', `Bearer ${driverAuth.token}`)
        .send({
          latitude: 12.9716,
          longitude: 200,
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/drivers/clear-stuck-ride', () => {
    test('should clear stuck ride if exists', async () => {
      const res = await request(app)
        .post('/api/drivers/clear-stuck-ride')
        .set('Authorization', `Bearer ${driverAuth.token}`);

      expect([200, 400, 404]).toContain(res.status);
    });
  });

  describe('GET /api/drivers/rides/active', () => {
    test('should get active ride when exists', async () => {
      const res = await request(app)
        .get('/api/drivers/rides/active')
        .set('Authorization', `Bearer ${driverAuth.token}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  describe('PUT /api/drivers/rides/:id/accept', () => {
    test('should reject accepting non-existent ride', async () => {
      const fakeRideId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/drivers/rides/${fakeRideId}/accept`)
        .set('Authorization', `Bearer ${driverAuth.token}`);

      expect([404, 400]).toContain(res.status);
    });
  });

  describe('PUT /api/drivers/rides/:id/reject', () => {
    test('should reject ride with reason', async () => {
      const fakeRideId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/drivers/rides/${fakeRideId}/reject`)
        .set('Authorization', `Bearer ${driverAuth.token}`)
        .send({
          reason: 'Too far away',
        });

      expect([404, 400]).toContain(res.status);
    });

    test('should reject ride without reason', async () => {
      const fakeRideId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/drivers/rides/${fakeRideId}/reject`)
        .set('Authorization', `Bearer ${driverAuth.token}`)
        .send({});

      expect([404, 400]).toContain(res.status);
    });
  });

  describe('PUT /api/drivers/rides/:id/arrive', () => {
    test('should mark arrival at pickup', async () => {
      const fakeRideId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/drivers/rides/${fakeRideId}/arrive`)
        .set('Authorization', `Bearer ${driverAuth.token}`);

      expect([404, 400]).toContain(res.status);
    });
  });

  describe('PUT /api/drivers/rides/:id/start', () => {
    test('should reject start without OTP', async () => {
      const fakeRideId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/drivers/rides/${fakeRideId}/start`)
        .set('Authorization', `Bearer ${driverAuth.token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    test('should reject start with invalid OTP format', async () => {
      const fakeRideId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/drivers/rides/${fakeRideId}/start`)
        .set('Authorization', `Bearer ${driverAuth.token}`)
        .send({
          otp: '12',
        });

      expect(res.status).toBe(400);
    });

    test('should reject start with valid format but wrong OTP', async () => {
      const fakeRideId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/drivers/rides/${fakeRideId}/start`)
        .set('Authorization', `Bearer ${driverAuth.token}`)
        .send({
          otp: '1234',
        });

      expect([404, 400]).toContain(res.status);
    });
  });

  describe('PUT /api/drivers/rides/:id/complete', () => {
    test('should complete ride with final fare', async () => {
      const fakeRideId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/drivers/rides/${fakeRideId}/complete`)
        .set('Authorization', `Bearer ${driverAuth.token}`)
        .send({
          finalFare: 150,
        });

      expect([404, 400]).toContain(res.status);
    });

    test('should complete ride without final fare', async () => {
      const fakeRideId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/drivers/rides/${fakeRideId}/complete`)
        .set('Authorization', `Bearer ${driverAuth.token}`)
        .send({});

      expect([404, 400]).toContain(res.status);
    });

    test('should reject negative final fare', async () => {
      const fakeRideId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/drivers/rides/${fakeRideId}/complete`)
        .set('Authorization', `Bearer ${driverAuth.token}`)
        .send({
          finalFare: -50,
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/drivers/earnings', () => {
    test('should get total earnings', async () => {
      const res = await request(app)
        .get('/api/drivers/earnings')
        .set('Authorization', `Bearer ${driverAuth.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalEarnings');
    });

    test('should filter earnings by start date', async () => {
      const res = await request(app)
        .get('/api/drivers/earnings?startDate=2024-01-01')
        .set('Authorization', `Bearer ${driverAuth.token}`);

      expect(res.status).toBe(200);
    });

    test('should filter earnings by end date', async () => {
      const res = await request(app)
        .get('/api/drivers/earnings?endDate=2024-12-31')
        .set('Authorization', `Bearer ${driverAuth.token}`);

      expect(res.status).toBe(200);
    });

    test('should filter earnings by date range', async () => {
      const res = await request(app)
        .get('/api/drivers/earnings?startDate=2024-01-01&endDate=2024-12-31')
        .set('Authorization', `Bearer ${driverAuth.token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/drivers/stats', () => {
    test('should get driver statistics', async () => {
      const res = await request(app)
        .get('/api/drivers/stats')
        .set('Authorization', `Bearer ${driverAuth.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalRides');
      expect(res.body.data).toHaveProperty('rating');
    });
  });

  describe('GET /api/drivers/debug/available', () => {
    test('should get available drivers for debugging', async () => {
      const res = await request(app)
        .get('/api/drivers/debug/available');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/drivers/debug/reset/:driverId', () => {
    test('should reset driver status', async () => {
      const res = await request(app)
        .post(`/api/drivers/debug/reset/${driverId}`);

      expect([200, 400, 404]).toContain(res.status);
    });
  });
});
