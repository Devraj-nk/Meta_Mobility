// Set test timeout
jest.setTimeout(30000);

// Set required environment variables for tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_testing';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
process.env.REFRESH_TTL_MINUTES = process.env.REFRESH_TTL_MINUTES || '10080';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mini-ola-test';

// Suppress console logs in tests unless explicitly needed
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}
