// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'scripts/store-screenshots/**', 'scripts/debug/**'],
  },
  // app.config.ts uses dynamic env var access by design (required/optional helpers)
  {
    files: ['app.config.ts'],
    rules: {
      'expo/no-dynamic-env-var': 'off',
    },
  },
  // -----------------------------------------------------------------------
  // Hardcode detection — prevent app-specific values from leaking into src/
  // -----------------------------------------------------------------------
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^com\\.[a-z]+\\.[a-z]/]',
          message: 'Hardcoded package/bundle ID detected. Use app.config.ts + .env instead.',
        },
        {
          selector: 'Literal[value=/^ca-app-pub-/]',
          message: 'Hardcoded AdMob ID detected. Use app.config.ts extra + .env instead.',
        },
        {
          selector: 'Literal[value=/^appl_/]',
          message: 'Hardcoded RevenueCat iOS key detected. Use app.config.ts extra + .env instead.',
        },
        {
          selector: 'Literal[value=/^goog_/]',
          message:
            'Hardcoded RevenueCat Android key detected. Use app.config.ts extra + .env instead.',
        },
      ],
    },
  },
]);
