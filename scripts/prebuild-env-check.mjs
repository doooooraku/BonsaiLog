#!/usr/bin/env node
/**
 * Pre-build environment variable check.
 *
 * Verifies that critical API keys are present before starting a production
 * or preview build.  Without these keys the binary will ship with empty
 * strings and features like in-app purchases will silently fail at runtime.
 *
 * Two layers of checks:
 *   1. Local .env file — catches local-build mistakes
 *   2. EAS server-side env:list — catches the real source of truth that
 *      `eas build` will inject. Only runs when EXPO_TOKEN is set (CI or
 *      authenticated developer machine).
 *
 * Usage:
 *   node scripts/prebuild-env-check.mjs          # check all keys
 *   node scripts/prebuild-env-check.mjs android   # check Android keys only
 *   node scripts/prebuild-env-check.mjs ios       # check iOS keys only
 */
import { config } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

const platform = (process.argv[2] ?? 'all').toLowerCase();

// Escape hatch for the FIRST build (Phase 3.5 smoke test):
// Before you have RevenueCat API keys, you still need to build a Dev APK to
// install on a device. Set SKIP_KEYS=1 to bypass this check.
//
// Usage:
//   SKIP_KEYS=1 pnpm build:android:apk:local
//
// ⚠ Never use SKIP_KEYS=1 for production builds — the app will ship with
// empty API keys and IAP/ads will silently fail.
if (process.env.SKIP_KEYS === '1') {
  console.log('\x1b[33m⚠ SKIP_KEYS=1 set — bypassing pre-build env check (Phase 3.5 mode)\x1b[0m');
  console.log('  Do NOT use this for production builds.');
  process.exit(0);
}

// TODO: Replace with your app's required environment variable names.
// These are the keys that MUST be present in the built binary for the app
// to function correctly (IAP, ads, etc.).
const KEYS = {
  android: ['REVENUECAT_ANDROID_API_KEY'],
  ios: ['REVENUECAT_IOS_API_KEY'],
};

const keysToCheck =
  platform === 'all'
    ? [...KEYS.android, ...KEYS.ios]
    : (KEYS[platform] ?? [...KEYS.android, ...KEYS.ios]);

// ---------------------------------------------------------------------------
// Layer 1: local .env check
// ---------------------------------------------------------------------------
const missing = keysToCheck.filter((key) => !process.env[key] || process.env[key].trim() === '');

if (missing.length > 0) {
  console.error(
    '\n\x1b[31m✗ Pre-build check failed: missing required environment variables:\x1b[0m\n',
  );
  for (const key of missing) {
    console.error(`   - ${key}`);
  }
  console.error('\n  Set them in .env or EAS environment variables before building.\n');
  process.exit(1);
}

console.log('\x1b[32m✓ Pre-build env check passed (local .env)\x1b[0m');

// ---------------------------------------------------------------------------
// Layer 1.7: RevenueCat API key 接頭辞 verify (Sess81 R-68)
// ---------------------------------------------------------------------------
// 取り違え事故防止: Android 用キーは `goog_` 始まり、 iOS 用キーは `appl_` 始まり。
// 公開ドキュメント: https://www.revenuecat.com/docs/welcome/authentication#api-key-prefixes
// 違反例 (= Sess81 R-68 由来): iOS と Android のキーを取り違えて埋め込むと、
// 起動時の Purchases.configure() は成功するが、 getOfferings() が常に null を返す
// → Paywall「利用不可」 + 「Package not found」 エラー、 jest / Maestro mock では検出不可。
// ESLint rule `expo/no-dynamic-env-var` を満たすため、 process.env への
// アクセスは明示 key 名で行う (= dynamic access 禁止)。 CI workflow が iOS キー
// に `placeholder` を入れる場合をスキップ (= build-android-play.yml L55)。
const RC_KEY_CHECKS = [
  {
    key: 'REVENUECAT_ANDROID_API_KEY',
    value: process.env.REVENUECAT_ANDROID_API_KEY,
    expectedPrefix: 'goog_',
  },
  {
    key: 'REVENUECAT_IOS_API_KEY',
    value: process.env.REVENUECAT_IOS_API_KEY,
    expectedPrefix: 'appl_',
  },
];
const prefixViolations = [];
for (const { key, value, expectedPrefix } of RC_KEY_CHECKS) {
  if (!keysToCheck.includes(key)) continue;
  if (value === 'placeholder') continue;
  if (value && !value.startsWith(expectedPrefix)) {
    prefixViolations.push({ key, expected: expectedPrefix, actualPrefix: value.slice(0, 6) });
  }
}
if (prefixViolations.length > 0) {
  console.error('\n\x1b[31m✗ RevenueCat API key prefix mismatch (Sess81 R-68):\x1b[0m\n');
  for (const v of prefixViolations) {
    console.error(`   - ${v.key}: expected "${v.expected}*", got "${v.actualPrefix}..."`);
  }
  console.error('\n  iOS / Android キーを取り違えていませんか?');
  console.error('  公開ドキュメント: https://www.revenuecat.com/docs/welcome/authentication\n');
  process.exit(1);
}
console.log('\x1b[32m✓ RevenueCat API key prefix check passed\x1b[0m');

// ---------------------------------------------------------------------------
// Layer 1.5: Existing AndroidManifest.xml AdMob APPLICATION_ID validation
// ---------------------------------------------------------------------------
// 過去の prebuild で空文字列 / プレースホルダーが埋め込まれた AndroidManifest.xml が
// android/ に残存している場合、Gradle ビルドはそのまま走り、起動時に AdMob
// MobileAdsInitProvider が IllegalStateException で即死する (ネイティブ層クラッシュ、
// JS ログには現れない)。
// 過去 lesson: docs/reference/tasks/lessons/build.md "AdMob Invalid application ID"
//
// 検査対象は Android のみ (iOS は Info.plist で同種の問題が起きるが本検査外)。
if (platform === 'all' || platform === 'android') {
  const manifestPath = resolve(__dirname, '..', 'android/app/src/main/AndroidManifest.xml');
  if (existsSync(manifestPath)) {
    const manifest = readFileSync(manifestPath, 'utf8');
    const match = manifest.match(
      /com\.google\.android\.gms\.ads\.APPLICATION_ID"\s+android:value="([^"]*)"/,
    );
    const ADMOB_APP_ID_PATTERN = /^ca-app-pub-\d{16}~\d{10}$/;
    if (match && !ADMOB_APP_ID_PATTERN.test(match[1])) {
      console.error('\n\x1b[31m✗ AndroidManifest.xml の AdMob APPLICATION_ID が無効です:\x1b[0m');
      console.error(`   現在値: "${match[1]}"`);
      console.error('   期待: ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX 形式');
      console.error(
        '\n   原因: 古い prebuild 産物が残存している可能性があります (lessons/build.md 参照)',
      );
      console.error(
        '   対処: npx expo prebuild --platform android --clean で android/ を再生成してください\n',
      );
      process.exit(1);
    }
    if (match) {
      console.log('\x1b[32m✓ AndroidManifest.xml AdMob APPLICATION_ID is valid\x1b[0m');
    }
  }
}

// ---------------------------------------------------------------------------
// Layer 2: EAS server-side env:list check
// ---------------------------------------------------------------------------
if (!process.env.EXPO_TOKEN) {
  console.log('  ℹ Skipping EAS server-side env check (no EXPO_TOKEN in environment)');
  process.exit(0);
}

console.log('  Checking EAS server-side environment variables (production)...');

const easBin = process.env.CI === 'true' ? 'eas' : 'npx --yes eas-cli';
const isCI = process.env.CI === 'true';

const candidates = [
  `${easBin} env:list production`,
  `${easBin} env:list --environment production`,
  `${easBin} env:list`,
];

let easOutput = null;
for (const cmd of candidates) {
  try {
    easOutput = execSync(cmd, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
    break;
  } catch {
    // try next candidate
  }
}

if (easOutput === null) {
  if (isCI) {
    console.error('\x1b[31m✗ EAS env:list failed\x1b[0m');
    process.exit(1);
  }
  console.warn('  \x1b[33m⚠ Skipping EAS check (local mode)\x1b[0m');
  process.exit(0);
}

const easMissing = keysToCheck.filter((key) => !easOutput.includes(key));

if (easMissing.length > 0) {
  const fatal = isCI;
  const color = fatal ? '\x1b[31m' : '\x1b[33m';
  const mark = fatal ? '✗' : '⚠';
  console.error(`\n${color}${mark} EAS server-side env check: keys not registered:\x1b[0m\n`);
  for (const key of easMissing) {
    console.error(`   - ${key}`);
  }
  if (fatal) process.exit(1);
} else {
  console.log('  \x1b[32m✓ EAS server-side env check passed\x1b[0m');
}
