/**
 * scripts/config-check.mjs
 *
 * Validates Expo config against .env identity values and iOS compliance rules.
 *
 * Usage:
 *   node scripts/config-check.mjs
 *   pnpm config:check
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Load .env values ────────────────────────────────
function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!existsSync(envPath)) {
    return {};
  }
  const text = readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    env[key] = val;
  }
  return env;
}

const dotenv = loadEnv();

// ── Resolve Expo config ─────────────────────────────
let config;
try {
  const raw = execSync('npx expo config --type public --json', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 30_000,
  });
  config = JSON.parse(raw);
} catch (err) {
  console.error('Failed to resolve Expo config:', err.message);
  process.exit(2);
}

// For iOS build-time fields stripped from --type public, try introspect
let introspect;
try {
  const raw = execSync('npx expo config --type introspect --json', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 30_000,
  });
  introspect = JSON.parse(raw);
} catch {
  introspect = config;
}

// ── Rules ───────────────────────────────────────────
const rules = [
  {
    key: 'ios.bundleIdentifier',
    label: 'iOS bundle identifier matches .env',
    check: () => {
      const expected = dotenv.IOS_BUNDLE_IDENTIFIER;
      if (!expected) {
        return { ok: true, actual: '(skipped — IOS_BUNDLE_IDENTIFIER not in .env)', hint: '' };
      }
      const actual = config.ios?.bundleIdentifier;
      return {
        ok: actual === expected,
        actual: actual ?? '(not set)',
        hint: `expected "${expected}" from .env`,
      };
    },
  },
  {
    key: 'android.package',
    label: 'Android package matches .env',
    check: () => {
      const expected = dotenv.ANDROID_PACKAGE;
      if (!expected) {
        return { ok: true, actual: '(skipped — ANDROID_PACKAGE not in .env)', hint: '' };
      }
      const actual = config.android?.package;
      return {
        ok: actual === expected,
        actual: actual ?? '(not set)',
        hint: `expected "${expected}" from .env`,
      };
    },
  },
  {
    key: 'ios.config.usesNonExemptEncryption',
    label: 'iOS encryption compliance is set to false',
    check: () => {
      const val =
        introspect?.ios?.config?.usesNonExemptEncryption ??
        config?.ios?.config?.usesNonExemptEncryption;
      return {
        ok: val === false,
        actual: val === undefined ? '(not set)' : String(val),
        hint: 'set ios.config.usesNonExemptEncryption to false in app.config.ts',
      };
    },
  },
  {
    key: 'ios.privacyManifests',
    label: 'iOS privacy manifests are configured',
    check: () => {
      const pm = config.ios?.privacyManifests ?? introspect?.ios?.privacyManifests;
      const hasApiTypes =
        Array.isArray(pm?.NSPrivacyAccessedAPITypes) && pm.NSPrivacyAccessedAPITypes.length > 0;
      return {
        ok: hasApiTypes,
        actual: hasApiTypes
          ? `${pm.NSPrivacyAccessedAPITypes.length} API type(s) declared`
          : '(not set)',
        hint: 'add ios.privacyManifests.NSPrivacyAccessedAPITypes to app.config.ts (required by Apple)',
      };
    },
  },
];

// ── Execute rules ───────────────────────────────────
let failed = false;
for (const rule of rules) {
  const result = rule.check();
  const prefix = result.ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  const status = result.ok ? 'PASS' : 'FAIL';
  console.log(`${prefix} [${status}] ${rule.label}`);
  if (!result.ok) {
    console.log(`    actual: ${result.actual}`);
    if (result.hint) console.log(`    hint:   ${result.hint}`);
    failed = true;
  }
}

console.log();
if (failed) {
  console.error('Expo config check FAILED');
  process.exit(1);
} else {
  console.log('Expo config check passed');
}
