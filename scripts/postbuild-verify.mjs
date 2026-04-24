#!/usr/bin/env node
/**
 * Post-build verification script.
 *
 * Extracts assets/app.config from an APK, AAB, or IPA and verifies that
 * required API keys are embedded (not empty).  Exits with code 1 if
 * any required key is missing so CI / build scripts can catch it.
 *
 * Usage:
 *   node scripts/postbuild-verify.mjs <path-to-apk-aab-or-ipa>
 */
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { resolve, extname } from 'node:path';

// ---------------------------------------------------------------------------
// TODO: Replace with your app's required keys.
// These keys must be embedded in the built binary for the app to work.
// ---------------------------------------------------------------------------
const REQUIRED_KEYS_ANDROID = ['REVENUECAT_ANDROID_API_KEY', 'REVENUECAT_IOS_API_KEY'];

const REQUIRED_KEYS_IOS = ['REVENUECAT_IOS_API_KEY'];

// Keys to display for informational purposes (always shown)
const INFO_KEYS = [
  'IAP_DEBUG',
  'SCREENSHOT_MODE',
  'ADMOB_ANDROID_BANNER_ID',
  'ADMOB_IOS_BANNER_ID',
];

// ---------------------------------------------------------------------------

const archivePath = process.argv[2];
if (!archivePath) {
  console.error('Usage: node scripts/postbuild-verify.mjs <path-to-apk-aab-or-ipa>');
  process.exit(1);
}

const absPath = resolve(process.cwd(), archivePath);
const ext = extname(absPath).toLowerCase();
const isIOS = ext === '.ipa';
const REQUIRED_KEYS = isIOS ? REQUIRED_KEYS_IOS : REQUIRED_KEYS_ANDROID;

let buf;
try {
  buf = readFileSync(absPath);
} catch {
  console.error(`\x1b[31m✗ File not found: ${absPath}\x1b[0m`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Extract assets/app.config from ZIP (APK, AAB, IPA are all ZIP format)
// ---------------------------------------------------------------------------
function extractAppConfig(buffer) {
  let offset = 0;
  while (offset < buffer.length - 4) {
    if (
      buffer[offset] === 0x50 &&
      buffer[offset + 1] === 0x4b &&
      buffer[offset + 2] === 0x03 &&
      buffer[offset + 3] === 0x04
    ) {
      const compressionMethod = buffer.readUInt16LE(offset + 8);
      const compSize = buffer.readUInt32LE(offset + 18);
      const nameLen = buffer.readUInt16LE(offset + 26);
      const extraLen = buffer.readUInt16LE(offset + 28);
      const name = buffer.toString('utf8', offset + 30, offset + 30 + nameLen);

      if (name.endsWith('assets/app.config')) {
        const dataStart = offset + 30 + nameLen + extraLen;
        const compData = buffer.slice(dataStart, dataStart + compSize);

        if (compressionMethod === 0) return compData.toString('utf8');
        if (compressionMethod === 8) return inflateRawSync(compData).toString('utf8');

        throw new Error(`Unsupported compression method: ${compressionMethod}`);
      }

      offset = offset + 30 + nameLen + extraLen + compSize;
    } else {
      offset++;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------

const raw = extractAppConfig(buf);
if (!raw) {
  console.error('\x1b[31m✗ assets/app.config not found in the archive.\x1b[0m');
  process.exit(1);
}

let config;
try {
  config = JSON.parse(raw);
} catch {
  console.error('\x1b[31m✗ assets/app.config is not valid JSON.\x1b[0m');
  process.exit(1);
}

const extra = config.extra ?? {};

const platform = isIOS ? 'iOS' : 'Android';
console.log(`\n  Post-build verification (${platform}): ${archivePath}\n`);

const missing = [];

for (const key of REQUIRED_KEYS) {
  const value = extra[key];
  if (value && String(value).trim() !== '') {
    const masked = String(value).substring(0, 10) + '...';
    console.log(`  \x1b[32m✓\x1b[0m ${key} = ${masked}`);
  } else {
    console.log(`  \x1b[31m✗\x1b[0m ${key} = \x1b[31m(empty)\x1b[0m`);
    missing.push(key);
  }
}

console.log('');

for (const key of INFO_KEYS) {
  const value = extra[key];
  const display = value && String(value).trim() !== '' ? String(value) : '(empty)';
  console.log(`  ℹ ${key} = ${display}`);
}

console.log('');

if (missing.length > 0) {
  console.error(
    `\x1b[31m✗ Post-build check FAILED: ${missing.length} required key(s) missing.\x1b[0m`,
  );
  process.exit(1);
}

console.log('\x1b[32m✓ Post-build check passed: all required keys are embedded.\x1b[0m\n');
