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
        // ADR-0008 §TZ 3 層防御: 直接呼出禁止、core/datetime 経由必須 (Issue #17 AC2-1/AC2-2)
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message:
            'new Date() 引数なしの直接呼出禁止 (ADR-0008 §TZ 3 層防御)。src/core/datetime/clock.ts の nowUtc() を使用してください。',
        },
        {
          selector: "MemberExpression[property.name='getTimezoneOffset']",
          message:
            'getTimezoneOffset() 直接呼出禁止 (ADR-0008 §TZ 3 層防御、符号反転の罠)。src/core/datetime/tz.ts の getTzOffsetMin() を使用してください。',
        },
      ],
    },
  },
  // 例外: src/core/datetime/ 内部は実装上 new Date() / getTimezoneOffset() を使用する必要あり
  {
    files: ['src/core/datetime/**/*.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
]);
