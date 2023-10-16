module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test', '<rootDir>/asset'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
