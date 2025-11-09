module.exports = {
  testEnvironment: 'node',
  verbose: true,
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: [],
  // Increase default timeout for potential Mongo spin-up
  testTimeout: 30000,
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js' // app wiring excluded from unit coverage, still covered by integration
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      lines: 75,
      statements: 75,
      functions: 70,
      branches: 60
    }
  }
};
