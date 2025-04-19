module.exports = {
  preset: 'jest-puppeteer',
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testTimeout: 30000, // 30 seconds timeout for tests
};