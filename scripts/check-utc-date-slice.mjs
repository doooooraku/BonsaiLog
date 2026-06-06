#!/usr/bin/env node
/**
 * check-utc-date-slice.mjs (Sess36 PR-9、 ADR-0008 §TZ Notes Amended / R-9 昇華)
 *
 * UTC 日付取得 → ローカル日付として使ってしまう pattern を検出して CI で fail させる。
 *
 * 動機 (Sess36 PR-7 実機検証で発覚):
 * - 旧コードで `(nowUtc() as string).slice(0, 10)` を「今日のローカル日付」 default として
 *   使う pattern が 3 file で定着 (Sess16 PR-A2/B2/H 由来)
 * - `.slice(0, 10)` は UTC 日付 (例: JST 早朝 = UTC 前日) を返すため、 JST 早朝 (00:00-09:00) に
 *   form の日付欄が「昨日」 化する bug
 * - ADR-0008 §TZ 3 層防御 Notes Amended (Sess36 PR-8) で `toLocalDateKey()` を 6 つ目の
 *   正式ラッパーに昇格、 本 lint で禁止 pattern を CI 強制
 *
 * 検出 pattern:
 * - `nowUtc().slice(0, 10)` (UTC 日付取得)
 * - `(nowUtc() as string).slice(0, 10)` (Branded Type unwrap 経由、 同じ本質)
 * - `new Date().toISOString().slice(0, 10)` (ESLint 既存禁止 pattern も再保険)
 * - `<variable>.toISOString().slice(0, 10)` (Sess67 LabeledDateRow bug 由来、 変数経由でもアウト)
 *
 * 例外 (機械処理用、 user 体感「日付」 ではない):
 * - `app/export/*` — CSV ファイル名 / PDF 生成時刻ラベル等
 *
 * 行末 suppress: `// lint:utc-date-slice-allow` を同行に付けると skip。
 * 「ローカル日 0:00 を UTC ms に丸めてから ISO 化する正規トリック」 (dateUtils.ts toLocalDateKey 等)
 * のみで使用すること。 通常の UTC 日付取得は禁止 (本 lint の存在意義)。
 *
 * 違反検出時 exit 1。 `pnpm verify` chain (package.json) に組込。
 *
 * @see docs/adr/ADR-0008-f02-event-data-model.md Notes Amended (Sess36 PR-8)
 * @see src/features/watering/dateUtils.ts toLocalDateKey (正しい代替)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = ['src', 'app'];
const EXCLUDE_DIRS = ['node_modules', '.git', '__tests__'];
const EXCLUDE_PATHS = ['app/export']; // 機械処理用 (CSV ファイル名 / PDF ラベル)
const ALLOW_MARKER = 'lint:utc-date-slice-allow';

// Forbidden patterns (UTC 日付取得 → ローカル日付として誤用)
const FORBIDDEN_PATTERNS = [
  {
    re: /nowUtc\(\)[^.]*\.slice\(0,\s*10\)/,
    message: 'nowUtc().slice(0, 10) は UTC 日付を返す',
  },
  {
    re: /\(nowUtc\(\)\s+as\s+string\)\.slice\(0,\s*10\)/,
    message: '(nowUtc() as string).slice(0, 10) は UTC 日付を返す',
  },
  {
    re: /new\s+Date\(\)\.toISOString\(\)\.slice\(0,\s*10\)/,
    message: 'new Date().toISOString().slice(0, 10) は UTC 日付を返す',
  },
  {
    // Sess67 追加: 変数経由でも UTC 日付化 → ローカル日付の誤用は同じ本質。
    // false positive は同行 `// lint:utc-date-slice-allow` で抑止。
    re: /\b\w+\.toISOString\(\)\.slice\(0,\s*10\)/,
    message: '<variable>.toISOString().slice(0, 10) は UTC 日付を返す (Sess67 LabeledDateRow bug)',
  },
];

const SUGGESTION =
  '→ ローカル日付取得は `toLocalDateKey(nowUtc() as string, getTzOffsetMin())` を使ってください ' +
  '(import 元: `@/src/features/watering/dateUtils` + `@/src/core/datetime`)。 ' +
  'ADR-0008 §TZ Notes Amended (Sess36 PR-8) 参照。';

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.includes(entry.name)) continue;
      walk(full, files);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function isExcluded(relPath) {
  return EXCLUDE_PATHS.some(
    (p) => relPath === p || relPath.startsWith(`${p}/`) || relPath.startsWith(`${p}\\`),
  );
}

const errors = [];
let scannedCount = 0;

for (const targetDir of TARGET_DIRS) {
  const absDir = path.join(ROOT, targetDir);
  if (!fs.existsSync(absDir)) continue;

  for (const filePath of walk(absDir)) {
    const relPath = path.relative(ROOT, filePath);
    if (isExcluded(relPath)) continue;
    scannedCount++;

    const source = fs.readFileSync(filePath, 'utf8');
    const lines = source.split('\n');
    let inBlockComment = false;

    for (let i = 0; i < lines.length; i++) {
      let code = lines[i];

      // Sess67 追加: 同行 allow marker は line comment 除去前に判定 (marker は通常 // ... に含まれる)
      const hasAllowMarker = code.includes(ALLOW_MARKER);

      // block comment 除外
      if (inBlockComment) {
        const endIdx = code.indexOf('*/');
        if (endIdx === -1) continue;
        code = code.slice(endIdx + 2);
        inBlockComment = false;
      }
      if (code.includes('/*') && !code.includes('*/')) {
        code = code.slice(0, code.indexOf('/*'));
        inBlockComment = true;
      }

      // line comment 除外
      const codeOnly = code.split('//')[0];

      if (hasAllowMarker) continue;

      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.re.test(codeOnly)) {
          errors.push(
            `[ADR-0008 §TZ 違反] ${relPath}:${i + 1}: ${pattern.message}\n  検出: ${codeOnly.trim()}\n  ${SUGGESTION}`,
          );
        }
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`UTC date slice check: ${errors.length} error(s) in ${scannedCount} files`);
  for (const err of errors) {
    console.error('  - ' + err);
  }
  process.exit(1);
}

console.log(`UTC date slice check: 0 errors (${scannedCount} files scanned)`);
