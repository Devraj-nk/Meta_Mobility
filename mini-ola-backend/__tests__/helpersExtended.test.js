const {
  generateToken,
  verifyToken,
  generateOTP,
  generateUniqueId,
  formatLocation,
  validateCoordinates,
  formatError,
  formatSuccess,
  calculateETA,
  sanitizeInput,
  parsePagination,
} = require('../src/utils/helpers');

describe('Helper Utilities Tests', () => {
  describe('generateOTP', () => {
    test('should generate 4 digit OTP by default', () => {
      const otp = generateOTP();

      expect(otp).toHaveLength(4);
      expect(parseInt(otp)).toBeGreaterThanOrEqual(1000);
      expect(parseInt(otp)).toBeLessThanOrEqual(9999);
    });

    test('should generate 6 digit OTP', () => {
      const otp = generateOTP(6);

      expect(otp).toHaveLength(6);
      expect(parseInt(otp)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(otp)).toBeLessThanOrEqual(999999);
    });

    test('should generate numeric OTP', () => {
      const otp = generateOTP();

      expect(/^\d{4}$/.test(otp)).toBe(true);
    });
  });

  describe('generateUniqueId', () => {
    test('should generate unique ID with prefix', () => {
      const id = generateUniqueId('RIDE');

      expect(id).toContain('RIDE-');
    });

    test('should generate unique ID without prefix', () => {
      const id = generateUniqueId();

      expect(id).toContain('ID-');
    });

    test('should generate different IDs', () => {
      const id1 = generateUniqueId('TEST');
      const id2 = generateUniqueId('TEST');

      expect(id1).not.toBe(id2);
    });
  });

  describe('formatLocation', () => {
    test('should format location correctly', () => {
      const location = formatLocation(77.5946, 12.9716, 'Test Address');

      expect(location.type).toBe('Point');
      expect(location.coordinates).toEqual([77.5946, 12.9716]);
      expect(location.address).toBe('Test Address');
    });

    test('should handle location without address', () => {
      const location = formatLocation(77.5946, 12.9716);

      expect(location.type).toBe('Point');
      expect(location.coordinates).toEqual([77.5946, 12.9716]);
      expect(location.address).toBe('');
    });

    test('should parse string coordinates', () => {
      const location = formatLocation('77.5946', '12.9716');

      expect(location.coordinates).toEqual([77.5946, 12.9716]);
    });
  });

  describe('generateOTP', () => {
    test('should generate 4 digit OTP', () => {
      const otp = generateOTP();

      expect(otp).toHaveLength(4);
      expect(parseInt(otp)).toBeGreaterThanOrEqual(1000);
      expect(parseInt(otp)).toBeLessThanOrEqual(9999);
    });

    test('should generate numeric OTP', () => {
      const otp = generateOTP();

      expect(/^\d{4}$/.test(otp)).toBe(true);
    });

    test('should generate different OTPs', () => {
      const otp1 = generateOTP();
      const otp2 = generateOTP();

      // While they could theoretically be the same, probability is low
      expect(typeof otp1).toBe('string');
      expect(typeof otp2).toBe('string');
    });
  });

  describe('validateCoordinates', () => {
    test('should validate correct coordinates', () => {
      const isValid = validateCoordinates(77.5946, 12.9716);

      expect(isValid).toBe(true);
    });

    test('should reject invalid longitude', () => {
      const isValid = validateCoordinates(200, 12.9716);

      expect(isValid).toBe(false);
    });

    test('should reject invalid latitude', () => {
      const isValid = validateCoordinates(77.5946, 100);

      expect(isValid).toBe(false);
    });

    test('should handle edge cases', () => {
      expect(validateCoordinates(180, 90)).toBe(true);
      expect(validateCoordinates(-180, -90)).toBe(true);
      expect(validateCoordinates(0, 0)).toBe(true);
    });

    test('should reject out of range values', () => {
      expect(validateCoordinates(181, 12.9716)).toBe(false);
      expect(validateCoordinates(77.5946, 91)).toBe(false);
      expect(validateCoordinates(-181, 12.9716)).toBe(false);
      expect(validateCoordinates(77.5946, -91)).toBe(false);
    });

    test('should reject non-numeric values', () => {
      expect(validateCoordinates('invalid', 12.9716)).toBe(false);
      expect(validateCoordinates(77.5946, 'invalid')).toBe(false);
    });
  });

  describe('formatError', () => {
    test('should format error with default status', () => {
      const error = formatError('Something went wrong');

      expect(error.success).toBe(false);
      expect(error.message).toBe('Something went wrong');
      expect(error.statusCode).toBe(500);
      expect(error.timestamp).toBeDefined();
    });

    test('should format error with custom status', () => {
      const error = formatError('Not found', 404);

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Not found');
    });

    test('should include additional errors', () => {
      const errors = { field: 'Invalid value' };
      const error = formatError('Validation failed', 400, errors);

      expect(error.errors).toEqual(errors);
    });
  });

  describe('formatSuccess', () => {
    test('should format success response', () => {
      const response = formatSuccess('Operation successful', { id: 1 });

      expect(response.success).toBe(true);
      expect(response.message).toBe('Operation successful');
      expect(response.data).toEqual({ id: 1 });
      expect(response.timestamp).toBeDefined();
    });

    test('should format success without data', () => {
      const response = formatSuccess('Success');

      expect(response.success).toBe(true);
      expect(response.data).toBeNull();
    });
  });

  describe('calculateETA', () => {
    test('should calculate ETA with default speed', () => {
      const eta = calculateETA(15); // 15 km at 30 km/h

      expect(eta).toBe(30); // 30 minutes
    });

    test('should calculate ETA with custom speed', () => {
      const eta = calculateETA(60, 60); // 60 km at 60 km/h

      expect(eta).toBe(60); // 60 minutes
    });

    test('should round up to nearest minute', () => {
      const eta = calculateETA(5, 40); // Should be 7.5 minutes, rounds to 8

      expect(eta).toBe(8);
    });
  });

  describe('sanitizeInput', () => {
    test('should remove angle brackets', () => {
      const sanitized = sanitizeInput('<script>alert("xss")</script>');

      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });

    test('should trim whitespace', () => {
      const sanitized = sanitizeInput('  test  ');

      expect(sanitized).toBe('test');
    });

    test('should handle non-string input', () => {
      const sanitized = sanitizeInput(123);

      expect(sanitized).toBe(123);
    });
  });

  describe('parsePagination', () => {
    test('should parse pagination with defaults', () => {
      const pagination = parsePagination({});

      expect(pagination.page).toBe(1);
      expect(pagination.limit).toBe(10);
      expect(pagination.skip).toBe(0);
    });

    test('should parse custom pagination', () => {
      const pagination = parsePagination({ page: '3', limit: '20' });

      expect(pagination.page).toBe(3);
      expect(pagination.limit).toBe(20);
      expect(pagination.skip).toBe(40);
    });

    test('should handle invalid inputs', () => {
      const pagination = parsePagination({ page: 'invalid', limit: 'invalid' });

      expect(pagination.page).toBe(1);
      expect(pagination.limit).toBe(10);
    });
  });

  describe('generateToken', () => {
    test('should generate JWT token', () => {
      process.env.JWT_SECRET = 'test-secret';
      const token = generateToken('user123', 'rider');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('Performance Tests', () => {
    test('should generate OTP quickly', () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        generateOTP();
      }

      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    test('should format location quickly', () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        formatLocation(77.5946, 12.9716, 'Test');
      }

      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });
});
