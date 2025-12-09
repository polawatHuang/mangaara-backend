// Jest setup file - runs before all tests

// Set test environment variables FIRST before any imports
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.DB_NAME = 'test_db';
process.env.ADMIN_API_KEY = 'test_api_key';
process.env.UPLOAD_BASE_PATH = '/tmp/test-uploads';
process.env.CORS_ORIGINS = 'http://localhost:3000';

// Mock database connection to prevent connection attempts during tests
jest.mock('./db', () => {
  const mockExecute = jest.fn().mockResolvedValue([[], []]);
  const mockQuery = jest.fn().mockResolvedValue([[], []]);
  const mockGetConnection = jest.fn().mockResolvedValue({
    release: jest.fn(),
    execute: mockExecute,
    query: mockQuery
  });

  return {
    execute: mockExecute,
    query: mockQuery,
    getConnection: mockGetConnection,
    promise: jest.fn(() => ({
      execute: mockExecute,
      query: mockQuery,
      getConnection: mockGetConnection
    }))
  };
});

// Suppress console errors during tests (optional)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
