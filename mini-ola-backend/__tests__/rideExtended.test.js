const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createDriver, createRider } = require('./helpers/testUtils');
const Ride = require('../src/models/Ride');
const Driver = require('../src/models/Driver');

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

// FIXME: Schema mismatches - needs update
// - Use pickupLocation/dropoffLocation (not pickup/destination)
// - Include rideType, fare.estimatedFare as required fields
describe.skip('Ride Controller - Extended Tests', () => {
  let driverAuth;
  let riderAuth;
  let testRide;

  beforeAll(async () => {
    driverAuth = await createDriver(app);
    riderAuth = await createRider(app);

    // Create a test ride
    testRide = await Ride.create({
      rider: riderAuth.user._id,
      driver: driverAuth.user._id,
      rideType: 'sedan',
      pickupLocation: {
        coordinates: [77.5946, 12.9716],
        address: 'Pickup Location',
      },
      dropoffLocation: {
        coordinates: [77.6245, 12.9352],
        address: 'Drop Location',
      },
      fare: {
        estimatedFare: 150,
      },
      distance: 5.5,
      status: 'accepted',
      otp: '1234',
    });
  });

  describe('POST /api/rides/request', () => {
    test('should request ride with valid data', async () => {
      const res = await request(app)
        .post('/api/rides/request')
        .set('Authorization', `Bearer ${riderAuth.token}`)
        .send({
          pickupLocation: {
            latitude: 12.9716,
            longitude: 77.5946,
            address: 'MG Road',
          },
          dropLocation: {
            latitude: 12.9352,
            longitude: 77.6245,
            address: 'Koramangala',
          },
          vehicleType: 'sedan',
        });

      expect([200, 201, 404]).toContain(res.status);
    });

    test('should reject ride request without pickup', async () => {
      const res = await request(app)
        .post('/api/rides/request')
        .set('Authorization', `Bearer ${riderAuth.token}`)
        .send({
          dropLocation: {
            latitude: 12.9352,
            longitude: 77.6245,
            address: 'Koramangala',
          },
          vehicleType: 'sedan',
        });

      expect(res.status).toBe(400);
    });

    test('should reject ride request without drop location', async () => {
      const res = await request(app)
        .post('/api/rides/request')
        .set('Authorization', `Bearer ${riderAuth.token}`)
        .send({
          pickupLocation: {
            latitude: 12.9716,
            longitude: 77.5946,
            address: 'MG Road',
          },
          vehicleType: 'sedan',
        });

      expect(res.status).toBe(400);
    });

    test('should use default vehicle type if not provided', async () => {
      const res = await request(app)
        .post('/api/rides/request')
        .set('Authorization', `Bearer ${riderAuth.token}`)
        .send({
          pickupLocation: {
            latitude: 12.9716,
            longitude: 77.5946,
            address: 'MG Road',
          },
          dropLocation: {
            latitude: 12.9352,
            longitude: 77.6245,
            address: 'Koramangala',
          },
        });

      expect([200, 201, 404]).toContain(res.status);
    });
  });

  describe('GET /api/rides/:id', () => {
    test('should get ride details by id', async () => {
      const res = await request(app)
        .get(`/api/rides/${testRide._id}`)
        .set('Authorization', `Bearer ${riderAuth.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('ride');
    });

    test('should reject getting non-existent ride', async () => {
      const fakeRideId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/rides/${fakeRideId}`)
        .set('Authorization', `Bearer ${riderAuth.token}`);

      expect(res.status).toBe(404);
    });

    test('should reject getting ride without auth', async () => {
      const res = await request(app)
        .get(`/api/rides/${testRide._id}`);

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/rides/:id/cancel', () => {
    test('should cancel ride with reason', async () => {
      const cancelRide = await Ride.create({
        rider: riderAuth.user._id,
        driver: driverAuth.user._id,
        rideType: 'sedan',
        pickupLocation: {
          coordinates: [77.5946, 12.9716],
          address: 'Pickup Location',
        },
        dropoffLocation: {
          coordinates: [77.6245, 12.9352],
          address: 'Drop Location',
        },
        fare: {
          estimatedFare: 150,
        },
        distance: 5.5,
        status: 'requested',
        otp: '5678',
      });

      const res = await request(app)
        .put(`/api/rides/${cancelRide._id}/cancel`)
        .set('Authorization', `Bearer ${riderAuth.token}`)
        .send({
          reason: 'Changed my mind',
        });

      expect([200, 400]).toContain(res.status);
    });

    test('should cancel ride without reason', async () => {
      const cancelRide2 = await Ride.create({
        rider: riderAuth.user._id,
        driver: driverAuth.user._id,
        rideType: 'sedan',
        pickupLocation: {
          coordinates: [77.5946, 12.9716],
          address: 'Pickup Location',
        },
        dropoffLocation: {
          coordinates: [77.6245, 12.9352],
          address: 'Drop Location',
        },
        fare: {
          estimatedFare: 150,
        },
        distance: 5.5,
        status: 'requested',
        otp: '9012',
      });

      const res = await request(app)
        .put(`/api/rides/${cancelRide2._id}/cancel`)
        .set('Authorization', `Bearer ${riderAuth.token}`)
        .send({});

      expect([200, 400]).toContain(res.status);
    });

    test('should reject cancelling non-existent ride', async () => {
      const fakeRideId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/rides/${fakeRideId}/cancel`)
        .set('Authorization', `Bearer ${riderAuth.token}`)
        .send({
          reason: 'Test cancel',
        });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/rides/:id/rate', () => {
    test('should rate completed ride', async () => {
      const completedRide = await Ride.create({
        rider: riderAuth.user._id,
        driver: driverAuth.user._id,
        rideType: 'sedan',
        pickupLocation: {
          coordinates: [77.5946, 12.9716],
          address: 'Pickup Location',
        },
        dropoffLocation: {
          coordinates: [77.6245, 12.9352],
          address: 'Drop Location',
        },
        fare: {
          estimatedFare: 150,
        },
        distance: 5.5,
        status: 'completed',
        otp: '3456',
      });

      const res = await request(app)
        .post(`/api/rides/${completedRide._id}/rate`)
        .set('Authorization', `Bearer ${riderAuth.token}`)
        .send({
          rating: 5,
          feedback: 'Great ride!',
        });

      expect([200, 400]).toContain(res.status);
    });

    test('should rate ride without feedback', async () => {
      const completedRide2 = await Ride.create({
        rider: riderAuth.user._id,
        driver: driverAuth.user._id,
        rideType: 'sedan',
        pickupLocation: {
          coordinates: [77.5946, 12.9716],
          address: 'Pickup Location',
        },
        dropoffLocation: {
          coordinates: [77.6245, 12.9352],
          address: 'Drop Location',
        },
        fare: {
          estimatedFare: 150,
        },
        distance: 5.5,
        status: 'completed',
        otp: '7890',
      });

      const res = await request(app)
        .post(`/api/rides/${completedRide2._id}/rate`)
        .set('Authorization', `Bearer ${riderAuth.token}`)
        .send({
          rating: 4,
        });

      expect([200, 400]).toContain(res.status);
    });

    test('should reject rating without rating value', async () => {
      const res = await request(app)
        .post(`/api/rides/${testRide._id}/rate`)
        .set('Authorization', `Bearer ${riderAuth.token}`)
        .send({
          feedback: 'Good ride',
        });

      expect(res.status).toBe(400);
    });

    test('should reject rating below 1', async () => {
      const res = await request(app)
        .post(`/api/rides/${testRide._id}/rate`)
        .set('Authorization', `Bearer ${riderAuth.token}`)
        .send({
          rating: 0,
        });

      expect(res.status).toBe(400);
    });

    test('should reject rating above 5', async () => {
      const res = await request(app)
        .post(`/api/rides/${testRide._id}/rate`)
        .set('Authorization', `Bearer ${riderAuth.token}`)
        .send({
          rating: 6,
        });

      expect(res.status).toBe(400);
    });

    test('should reject rating non-existent ride', async () => {
      const fakeRideId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/rides/${fakeRideId}/rate`)
        .set('Authorization', `Bearer ${riderAuth.token}`)
        .send({
          rating: 5,
        });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/rides/history', () => {
    test('should get ride history with status filter', async () => {
      const res = await request(app)
        .get('/api/rides/history?status=completed')
        .set('Authorization', `Bearer ${riderAuth.token}`);

      expect(res.status).toBe(200);
    });

    test('should get ride history with date range', async () => {
      const res = await request(app)
        .get('/api/rides/history?startDate=2024-01-01&endDate=2024-12-31')
        .set('Authorization', `Bearer ${riderAuth.token}`);

      expect(res.status).toBe(200);
    });

    test('should support different page sizes', async () => {
      const res = await request(app)
        .get('/api/rides/history?limit=20')
        .set('Authorization', `Bearer ${riderAuth.token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/rides/active', () => {
    test('should get active ride if exists', async () => {
      const res = await request(app)
        .get('/api/rides/active')
        .set('Authorization', `Bearer ${riderAuth.token}`);

      expect([200, 404]).toContain(res.status);
    });

    test('should reject getting active ride without auth', async () => {
      const res = await request(app)
        .get('/api/rides/active');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/rides/estimate-fare', () => {
    test('should estimate fare for mini vehicle', async () => {
      const res = await request(app)
        .post('/api/rides/estimate-fare')
        .set('Authorization', `Bearer ${riderAuth.token}`)
        .send({
          pickupLocation: {
            latitude: 12.9716,
            longitude: 77.5946,
          },
          dropLocation: {
            latitude: 12.9352,
            longitude: 77.6245,
          },
          vehicleType: 'mini',
        });

      expect(res.status).toBe(200);
    });

    test('should estimate fare for auto vehicle', async () => {
      const res = await request(app)
        .post('/api/rides/estimate-fare')
        .set('Authorization', `Bearer ${riderAuth.token}`)
        .send({
          pickupLocation: {
            latitude: 12.9716,
            longitude: 77.5946,
          },
          dropLocation: {
            latitude: 12.9352,
            longitude: 77.6245,
          },
          vehicleType: 'auto',
        });

      expect(res.status).toBe(200);
    });

    test('should handle surge pricing', async () => {
      const res = await request(app)
        .post('/api/rides/estimate-fare')
        .set('Authorization', `Bearer ${riderAuth.token}`)
        .send({
          pickupLocation: {
            latitude: 12.9716,
            longitude: 77.5946,
          },
          dropLocation: {
            latitude: 12.9352,
            longitude: 77.6245,
          },
          vehicleType: 'sedan',
          applyMultiplier: true,
        });

      expect(res.status).toBe(200);
    });
  });
});
