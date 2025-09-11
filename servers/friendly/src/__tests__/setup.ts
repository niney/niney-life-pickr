import { beforeAll, afterAll, afterEach } from 'vitest';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Use random port for tests
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests
process.env.CORS_ORIGIN = '*'; // Allow all origins in tests

// Global setup
beforeAll(() => {
  console.log('🧪 Starting test suite...');
});

// Clean up after each test
afterEach(() => {
  // Clear any mocks if needed
});

// Global teardown
afterAll(() => {
  console.log('✅ Test suite completed');
});