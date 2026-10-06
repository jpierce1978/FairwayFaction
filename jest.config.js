const alias = { '^@/(.*)$': '<rootDir>/src/$1' };

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'app',
      preset: 'jest-expo',
      testMatch: ['<rootDir>/tests/**/*.test.{ts,tsx}', '<rootDir>/src/**/*.test.{ts,tsx}'],
      testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/supabase.test.ts'],
      moduleNameMapper: alias,
    },
    {
      // Postgres (PGlite) ships ESM that relies on import.meta, so this project runs as native ESM
      // (requires NODE_OPTIONS=--experimental-vm-modules, set by `npm test`).
      displayName: 'supabase',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/supabase.test.ts'],
      extensionsToTreatAsEsm: ['.ts'],
      transform: {
        '\\.ts$': [
          'babel-jest',
          {
            babelrc: false,
            configFile: false,
            presets: ['@babel/preset-typescript'],
          },
        ],
      },
    },
  ],
  testTimeout: 60000,
};
