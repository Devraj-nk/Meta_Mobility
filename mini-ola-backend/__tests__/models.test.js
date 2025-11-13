const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../src/models/User');
const Ride = require('../src/models/Ride');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  process.env.JWT_SECRET = 'test-secret';
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  await Ride.deleteMany({});
});

describe('User Model Tests', () => {
  test('should hash password before saving', async () => {
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      phone: '9876543210',
      password: 'plaintext123',
      role: 'rider',
    });

    await user.save();
    expect(user.password).not.toBe('plaintext123');
    expect(user.password).toHaveLength(60); // bcrypt hash length
  });

  test('should compare passwords correctly', async () => {
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      phone: '9876543210',
      password: 'password123',
      role: 'rider',
    });

    await user.save();
    const isMatch = await user.comparePassword('password123');
    const isNotMatch = await user.comparePassword('wrongpassword');

    expect(isMatch).toBe(true);
    expect(isNotMatch).toBe(false);
  });

  test('should not hash password if not modified', async () => {
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      phone: '9876543210',
      password: 'password123',
      role: 'rider',
    });

    await user.save();
    const originalPassword = user.password;

    user.name = 'Updated Name';
    await user.save();

    expect(user.password).toBe(originalPassword);
  });

  test('should create rider with wallet balance', async () => {
    const user = new User({
      name: 'Test Rider',
      email: 'rider@example.com',
      phone: '9876543210',
      password: 'password123',
      role: 'rider',
    });

    await user.save();
    expect(user.walletBalance).toBe(1000); // Default wallet balance
    expect(user.role).toBe('rider');
  });
});

describe('Ride Model Tests', () => {
  test('should generate OTP', async () => {
    const ride = new Ride({
      rider: new mongoose.Types.ObjectId(),
      rideType: 'sedan',
      pickupLocation: {
        type: 'Point',
        coordinates: [77.5946, 12.9716],
        address: 'Pickup',
      },
      dropoffLocation: {
        type: 'Point',
        coordinates: [77.6245, 12.9352],
        address: 'Dropoff',
      },
      fare: {
        estimatedFare: 100,
      },
    });

    await ride.save();
    await ride.generateOTP();

    expect(ride.otp).toBeDefined();
    expect(ride.otp).toHaveLength(4);
    expect(parseInt(ride.otp)).toBeGreaterThanOrEqual(1000);
    expect(parseInt(ride.otp)).toBeLessThanOrEqual(9999);
  });

  test('should verify OTP correctly', async () => {
    const ride = new Ride({
      rider: new mongoose.Types.ObjectId(),
      rideType: 'sedan',
      pickupLocation: {
        type: 'Point',
        coordinates: [77.5946, 12.9716],
        address: 'Pickup',
      },
      dropoffLocation: {
        type: 'Point',
        coordinates: [77.6245, 12.9352],
        address: 'Dropoff',
      },
      fare: {
        estimatedFare: 100,
      },
      otp: '1234',
    });

    await ride.save();

    expect(ride.verifyOTP('1234')).toBe(true);
    expect(ride.verifyOTP('5678')).toBe(false);
  });

  test('should start ride and set status', async () => {
    const ride = new Ride({
      rider: new mongoose.Types.ObjectId(),
      rideType: 'sedan',
      pickupLocation: {
        type: 'Point',
        coordinates: [77.5946, 12.9716],
        address: 'Pickup',
      },
      dropoffLocation: {
        type: 'Point',
        coordinates: [77.6245, 12.9352],
        address: 'Dropoff',
      },
      fare: {
        estimatedFare: 100,
      },
      status: 'accepted',
    });

    await ride.save();
    await ride.startRide();

    expect(ride.status).toBe('in-progress');
    expect(ride.startTime).toBeDefined();
  });

  test('should complete ride and calculate duration', async () => {
    const ride = new Ride({
      rider: new mongoose.Types.ObjectId(),
      rideType: 'sedan',
      pickupLocation: {
        type: 'Point',
        coordinates: [77.5946, 12.9716],
        address: 'Pickup',
      },
      dropoffLocation: {
        type: 'Point',
        coordinates: [77.6245, 12.9352],
        address: 'Dropoff',
      },
      fare: {
        estimatedFare: 100,
      },
      status: 'in-progress',
      startTime: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      duration: {},
    });

    await ride.save();
    await ride.completeRide(120);

    expect(ride.status).toBe('completed');
    expect(ride.endTime).toBeDefined();
    expect(ride.fare.finalFare).toBe(120);
    expect(ride.duration.actual).toBeGreaterThanOrEqual(14);
  });

  test('should cancel ride with reason', async () => {
    const ride = new Ride({
      rider: new mongoose.Types.ObjectId(),
      rideType: 'sedan',
      pickupLocation: {
        type: 'Point',
        coordinates: [77.5946, 12.9716],
        address: 'Pickup',
      },
      dropoffLocation: {
        type: 'Point',
        coordinates: [77.6245, 12.9352],
        address: 'Dropoff',
      },
      fare: {
        estimatedFare: 100,
      },
      status: 'requested',
    });

    await ride.save();
    await ride.cancelRide('User changed plans', 'rider');

    expect(ride.status).toBe('cancelled');
    expect(ride.cancellationReason).toBe('User changed plans');
    expect(ride.cancelledBy).toBe('rider');
  });
});
