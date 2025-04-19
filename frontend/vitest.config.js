// vitest.config.js
export default {
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 30000 // 30 seconds timeout for integration tests
  }
};