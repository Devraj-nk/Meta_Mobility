const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { registerUser, createRider } = require('./helpers/testUtils');

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

describe('Auth Controller - Extended Tests', () => {
  describe('POST /api/auth/register', () => {
    test('should reject registration with missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          // missing phone and password
        });

      expect(res.status).toBe(400);
    });

    test('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          phone: '9876543210',
          password: 'password123',
          role: 'rider',
        });

      expect(res.status).toBe(400);
    });

    test('should reject invalid phone format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          phone: '123', // invalid
          password: 'password123',
          role: 'rider',
        });

      expect(res.status).toBe(400);
    });

    test('should reject password shorter than 6 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: `short${Date.now()}@example.com`,
          phone: '9876543210',
          password: '12345', // too short
          role: 'rider',
        });

      expect(res.status).toBe(400);
    });

    test('should reject duplicate email registration', async () => {
      const userData = {
        name: 'Test User',
        email: `duplicate${Date.now()}@example.com`,
        phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
        password: 'password123',
        role: 'rider',
      };

      // First registration
      await request(app).post('/api/auth/register').send(userData);

      // Duplicate registration
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...userData, phone: `98765${Math.floor(10000 + Math.random() * 90000)}` });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already exists');
    });

    test('should successfully register a driver with vehicle details', async () => {
      const driverData = {
        name: 'Test Driver',
        email: `driver${Date.now()}@example.com`,
        phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
        password: 'password123',
        role: 'driver',
        vehicleType: 'sedan',
        vehicleNumber: `KA01${Math.floor(1000 + Math.random() * 9000)}`,
        vehicleModel: 'Honda City',
        vehicleColor: 'White',
        licenseNumber: `DL${Date.now()}`,
        licenseExpiry: '2026-12-31',
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(driverData);

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('driver');
        expect(res.body.data).toHaveProperty('accessToken');
        expect(res.body.data).toHaveProperty('refreshToken');
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;

    beforeAll(async () => {
      testUser = {
        name: 'Login Test User',
        email: `logintest${Date.now()}@example.com`,
        phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
        password: 'password123',
        role: 'rider',
      };
      await registerUser(app, testUser);
    });

    test('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.user.email).toBe(testUser.email);
    });

    test('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
    });

    test('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(401);
    });

    test('should reject login with missing credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          // missing password
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/profile', () => {
    let riderAuth;

    beforeAll(async () => {
      riderAuth = await createRider(app);
    });

    test('should get user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${riderAuth.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toHaveProperty('email');
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    test('should reject request without token', async () => {
      const res = await request(app).get('/api/auth/profile');

      expect(res.status).toBe(401);
    });

    test('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token-xyz');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/change-password', () => {
    let testUser;
    let token;

    beforeEach(async () => {
      const userData = {
        name: 'Password Change User',
        email: `pwchange${Date.now()}@example.com`,
        phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
        password: 'oldpassword123',
        role: 'rider',
      };
      const auth = await registerUser(app, userData);
      testUser = userData;
      token = auth.token;
    });

    test('should change password successfully', async () => {
      const res = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'oldpassword123',
          newPassword: 'newpassword123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify old password doesn't work
      const loginOld = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'oldpassword123',
        });
      expect(loginOld.status).toBe(401);

      // Verify new password works
      const loginNew = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'newpassword123',
        });
      expect(loginNew.status).toBe(200);
    });

    test('should reject password change with wrong current password', async () => {
      const res = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        });

      expect(res.status).toBe(401);
    });

    test('should reject password change without authentication', async () => {
      const res = await request(app)
        .put('/api/auth/change-password')
        .send({
          currentPassword: 'oldpassword123',
          newPassword: 'newpassword123',
        });

      expect(res.status).toBe(401);
    });
  });
});
