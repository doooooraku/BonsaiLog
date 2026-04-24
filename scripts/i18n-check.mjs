/**
 * i18n-check.mjs — CI/local i18n quality gate
 *
 * Runs two checks against en.ts (base language):
 *   1. unused keys  → warning (keys defined but not referenced in code)
 *   2. missing keys = 0 → FAIL (code references keys not defined in en.ts)
 *
 * Gate 1 is a warning because templates intentionally pre-define boilerplate
 * keys before app code references them. Gate 2 is a hard failure because
 * missing keys cause runtime translation bugs.
 *
 * Usage:
 *   node scripts/i18n-check.mjs
 *   pnpm i18n:check
 *
 * Exit code:
 *   0 = pass
 *   1 = fail (missing >= 1)
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Run i18n-audit.mjs and get JSON report
const auditJson = execSync(
  `node ${path.join(ROOT, 'scripts/i18n-audit.mjs')} en --inventory --json`,
  { cwd: ROOT, encoding: 'utf8' },
);
const report = JSON.parse(auditJson);

let failed = false;

// Gate 1: Unused keys (warning only — templates pre-define boilerplate keys)
if (report.unusedCandidates.length > 0) {
  console.warn(`WARN: ${report.unusedCandidates.length} unused i18n key(s) in en.ts`);
}

// Gate 2: No missing keys
if (report.missingUsed.length > 0) {
  console.error(`FAIL: ${report.missingUsed.length} missing used key(s) in en.ts`);
  for (const key of report.missingUsed) {
    console.error(`  - ${key}`);
  }
  failed = true;
}

if (failed) {
  process.exit(1);
}

const unusedNote =
  report.unusedCandidates.length > 0 ? `, ${report.unusedCandidates.length} unused` : '';
console.log(`i18n check passed (${report.usedKeysInApp} used, 0 missing${unusedNote})`);
