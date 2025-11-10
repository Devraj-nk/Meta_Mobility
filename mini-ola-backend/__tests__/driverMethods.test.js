const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Driver = require('../src/models/Driver');
const User = require('../src/models/User');

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

describe('Driver Model Methods', () => {
  let user, driver;

  beforeEach(async () => {
    user = await User.create({
      name: 'Test Driver',
      email: 'methods_driver@test.com',
      phone: '9876543222',
      password: 'password123',
      role: 'driver',
    });

    driver = await Driver.create({
      user: user._id,
      vehicleType: 'sedan',
      vehicleNumber: 'KA01AB1234',
      vehicleModel: 'Honda City',
      licenseNumber: 'DL1234567890',
      licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
  });

  afterEach(async () => {
    await Driver.deleteMany({});
    await User.deleteMany({});
  });

  describe('toggleAvailability', () => {
    test('should toggle availability from false to true', async () => {
      expect(driver.isAvailable).toBe(false);

      await driver.toggleAvailability();

      expect(driver.isAvailable).toBe(true);
    });

    test('should toggle availability from true to false', async () => {
      driver.isAvailable = true;
      await driver.save();

      await driver.toggleAvailability();

      expect(driver.isAvailable).toBe(false);
    });

    test('should persist availability changes', async () => {
      await driver.toggleAvailability();

      const updatedDriver = await Driver.findById(driver._id);
      expect(updatedDriver.isAvailable).toBe(true);
    });
  });

  describe('addEarnings', () => {
    test('should add earnings and increment total rides', async () => {
      await driver.addEarnings(250);

      expect(driver.totalEarnings).toBe(250);
      expect(driver.totalRides).toBe(1);
    });

    test('should calculate experience based on rides', async () => {
      await driver.addEarnings(250);

      expect(driver.experience).toBe(10); // 1 ride * 10
    });

    test('should calculate level based on rides', async () => {
      // Need 10 rides for level 2
      for (let i = 0; i < 10; i++) {
        await driver.addEarnings(250);
      }

      expect(driver.level).toBe(2); // floor(10/10) + 1 = 2
    });

    test('should award Rookie badge at 10 rides', async () => {
      for (let i = 0; i < 10; i++) {
        await driver.addEarnings(250);
      }

      const rookieBadge = driver.badges.find(b => b.name === 'Rookie');
      expect(rookieBadge).toBeDefined();
    });

    test('should award Experienced badge at 50 rides', async () => {
      for (let i = 0; i < 50; i++) {
        await driver.addEarnings(250);
      }

      const expBadge = driver.badges.find(b => b.name === 'Experienced');
      expect(expBadge).toBeDefined();
    });

    test('should award Expert badge at 100 rides', async () => {
      for (let i = 0; i < 100; i++) {
        await driver.addEarnings(250);
      }

      const expertBadge = driver.badges.find(b => b.name === 'Expert');
      expect(expertBadge).toBeDefined();
    });

    test('should not duplicate badges', async () => {
      // Award Rookie twice
      for (let i = 0; i < 10; i++) {
        await driver.addEarnings(250);
      }
      for (let i = 0; i < 5; i++) {
        await driver.addEarnings(250);
      }

      const rookieBadges = driver.badges.filter(b => b.name === 'Rookie');
      expect(rookieBadges.length).toBe(1);
    });

    test('should accumulate earnings over multiple rides', async () => {
      await driver.addEarnings(250);
      await driver.addEarnings(300);
      await driver.addEarnings(150);

      expect(driver.totalEarnings).toBe(700);
      expect(driver.totalRides).toBe(3);
    });
  });

  describe('updateLocation', () => {
    test('should update location with coordinates', async () => {
      await driver.updateLocation(77.5946, 12.9716);

      expect(driver.currentLocation.type).toBe('Point');
      expect(driver.currentLocation.coordinates).toEqual([77.5946, 12.9716]);
    });

    test('should update location with address', async () => {
      await driver.updateLocation(77.5946, 12.9716, 'Koramangala, Bangalore');

      expect(driver.currentLocation.address).toBe('Koramangala, Bangalore');
    });

    test('should update location without address', async () => {
      await driver.updateLocation(77.5946, 12.9716);

      expect(driver.currentLocation.address).toBe('');
    });

    test('should persist location changes', async () => {
      await driver.updateLocation(77.5946, 12.9716, 'Test Location');

      const updatedDriver = await Driver.findById(driver._id);
      expect(updatedDriver.currentLocation.coordinates).toEqual([77.5946, 12.9716]);
      expect(updatedDriver.currentLocation.address).toBe('Test Location');
    });

    test('should overwrite previous location', async () => {
      await driver.updateLocation(77.5946, 12.9716, 'Location 1');
      await driver.updateLocation(77.6245, 12.9352, 'Location 2');

      expect(driver.currentLocation.coordinates).toEqual([77.6245, 12.9352]);
      expect(driver.currentLocation.address).toBe('Location 2');
    });
  });

  describe('Combined Operations', () => {
    test('should handle multiple method calls in sequence', async () => {
      await driver.toggleAvailability();
      await driver.updateLocation(77.5946, 12.9716, 'Test');
      await driver.addEarnings(500);

      expect(driver.isAvailable).toBe(true);
      expect(driver.currentLocation.coordinates).toEqual([77.5946, 12.9716]);
      expect(driver.totalEarnings).toBe(500);
    });
  });
});
