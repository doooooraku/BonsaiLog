import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SUPPORTED_PLATFORMS = new Set(['android', 'ios']);
const SUPPORTED_DEBUG_GEOGRAPHY = new Set([
  'DISABLED',
  'EEA',
  'NOT_EEA',
  'REGULATED_US_STATE',
  'OTHER',
]);

function parseArgs(argv) {
  const args = {
    platform: 'android',
    debugGeography: 'EEA',
    testDeviceIds: '',
    notes: '',
    out: null,
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--json') {
      args.json = true;
      continue;
    }
    if (token === '--platform') {
      args.platform = argv[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (token === '--debug-geography') {
      args.debugGeography = argv[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (token === '--test-device-ids') {
      args.testDeviceIds = argv[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (token === '--notes') {
      args.notes = argv[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (token === '--out') {
      args.out = argv[i + 1] ?? '';
      i += 1;
      continue;
    }
  }

  return args;
}

function normalizeDebugGeography(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_');
}

function parseTestDeviceIds(value) {
  const ids = String(value ?? '')
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);
  return [...new Set(ids)];
}

function evaluateConfig(args) {
  const platform = String(args.platform ?? '')
    .toLowerCase()
    .trim();
  const debugGeography = normalizeDebugGeography(args.debugGeography);
  const testDeviceIds = parseTestDeviceIds(args.testDeviceIds);

  const checks = [
    {
      key: 'platform',
      label: 'Platform is android or ios',
      ok: SUPPORTED_PLATFORMS.has(platform),
      actual: platform || '(empty)',
    },
    {
      key: 'debugGeographySupported',
      label: 'Debug geography is supported by react-native-google-mobile-ads',
      ok: SUPPORTED_DEBUG_GEOGRAPHY.has(debugGeography),
      actual: debugGeography || '(empty)',
    },
    {
      key: 'debugGeographyIsEea',
      label: 'Debug geography is EEA for consent validation',
      ok: debugGeography === 'EEA',
      actual: debugGeography || '(empty)',
    },
    {
      key: 'testDeviceIdsProvided',
      label: 'At least one test device ID is provided',
      ok: testDeviceIds.length > 0,
      actual: testDeviceIds.length > 0 ? `${testDeviceIds.length} IDs` : '(none)',
    },
  ];

  const failedChecks = checks.filter((check) => !check.ok);
  return {
    platform,
    debugGeography,
    testDeviceIds,
    checks,
    failedChecks,
    passed: failedChecks.length === 0,
  };
}

function toMarkdown(report, notes) {
  const lines = [
    '# UMP EEA Validation Checklist',
    '',
    `- generatedAt: ${new Date().toISOString()}`,
    `- platform: ${report.platform || '(empty)'}`,
    `- debugGeography: ${report.debugGeography || '(empty)'}`,
    `- testDeviceIdsCount: ${report.testDeviceIds.length}`,
    `- passed: ${report.passed ? 'yes' : 'no'}`,
    '',
    '## Validation Checks',
  ];

  for (const check of report.checks) {
    const state = check.ok ? 'PASS' : 'FAIL';
    lines.push(`- [${state}] ${check.label} (actual: ${check.actual})`);
  }

  if (notes && notes.trim()) {
    lines.push('', '## Notes', notes.trim());
  }

  lines.push(
    '',
    '## Manual Validation Steps (Free/Pro)',
    '1. Launch Free plan build with `ADMOB_CONSENT_DEBUG_GEOGRAPHY=EEA`.',
    '2. Confirm consent flow appears when required.',
    '3. Confirm banner appears only after `canRequestAds=true`.',
    '4. Switch to Pro and confirm banner is never mounted.',
    '',
    '## Log Points',
    '- Android log capture command:',
    '  - `adb logcat -d | grep -E "AdsConsent|canRequestAds|privacyOptionsRequirementStatus|AdBanner"`',
    '- iOS simulator log capture command:',
    '  - `xcrun simctl spawn booted log stream --predicate \'eventMessage CONTAINS "AdsConsent" OR eventMessage CONTAINS "canRequestAds"\'`',
  );

  return `${lines.join('\n')}\n`;
}

function run() {
  const args = parseArgs(process.argv.slice(2));
  const report = evaluateConfig(args);

  if (args.out) {
    const outPath = path.isAbsolute(args.out) ? args.out : path.join(ROOT, args.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, toMarkdown(report, args.notes), 'utf8');
  }

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          ...report,
          notes: args.notes ?? '',
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`platform: ${report.platform}`);
    console.log(`debugGeography: ${report.debugGeography}`);
    console.log(`testDeviceIdsCount: ${report.testDeviceIds.length}`);
    console.log(`passed: ${report.passed ? 'yes' : 'no'}`);
  }

  if (!report.passed) {
    process.exitCode = 1;
  }
}

run();
