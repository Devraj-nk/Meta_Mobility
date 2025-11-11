const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Payment = require('../src/models/Payment');
const Ride = require('../src/models/Ride');
const User = require('../src/models/User');
const Driver = require('../src/models/Driver');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) await mongoServer.stop();
});

describe('Payment Model Tests', () => {
  let rider;
  let driver;
  let ride;

  beforeEach(async () => {
    // Create test users
    rider = await User.create({
      name: 'Test Rider',
      email: 'rider@test.com',
      phone: '1234567890',
      password: 'password123',
      role: 'rider',
    });

    driver = await User.create({
      name: 'Test Driver',
      email: 'driver@test.com',
      phone: '0987654321',
      password: 'password123',
      role: 'driver',
    });

    await Driver.create({
      name: 'Test Driver',
      email: 'driver@test.com',
      phone: '0987654321',
      password: 'password123',
      vehicleType: 'sedan',
      vehicleNumber: 'KA01AB1234',
      vehicleModel: 'Honda City',
      licenseNumber: 'DL1234567890',
      licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    });

    // Create test ride
    ride = await Ride.create({
      rider: rider._id,
      driver: driver._id,
      rideType: 'sedan',
      pickupLocation: {
        coordinates: [77.5946, 12.9716],
        address: 'Pickup Location',
      },
      dropoffLocation: {
        coordinates: [77.6245, 12.9352],
        address: 'Drop Location',
      },
      fare: { estimatedFare: 200 },
      distance: 5.5,
      status: 'completed',
      otp: '1234',
    });
  });

  afterEach(async () => {
    await Payment.deleteMany({});
    await Ride.deleteMany({});
    await Driver.deleteMany({});
    await User.deleteMany({});
  });

  describe('Payment Creation', () => {
    test('should create payment with required fields', async () => {
      const payment = await Payment.create({
        ride: ride._id,
        rider: rider._id,
        driver: driver._id,
        amount: 200,
        method: 'wallet',
      });

      expect(payment).toBeDefined();
      expect(payment.amount).toBe(200);
      expect(payment.status).toBe('pending');
      expect(payment.receiptNumber).toBeDefined();
    });

    test('should create payment with upi method', async () => {
      const ride2 = await Ride.create({
        rider: rider._id,
        driver: driver._id,
        rideType: 'sedan',
        pickupLocation: {
          coordinates: [77.5946, 12.9716],
          address: 'Pickup Location 2',
        },
        dropoffLocation: {
          coordinates: [77.6245, 12.9352],
          address: 'Drop Location 2',
        },
        fare: { estimatedFare: 200 },
        distance: 5.5,
        status: 'completed',
        otp: '5678',
      });

      const payment = await Payment.create({
        ride: ride2._id,
        rider: rider._id,
        driver: driver._id,
        amount: 200,
        method: 'upi',
      });

      expect(payment.method).toBe('upi');
    });

    test('should create payment with cash method', async () => {
      const ride3 = await Ride.create({
        rider: rider._id,
        driver: driver._id,
        rideType: 'sedan',
        pickupLocation: {
          coordinates: [77.5946, 12.9716],
          address: 'Pickup Location 3',
        },
        dropoffLocation: {
          coordinates: [77.6245, 12.9352],
          address: 'Drop Location 3',
        },
        fare: { estimatedFare: 200 },
        distance: 5.5,
        status: 'completed',
        otp: '9012',
      });

      const payment = await Payment.create({
        ride: ride3._id,
        rider: rider._id,
        driver: driver._id,
        amount: 200,
        method: 'cash',
      });

      expect(payment.method).toBe('cash');
    });
  });

  describe('Payment Instance Methods', () => {
    test('should generate transaction ID', async () => {
      const ride4 = await Ride.create({
        rider: rider._id,
        driver: driver._id,
        rideType: 'sedan',
        pickupLocation: {
          coordinates: [77.5946, 12.9716],
          address: 'Pickup Location 4',
        },
        dropoffLocation: {
          coordinates: [77.6245, 12.9352],
          address: 'Drop Location 4',
        },
        fare: { estimatedFare: 200 },
        distance: 5.5,
        status: 'completed',
        otp: '3456',
      });

      const payment = await Payment.create({
        ride: ride4._id,
        rider: rider._id,
        driver: driver._id,
        amount: 200,
        method: 'wallet',
      });

      await payment.generateTransactionId();

      expect(payment.transactionId).toBeDefined();
      expect(payment.transactionId).toContain('TXN-');
    });

    test('should not generate transaction ID for cash', async () => {
      const ride5 = await Ride.create({
        rider: rider._id,
        driver: driver._id,
        rideType: 'sedan',
        pickupLocation: {
          coordinates: [77.5946, 12.9716],
          address: 'Pickup Location 5',
        },
        dropoffLocation: {
          coordinates: [77.6245, 12.9352],
          address: 'Drop Location 5',
        },
        fare: { estimatedFare: 200 },
        distance: 5.5,
        status: 'completed',
        otp: '7890',
      });

      const payment = await Payment.create({
        ride: ride5._id,
        rider: rider._id,
        driver: driver._id,
        amount: 200,
        method: 'cash',
      });

      await payment.generateTransactionId();

      expect(payment.transactionId).toBeUndefined();
    });

    test('should process payment successfully', async () => {
      // Give rider enough wallet balance
      await User.findByIdAndUpdate(rider._id, { walletBalance: 1000 });

      const ride6 = await Ride.create({
        rider: rider._id,
        driver: driver._id,
        rideType: 'sedan',
        pickupLocation: {
          coordinates: [77.5946, 12.9716],
          address: 'Pickup Location 6',
        },
        dropoffLocation: {
          coordinates: [77.6245, 12.9352],
          address: 'Drop Location 6',
        },
        fare: { estimatedFare: 200 },
        distance: 5.5,
        status: 'completed',
        otp: '4567',
      });

      const payment = await Payment.create({
        ride: ride6._id,
        rider: rider._id,
        driver: driver._id,
        amount: 200,
        method: 'wallet',
      });

      await payment.processPayment();

      expect(payment.status).toBe('completed');
      expect(payment.platformFee).toBeGreaterThan(0);
      expect(payment.driverEarnings).toBeGreaterThan(0);
      expect(payment.platformFee + payment.driverEarnings).toBe(200);
    });

    test('should fail payment with insufficient balance', async () => {
      // Set rider wallet balance to 0
      await User.findByIdAndUpdate(rider._id, { walletBalance: 0 });

      const ride7 = await Ride.create({
        rider: rider._id,
        driver: driver._id,
        rideType: 'sedan',
        pickupLocation: {
          coordinates: [77.5946, 12.9716],
          address: 'Pickup Location 7',
        },
        dropoffLocation: {
          coordinates: [77.6245, 12.9352],
          address: 'Drop Location 7',
        },
        fare: { estimatedFare: 200 },
        distance: 5.5,
        status: 'completed',
        otp: '8901',
      });

      const payment = await Payment.create({
        ride: ride7._id,
        rider: rider._id,
        driver: driver._id,
        amount: 500,
        method: 'wallet',
      });

      await expect(payment.processPayment()).rejects.toThrow('Insufficient wallet balance');
      
      const updatedPayment = await Payment.findById(payment._id);
      expect(updatedPayment.status).toBe('failed');
    });
  });

  describe('Payment Commission', () => {
    test('should calculate commission during payment processing', async () => {
      // Give rider enough wallet balance
      await User.findByIdAndUpdate(rider._id, { walletBalance: 1000 });

      const ride8 = await Ride.create({
        rider: rider._id,
        driver: driver._id,
        rideType: 'sedan',
        pickupLocation: {
          coordinates: [77.5946, 12.9716],
          address: 'Pickup Location 8',
        },
        dropoffLocation: {
          coordinates: [77.6245, 12.9352],
          address: 'Drop Location 8',
        },
        fare: { estimatedFare: 200 },
        distance: 5.5,
        status: 'completed',
        otp: '1122',
      });

      const payment = await Payment.create({
        ride: ride8._id,
        rider: rider._id,
        driver: driver._id,
        amount: 200,
        method: 'wallet',
      });

      await payment.processPayment();

      expect(payment.platformFee).toBeGreaterThan(0);
      expect(payment.driverEarnings).toBeGreaterThan(0);
      expect(payment.platformFee + payment.driverEarnings).toBe(200);
    });

    test('should apply correct commission percentage (20%)', async () => {
      // Give rider enough wallet balance
      await User.findByIdAndUpdate(rider._id, { walletBalance: 1000 });

      const ride9 = await Ride.create({
        rider: rider._id,
        driver: driver._id,
        rideType: 'sedan',
        pickupLocation: {
          coordinates: [77.5946, 12.9716],
          address: 'Pickup Location 9',
        },
        dropoffLocation: {
          coordinates: [77.6245, 12.9352],
          address: 'Drop Location 9',
        },
        fare: { estimatedFare: 100 },
        distance: 5.5,
        status: 'completed',
        otp: '3344',
      });

      const payment = await Payment.create({
        ride: ride9._id,
        rider: rider._id,
        driver: driver._id,
        amount: 100,
        method: 'wallet',
      });

      await payment.processPayment();
      
      const expectedFee = 100 * 0.2; // 20% platform fee

      expect(payment.platformFee).toBe(expectedFee);
      expect(payment.driverEarnings).toBe(100 - expectedFee);
    });
  });

  describe('Payment Refund', () => {
    test('should process refund successfully', async () => {
      // Give rider wallet balance for the refund
      await User.findByIdAndUpdate(rider._id, { walletBalance: 500 });

      const ride10 = await Ride.create({
        rider: rider._id,
        driver: driver._id,
        rideType: 'sedan',
        pickupLocation: {
          coordinates: [77.5946, 12.9716],
          address: 'Pickup Location 10',
        },
        dropoffLocation: {
          coordinates: [77.6245, 12.9352],
          address: 'Drop Location 10',
        },
        fare: { estimatedFare: 200 },
        distance: 5.5,
        status: 'completed',
        otp: '5566',
      });

      const payment = await Payment.create({
        ride: ride10._id,
        rider: rider._id,
        driver: driver._id,
        amount: 200,
        status: 'completed',
        method: 'wallet',
      });

      await payment.refundPayment('Service issue');

      expect(payment.status).toBe('refunded');
      expect(payment.refundReason).toBe('Service issue');
    });

    test('should not refund already refunded payment', async () => {
      const ride11 = await Ride.create({
        rider: rider._id,
        driver: driver._id,
        rideType: 'sedan',
        pickupLocation: {
          coordinates: [77.5946, 12.9716],
          address: 'Pickup Location 11',
        },
        dropoffLocation: {
          coordinates: [77.6245, 12.9352],
          address: 'Drop Location 11',
        },
        fare: { estimatedFare: 200 },
        distance: 5.5,
        status: 'completed',
        otp: '7788',
      });

      const payment = await Payment.create({
        ride: ride11._id,
        rider: rider._id,
        driver: driver._id,
        amount: 200,
        status: 'refunded',
        method: 'wallet',
      });

      await expect(payment.refundPayment('Duplicate')).rejects.toThrow();
    });

    test('should record refund timestamp', async () => {
      // Give rider wallet balance for the refund
      await User.findByIdAndUpdate(rider._id, { walletBalance: 500 });

      const ride12 = await Ride.create({
        rider: rider._id,
        driver: driver._id,
        rideType: 'sedan',
        pickupLocation: {
          coordinates: [77.5946, 12.9716],
          address: 'Pickup Location 12',
        },
        dropoffLocation: {
          coordinates: [77.6245, 12.9352],
          address: 'Drop Location 12',
        },
        fare: { estimatedFare: 200 },
        distance: 5.5,
        status: 'completed',
        otp: '9900',
      });

      const payment = await Payment.create({
        ride: ride12._id,
        rider: rider._id,
        driver: driver._id,
        amount: 200,
        status: 'completed',
        method: 'wallet',
      });

      await payment.refundPayment('Customer request');

      expect(payment.refundedAt).toBeDefined();
      expect(payment.refundedAt).toBeInstanceOf(Date);
    });
  });

  describe('Payment Status Transitions', () => {
    test('should transition from pending to completed', async () => {
      const ride13 = await Ride.create({
        rider: rider._id,
        driver: driver._id,
        rideType: 'sedan',
        pickupLocation: {
          coordinates: [77.5946, 12.9716],
          address: 'Pickup Location 13',
        },
        dropoffLocation: {
          coordinates: [77.6245, 12.9352],
          address: 'Drop Location 13',
        },
        fare: { estimatedFare: 200 },
        distance: 5.5,
        status: 'completed',
        otp: '1133',
      });

      const payment = await Payment.create({
        ride: ride13._id,
        rider: rider._id,
        driver: driver._id,
        amount: 200,
        status: 'pending',
        method: 'wallet',
      });

      payment.status = 'completed';
      await payment.save();

      expect(payment.status).toBe('completed');
    });

    test('should transition from pending to failed', async () => {
      const ride14 = await Ride.create({
        rider: rider._id,
        driver: driver._id,
        rideType: 'sedan',
        pickupLocation: {
          coordinates: [77.5946, 12.9716],
          address: 'Pickup Location 14',
        },
        dropoffLocation: {
          coordinates: [77.6245, 12.9352],
          address: 'Drop Location 14',
        },
        fare: { estimatedFare: 200 },
        distance: 5.5,
        status: 'completed',
        otp: '2244',
      });

      const payment = await Payment.create({
        ride: ride14._id,
        rider: rider._id,
        driver: driver._id,
        amount: 200,
        status: 'pending',
        method: 'upi',
      });

      payment.status = 'failed';
      await payment.save();

      expect(payment.status).toBe('failed');
    });

    test('should maintain payment timestamps', async () => {
      const ride15 = await Ride.create({
        rider: rider._id,
        driver: driver._id,
        rideType: 'sedan',
        pickupLocation: {
          coordinates: [77.5946, 12.9716],
          address: 'Pickup Location 15',
        },
        dropoffLocation: {
          coordinates: [77.6245, 12.9352],
          address: 'Drop Location 15',
        },
        fare: { estimatedFare: 200 },
        distance: 5.5,
        status: 'completed',
        otp: '5577',
      });

      const payment = await Payment.create({
        ride: ride15._id,
        rider: rider._id,
        driver: driver._id,
        amount: 200,
        status: 'pending',
        method: 'cash',
      });

      const createdAt = payment.createdAt;

      payment.status = 'completed';
      await payment.save();

      expect(payment.createdAt).toEqual(createdAt);
      expect(payment.updatedAt).toBeDefined();
    });
  });

  describe('Payment Queries', () => {
    beforeEach(async () => {
      // Create multiple payments for testing
      const ride16 = await Ride.create({
        rider: rider._id,
        driver: driver._id,
        rideType: 'sedan',
        pickupLocation: {
          coordinates: [77.5946, 12.9716],
          address: 'Pickup Location 16',
        },
        dropoffLocation: {
          coordinates: [77.6245, 12.9352],
          address: 'Drop Location 16',
        },
        fare: { estimatedFare: 200 },
        distance: 5.5,
        status: 'completed',
        otp: '6688',
      });

      const ride17 = await Ride.create({
        rider: rider._id,
        driver: driver._id,
        rideType: 'sedan',
        pickupLocation: {
          coordinates: [77.5946, 12.9716],
          address: 'Pickup Location 17',
        },
        dropoffLocation: {
          coordinates: [77.6245, 12.9352],
          address: 'Drop Location 17',
        },
        fare: { estimatedFare: 150 },
        distance: 5.5,
        status: 'completed',
        otp: '9911',
      });

      await Payment.create({
        ride: ride16._id,
        rider: rider._id,
        driver: driver._id,
        amount: 200,
        status: 'completed',
        method: 'wallet',
      });

      await Payment.create({
        ride: ride17._id,
        rider: rider._id,
        driver: driver._id,
        amount: 150,
        status: 'pending',
        method: 'upi',
      });
    });

    test('should find payments by rider', async () => {
      const payments = await Payment.find({ rider: rider._id });

      expect(payments.length).toBeGreaterThan(0);
    });

    test('should find payments by status', async () => {
      const completedPayments = await Payment.find({ status: 'completed' });

      expect(completedPayments.length).toBeGreaterThan(0);
      completedPayments.forEach(p => expect(p.status).toBe('completed'));
    });

    test('should find payments by method', async () => {
      const walletPayments = await Payment.find({ method: 'wallet' });

      expect(walletPayments.length).toBeGreaterThan(0);
      walletPayments.forEach(p => expect(p.method).toBe('wallet'));
    });
  });
});
