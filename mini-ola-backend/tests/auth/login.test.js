const request = require('supertest');
const { startMemoryMongo, clear, close } = require('../helpers/testDb');
let app;
const User = require('../../src/models/User');

describe('POST /api/auth/login (rider)', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
    await startMemoryMongo();
    app = require('../../src/server');
  });

  afterEach(async () => { await clear(); });
  afterAll(async () => { await close(); });

  test('logs in with email + password', async () => {
  await User.create({
    name: 'R1', email: 'r1@example.com', phone: '9999999990',
    password: 'password123', role: 'rider'
  });

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'r1@example.com', password: 'password123' });

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);

  // updated to match new response shape (accessToken + refreshToken)
  expect(res.body.data).toBeDefined();
  expect(res.body.data.accessToken).toBeDefined();
  expect(res.body.data.refreshToken).toBeDefined();
  expect(res.body.data.user.role).toBe('rider');
});

  test('rejects invalid password', async () => {
    await User.create({
      name: 'R2', email: 'r2@example.com', phone: '9999999991',
      password: 'password123', role: 'rider'
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'r2@example.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('rejects deactivated account', async () => {
    const user = await User.create({
      name: 'R3', email: 'r3@example.com', phone: '9999999992',
      password: 'password123', role: 'rider', isActive: false
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'r3@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
