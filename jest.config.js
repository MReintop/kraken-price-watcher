// Standalone Jest config for PURE logic tests, bypassing the jest-expo preset
// (its Expo "winter" runtime currently fails to load under Jest on this SDK).
// Convention: pure-logic tests are `*.test.ts` (node env, Babel type-strip).
// RN *component* tests are `*.test.tsx` (jest-expo) and are deferred to Wednesday,
// so `testMatch` deliberately matches only `.ts` (not `.tsx`).
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'babel-jest',
      {
        configFile: false, // ignore Expo's babel.config.js
        babelrc: false,
        presets: [require.resolve('@babel/preset-typescript')],
        plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
      },
    ],
  },
};
