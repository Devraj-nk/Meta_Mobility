const fareCalculator = require('../src/utils/fareCalculator');

describe('Fare Calculator Tests', () => {
  describe('calculateFare', () => {
    test('should calculate fare for bike ride', () => {
      const result = fareCalculator.calculateFare('bike', 5, 15, 1, false);

      expect(result.estimatedFare).toBeGreaterThan(0);
      expect(result.baseFare).toBeDefined();
      expect(result.distanceFare).toBeDefined();
      expect(result.timeFare).toBeDefined();
    });

    test('should calculate fare for sedan ride', () => {
      const result = fareCalculator.calculateFare('sedan', 10, 25, 1, false);

      expect(result.estimatedFare).toBeGreaterThan(0);
      expect(result.baseFare).toBe(80); // sedan base fare
    });

    test('should calculate fare for mini ride', () => {
      const result = fareCalculator.calculateFare('mini', 8, 20, 1, false);

      expect(result.estimatedFare).toBeGreaterThan(0);
      expect(result.baseFare).toBe(50); // mini base fare
    });

    test('should calculate fare for suv ride', () => {
      const result = fareCalculator.calculateFare('suv', 15, 35, 1, false);

      expect(result.estimatedFare).toBeGreaterThan(0);
      expect(result.baseFare).toBe(120); // suv base fare
    });

    test('should apply surge multiplier', () => {
      const normalFare = fareCalculator.calculateFare('sedan', 5, 15, 1, false);
      const surgeFare = fareCalculator.calculateFare('sedan', 5, 15, 2, false);

      expect(surgeFare.estimatedFare).toBeGreaterThan(normalFare.estimatedFare);
      expect(surgeFare.surgeMultiplier).toBe(2);
    });

    test('should reduce fare for group ride', () => {
      const soloFare = fareCalculator.calculateFare('sedan', 5, 15, 1, false);
      const groupFare = fareCalculator.calculateFare('sedan', 5, 15, 1, true);

      expect(groupFare.estimatedFare).toBeLessThan(soloFare.estimatedFare);
      expect(groupFare.groupDiscount).toBeGreaterThan(0);
    });

    test('should handle zero distance', () => {
      const result = fareCalculator.calculateFare('bike', 0, 5, 1, false);

      expect(result.estimatedFare).toBeGreaterThan(0);
      expect(result.baseFare).toBeGreaterThan(0);
    });

    test('should throw error for invalid ride type', () => {
      expect(() => {
        fareCalculator.calculateFare('invalid', 5, 15, 1, false);
      }).toThrow('Invalid ride type');
    });

    test('should throw error for negative distance', () => {
      expect(() => {
        fareCalculator.calculateFare('sedan', -5, 15, 1, false);
      }).toThrow('Distance and time must be positive');
    });
  });

  describe('calculateDistance', () => {
    test('should calculate distance between two coordinates', () => {
      const distance = fareCalculator.calculateDistance(
        12.9716, 77.5946, // Bangalore
        12.2958, 76.6394  // Mysore
      );

      expect(distance).toBeGreaterThan(100); // ~130 km
      expect(distance).toBeLessThan(150);
    });

    test('should return 0 for same coordinates', () => {
      const distance = fareCalculator.calculateDistance(
        12.9716, 77.5946,
        12.9716, 77.5946
      );

      expect(distance).toBe(0);
    });

    test('should calculate short distances accurately', () => {
      const distance = fareCalculator.calculateDistance(
        12.9716, 77.5946,
        12.9752, 77.6012
      );

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(2);
    });
  });

  describe('calculateDistance', () => {
    test('should handle different coordinates', () => {
      // calculateDistance is used internally by fare calculator
      const fare1 = fareCalculator.calculateFare('sedan', 10, 20, 1, false);
      const fare2 = fareCalculator.calculateFare('sedan', 50, 60, 1, false);
      
      // Longer distance should cost more
      expect(fare2.estimatedFare).toBeGreaterThan(fare1.estimatedFare);
    });
  });
});
