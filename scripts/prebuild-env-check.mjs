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
