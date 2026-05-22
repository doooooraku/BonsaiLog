// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      'scripts/store-screenshots/**',
      'scripts/debug/**',
      'scripts/ui-diff/**',
      'docs/mockups/**', // OpenDesign 生成物 (凍結保管、BonsaiLog 規則の対象外)
    ],
  },
  // S3 (2026-05-13): import/no-cycle を error 化 (ADR-0024 Phase G retro より)。
  // 型循環依存 (Store ↔ Screen) を静的に検出。型は Store 側で定義する規約は AGENTS.md。
  {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    rules: {
      'import/no-cycle': ['error', { maxDepth: 10, ignoreExternal: true }],
    },
  },
  // R-52 (Sess34 PR-13): EventType switch case 漏れ silent bug 防止 (2 段階防御)。
  //
  // 段階 1: 型システム — buildHistoryChips / EventIcons は switch default で
  //         `const _exhaustive: never = type` assertion を実装済 (Phase η PR-2 / Phase θ PR-8b)。
  //         新規 EventType 追加時に default case で type 'string' を never 代入できず compile error。
  //
  // 段階 2: exhaustive 走査 unit test — `__tests__/components/icons/EventIcons.test.tsx` で
  //         `test.each(EVENT_TYPES)` パターンで 14 種別すべてが non-null React element を返す
  //         assertion を実行。 silent miss を runtime 検出。
  //
  // ESLint `@typescript-eslint/switch-exhaustiveness-check` rule は parserOptions.project
  // (typed linting) 設定が必要で導入コスト大。 既に上記 2 段階防御で十分強固な検出力があるため、
  // 本 PR では rule 導入を見送り、 必要に応じて将来 typed linting 移行時に追加検討。
  //
  // 関連: ADR-0041 Phase η/θ / R-52 (specialized.md) / Sess16 PR-E silent bug 起点
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
        // P7 Event.kind 誤参照防止 (Issue retro 2026-05-03 L3 由来)。
        // schema.ts 上の Event 型は `type` フィールドを持ち、`kind` は存在しない。
        // 本セッションで F-04 純関数で `event.kind` を 2 箇所書いてしまい type-check fail で気付いた。
        // 構造的に防ぐため、events と思われる変数の `.kind` アクセスを禁止する。
        // 例外: 他テーブル (例えば `eventOverloadKind` 等) で `kind` という名のローカル変数は別物なので、
        //       `Identifier[name=/^(event|wiringEvent|wateringEvent|ev)s?$/]` 限定で検査する。
        {
          selector:
            "MemberExpression[object.name=/^(event|wiringEvent|wateringEvent|ev)s?$/][property.name='kind']",
          message:
            'Event 型に kind フィールドはありません (schema.ts 参照、`type` を使ってください、Issue retro 2026-05-03 L3)。',
        },
      ],
      // P3 expo-file-system の旧 namespace import 禁止 (Issue retro 2026-05-03 L4 由来)。
      // expo SDK 55 から新 API (`{ File, Paths, Directory }`) が正、`import * as FileSystem` の
      // namespace import は `cacheDirectory` / `EncodingType` が解決できず lint fail。
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'expo-file-system',
              importNames: ['default'],
              message:
                'expo-file-system の namespace / default import は旧 API です。`import { File, Paths, Directory } from "expo-file-system"` を使用してください (SDK 55+、Issue retro 2026-05-03 L4)。',
            },
          ],
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
  // Sess28 PR-1 (ADR-0037 連動 hot-fix): __tests__/**/*.{js,ts,tsx} に Jest globals + Node.js globals。
  // Sess26 で追加された __tests__/scripts/*.test.js + 既存 __tests__/**/*.test.ts で `describe`/`test`/`expect`
  // /`__dirname` が no-undef となる pre-existing fail を解消。 eslint-config-expo/flat は jest env を
  // 自動付与しないため、 明示登録が必要。
  {
    files: ['__tests__/**/*.{js,ts,tsx}'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        process: 'readonly',
      },
    },
  },
  // app/ 配下にも no-restricted-imports と Event.kind 禁止を適用
  {
    files: ['app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'expo-file-system',
              importNames: ['default'],
              message:
                'expo-file-system の namespace / default import は旧 API です。`import { File, Paths, Directory } from "expo-file-system"` を使用してください (SDK 55+、Issue retro 2026-05-03 L4)。',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.name=/^(event|wiringEvent|wateringEvent|ev)s?$/][property.name='kind']",
          message:
            'Event 型に kind フィールドはありません (schema.ts 参照、`type` を使ってください、Issue retro 2026-05-03 L3)。',
        },
      ],
    },
  },
]);
