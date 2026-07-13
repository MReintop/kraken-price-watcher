// Two Jest projects, both bypassing the jest-expo preset (its Expo "winter"
// runtime fails to load under Jest on this SDK):
//   • logic      → pure *.test.ts, node env, Babel type-strip
//   • components → *.test.tsx rendered through react-native-web in jsdom
//                  (the working alternative to the broken RNTL/jest-expo renderer)
const tsPreset = require.resolve('@babel/preset-typescript');
const reactPreset = require.resolve('@babel/preset-react');
const modulesCjs = require.resolve('@babel/plugin-transform-modules-commonjs');

const babel = (presets) => ({
  '^.+\\.tsx?$': [
    'babel-jest',
    { configFile: false, babelrc: false, presets, plugins: [modulesCjs] },
  ],
});

module.exports = {
  coverageDirectory: '<rootDir>/coverage',
  projects: [
    {
      displayName: 'logic',
      testEnvironment: 'node',
      testMatch: ['**/*.test.ts'],
      transform: babel([tsPreset]),
      // No JSX preset here → only instrument .ts files for coverage.
      collectCoverageFrom: [
        '**/*.ts',
        '!**/*.test.ts',
        '!**/*.d.ts',
        '!*.config.ts',
        '!test/**',
        '!index.ts',
      ],
    },
    {
      displayName: 'components',
      testEnvironment: 'jsdom',
      testMatch: ['**/*.test.tsx'],
      transform: babel([tsPreset, [reactPreset, { runtime: 'automatic' }]]),
      // Render RN primitives as DOM via react-native-web; stub the icon font
      // and the (ESM) navigation package so tests don't transform them.
      moduleNameMapper: {
        '^react-native$': 'react-native-web',
        '^@expo/vector-icons(.*)$': '<rootDir>/test/mocks/vectorIcons.tsx',
        '^@react-navigation/native$': '<rootDir>/test/mocks/reactNavigation.ts',
        '^react-native-safe-area-context$':
          '<rootDir>/test/mocks/safeAreaContext.tsx',
      },
      transformIgnorePatterns: ['node_modules/(?!(react-native-web)/)'],
      // JSX preset here → instrument .tsx files for coverage.
      collectCoverageFrom: ['**/*.tsx', '!**/*.test.tsx', '!test/**'],
      // Mocks are executed via moduleNameMapper → exclude them from coverage.
      coveragePathIgnorePatterns: ['/node_modules/', '<rootDir>/test/'],
    },
  ],
};
