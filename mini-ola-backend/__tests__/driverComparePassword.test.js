const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
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

describe('Driver.comparePassword', () => {
  test('should correctly compare hashed password', async () => {
    const driver = await Driver.create({
      name: 'Pwd Driver',
      email: 'pwd_driver@test.com',
      phone: '9999911111',
      password: 'supersecret',
      vehicleType: 'sedan',
      vehicleNumber: 'KA09ZZ9999',
      vehicleModel: 'Verna',
      licenseNumber: 'DL0000111122',
      licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    // Need to fetch with password selection enabled for comparison
    const fresh = await Driver.findById(driver._id).select('+password');
    const ok = await fresh.comparePassword('supersecret');
    const bad = await fresh.comparePassword('notit');

    expect(ok).toBe(true);
    expect(bad).toBe(false);
  });
});
