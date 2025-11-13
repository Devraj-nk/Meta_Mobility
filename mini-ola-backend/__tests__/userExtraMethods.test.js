const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
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

describe('User extra instance methods', () => {
  let user;

  beforeEach(async () => {
    user = await User.create({
      name: 'Rating User',
      email: 'rating_user@test.com',
      phone: '8888877777',
      password: 'password123',
      role: 'rider',
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  test('updateRating should average ratings and increment totalRatings', async () => {
    await user.updateRating(5);
    expect(user.rating).toBe(5);
    expect(user.totalRatings).toBe(1);

    await user.updateRating(3);
    // (5*1 + 3) / 2 = 4
    expect(Math.round(user.rating * 10) / 10).toBe(4);
    expect(user.totalRatings).toBe(2);
  });

  test('toJSON should strip password field', async () => {
    const plain = user.toJSON();
    expect(plain.password).toBeUndefined();
    expect(plain.email).toBe('rating_user@test.com');
  });
});
