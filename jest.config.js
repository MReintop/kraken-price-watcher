// No Expo preset: its "winter" runtime fails to load under Jest on this SDK, so
// both projects configure the transform themselves.
//   • logic      → pure *.test.ts, node env, Babel type-strip
//   • components → *.test.tsx rendered through react-native-web in jsdom
//                  (the working alternative to the broken RNTL renderer)
const tsPreset = require.resolve('@babel/preset-typescript');
const reactPreset = require.resolve('@babel/preset-react');
const modulesCjs = require.resolve('@babel/plugin-transform-modules-commonjs');

const babel = (presets) => ({
  '^.+\\.tsx?$': [
    'babel-jest',
    { configFile: false, babelrc: false, presets, plugins: [modulesCjs] },
  ],
});

// Both projects share a TS + JSX transform. The react preset lets the `logic`
// project *instrument* .tsx files for coverage (they're pulled in by the
// root-level collectCoverageFrom below) without hitting JSX syntax errors — it
// still only RUNS .ts tests via its testMatch. .test.ts files carry no JSX, so
// the preset is a no-op for them.
const transform = babel([tsPreset, [reactPreset, { runtime: 'automatic' }]]);

module.exports = {
  coverageDirectory: '<rootDir>/coverage',
  // NOTE: coverage collection MUST be configured at the root — Jest ignores
  // `collectCoverageFrom` set inside `projects[]`, which silently limited the
  // report to only the files a test happened to import. Root-level globs force
  // every source file into the report (untested ones show at 0%).
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/*.test.{ts,tsx}',
    '!**/*.d.ts',
    '!**/*.config.{js,ts}',
    '!test/**',
    '!index.ts',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/test/', // mocks are executed via moduleNameMapper
    '<rootDir>/coverage/',
  ],
  // Set a few points under current, so a real regression trips them but ordinary
  // churn doesn't. Raise them when the real number rises; a floor nobody can
  // cross is not a floor.
  coverageThreshold: {
    global: { statements: 92, branches: 84, functions: 90, lines: 94 },
  },
  projects: [
    {
      displayName: 'logic',
      testEnvironment: 'node',
      testMatch: ['**/*.test.ts'],
      transform,
    },
    {
      displayName: 'components',
      testEnvironment: 'jsdom',
      testMatch: ['**/*.test.tsx'],
      transform,
      // Render RN primitives as DOM via react-native-web; stub the icon font
      // and the (ESM) navigation package so tests don't transform them.
      moduleNameMapper: {
        '^react-native$': 'react-native-web',
        '^@expo/vector-icons(.*)$': '<rootDir>/test/mocks/vectorIcons.tsx',
        '^@react-navigation/native$': '<rootDir>/test/mocks/reactNavigation.ts',
        '^react-native-safe-area-context$':
          '<rootDir>/test/mocks/safeAreaContext.tsx',
        '^react-native-svg$': '<rootDir>/test/mocks/reactNativeSvg.tsx',
      },
      transformIgnorePatterns: ['node_modules/(?!(react-native-web)/)'],
    },
  ],
};
