// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const boundaries = require('eslint-plugin-boundaries');

// Sess66 PR3 / ADR-0052: local plugin で dark cascade 違反 (StyleSheet 内 static 色) を CI gate。
const localPlugin = require('./eslint-rules');

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
  // jest.setup.js は CJS + jest globals 環境。 flat config では eslint-env directive が
  // 機能しないため、 ファイル指定で globals.jest を明示。 (Sess62 R-Sess62-59 後追い)
  {
    files: ['jest.setup.js'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        require: 'readonly',
        module: 'readonly',
      },
    },
  },
  // Phase 3 Step 3 (PR 3-1a): typed-linting で async 安全ルールを error 化。
  // god 分割(Phase 4)前の安全網。await 漏れ(floating promise)/ Promise 誤用を型情報で検出。
  // projectService=高速 API(tsconfig 自動探索)。
  // 注1: eslint-config-expo が既に @typescript-eslint プラグインを登録済みのため、プラグイン再登録
  //      ("Cannot redefine plugin") を避け、rules のみ指定する(tseslint は parserOptions 用に require)。
  // 注2: strict-type-checked プリセット全体は 597 errors(大半が整形系)で安全網の目的外のため不採用。
  //      安全網に資する named rule のみを段階導入する(PR 3-1a=async / PR 3-1b=no-unsafe-*)。
  {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    languageOptions: {
      // projectService=tsconfig 自動探索(tsconfigRootDir 省略時は cwd=リポジトリ root)。
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      // checksVoidReturn.attributes=false: JSX 属性(onPress 等)の async handler は
      // RN では fire-and-forget が慣例で安全。void 包みは実保護を足さず churn のみのため対象外化。
      // property / argument / 条件式での Promise 誤用(実害が出やすい)は引き続き error 検出。
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      // PR 3-1b: any 由来値の unsafe 操作(代入/メンバ参照/呼出/返却/引数)を error 化。
      // any の伝播を境界で堰き止め、god 分割(Phase 4)時の型崩れを検出する。
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
    },
  },
  // S3 (2026-05-13): import/no-cycle を error 化 (ADR-0024 Phase G retro より)。
  // 型循環依存 (Store ↔ Screen) を静的に検出。型は Store 側で定義する規約は AGENTS.md。
  {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    rules: {
      'import/no-cycle': ['error', { maxDepth: 10, ignoreExternal: true }],
    },
  },
  // Phase 6 (FSD 境界整理): eslint-plugin-boundaries で層間 import を静的検査。
  // 層定義と allow-matrix の正は ADR-0048。PR 6-1〜6-4 で全違反解消後、本 PR 6-5 で
  // error 化 (CI=verify:lint で gate)。新規の層違反混入は CI が error として弾く。
  // 解決は expo flat config の import/resolver.typescript:true(@/ エイリアス対応)に依存。
  {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'app', pattern: 'app', mode: 'folder' },
        { type: 'features', pattern: 'src/features', mode: 'folder' },
        { type: 'components', pattern: 'src/components', mode: 'folder' },
        { type: 'core', pattern: 'src/core', mode: 'folder' },
        { type: 'db', pattern: 'src/db', mode: 'folder' },
        { type: 'services', pattern: 'src/services', mode: 'folder' },
        { type: 'stores', pattern: 'src/stores', mode: 'folder' },
        { type: 'types', pattern: 'src/types', mode: 'folder' },
        { type: 'dev', pattern: 'src/dev', mode: 'folder' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          rules: [
            // app / dev(開発専用): 上位 entry は全層へ依存可
            {
              from: { type: ['app', 'dev'] },
              allow: {
                to: {
                  type: [
                    'app',
                    'features',
                    'components',
                    'core',
                    'db',
                    'services',
                    'stores',
                    'types',
                    'dev',
                  ],
                },
              },
            },
            {
              from: { type: 'features' },
              allow: {
                to: {
                  type: ['features', 'components', 'core', 'db', 'services', 'stores', 'types'],
                },
              },
            },
            // components→db は EventIcons の `type EventType` のみ(将来 types/ 移設候補、ADR-0048 注記)
            {
              from: { type: 'components' },
              allow: { to: { type: ['components', 'core', 'types', 'db'] } },
            },
            // core→stores は禁止(F1)。core は最下層付近、types/core のみ依存可。
            { from: { type: 'core' }, allow: { to: { type: ['core', 'types'] } } },
            // db→core は ADR-0008 が強制(nowUtc 等 datetime)。db→services(F2)/db→features(F3) は禁止。
            { from: { type: 'db' }, allow: { to: { type: ['db', 'core', 'types'] } } },
            // services→core は appExtra/debug の config 参照(正当)。
            { from: { type: 'services' }, allow: { to: { type: ['services', 'core', 'types'] } } },
            // stores→services は F4 を層定義で合法化(proStore→proService)。
            {
              from: { type: 'stores' },
              allow: { to: { type: ['stores', 'services', 'db', 'core', 'types'] } },
            },
            { from: { type: 'types' }, allow: { to: { type: ['types'] } } },
          ],
        },
      ],
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
  // Sess66 PR3 / Sess68 PR #D / ADR-0052: dark theme cascade ガード (段階導入完了、 恒久化)。
  // StyleSheet.create() 内に theme-dependent color token (BG_PRIMARY 等) を書くことを
  // 構造検出し、 inline c.* (useColors hook 経由) を強制する。
  //
  // 段階運用 (完了):
  //   - PR3 (Sess66、 #940):     rule 導入 + 'warn' level + 既存 ~245 違反は許容
  //   - PR4-6 (Sess66、 #941-#949): 配色 pivot / 戻る動線統一 / component 徹底化と並行して
  //                                  違反を漸進修正、 累計 122 件解消
  //   - PR6c.3 + Sess68 #A/B/C (#950-#952): 統合 PR で残 131 件を完走、 違反 0 到達
  //   - PR #D (Sess68、 本 PR):   'error' に昇格 → CI で構造禁止 (新規違反 0 を恒久維持)
  //
  // error 昇格後の運用: 新規 PR で違反が混入すると CI fail → merge block。
  // 開発者は inline c.* 必須を ESLint 即時 feedback で学習。
  //
  // 関連: ADR-0052 / docs/reference/design_system.md §2-4 / Sess65 PR #938 #939 / Sess68 PR #C #952
  // -----------------------------------------------------------------------
  {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    plugins: { local: localPlugin },
    rules: {
      // Sess70 PR-D: FORBIDDEN_TOKENS 8 種 → 16 種拡張 (brand-static 撤回)。
      // 既存 PR-C1-C3 で主要 cascade 対応、 残違反は PR-E (将来) で 0 化 → error 昇格予定。
      // Sess66 PR3 → Sess68 PR #D と同じ段階移行 (warn → 違反 0 化 → error)。
      'local/no-color-token-in-stylesheet': 'warn',
      // Sess70 PR-D / ADR-0052 Amendment: hex literal 禁止 (StyleSheet 内)。
      // 例外: 'transparent' / 'rgba()' は通過、 写真 overlay 等は reason marker (5 件以下上限)。
      // PR-D 段階導入 (warn)、 既存違反 0 化後 error 昇格予定 (PR-E)。
      'local/no-color-hex-literal-in-stylesheet': 'warn',
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
