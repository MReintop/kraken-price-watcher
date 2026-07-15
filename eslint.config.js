// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  // Last: turns off every eslint rule that would fight prettier over formatting.
  // eslint judges correctness, prettier judges layout — no overlap.
  prettier,
  {
    // jest.doMock + resetModules only takes effect via a fresh require; an ESM
    // import hoists above the mock and defeats it.
    files: ['**/*.test.{ts,tsx}'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    ignores: ['dist/*', 'coverage/*', '.expo/*'],
  },
]);
