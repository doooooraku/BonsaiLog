#!/usr/bin/env node
/**
 * scripts/check-destructive-undo.mjs (Sess26 PR-η-3、 Sess27 PR-7 緩和: R-44 自動検出)
 *
 * 破壊的操作 (bulkSoftDeleteEvents / softDeleteEvent / purgeOldTrash 等) を呼ぶ UI 層 file が
 * 同 file 内で `Toast.show()` (useToastStore.getState().show) を呼んでいるか検証
 * (R-44 緩和: 破壊的操作 = ConfirmDialog + 通知 Toast 必須、 Sess27 Undo 動線撤回反映)。
 *
 * 検出 pattern:
 *   - UI 層 file (`app/`, `src/features/`, `src/components/` 配下) で
 *     `bulkSoftDeleteEvents(`, `softDeleteEvent(`, `purgeOldTrash(`, `deleteEventHard(`,
 *     `restoreEvents(` のいずれかを呼んでいる場合、
 *   - 同 file 内に `useToastStore.getState().show(` callsite が **なし** なら warning
 *
 * 除外 (R-44 適用外):
 *   - `src/dev/`       (seed cleanup 用、 user 視覚動線なし)
 *   - `src/db/`        (実装 file 自体)
 *   - `src/services/`  (file system 等のサービス層)
 *   - `__tests__/`, `*.test.ts(x)` (test ファイル)
 *   - `src/features/notification/` (通知 wrapper 内部)
 *
 * Usage:
 *   node scripts/check-destructive-undo.mjs        # 全件 grep、 違反あれば exit 1
 *   node scripts/check-destructive-undo.mjs --json # JSON 出力 (CI 連携用)
 *
 * Refs: ADR-0036 D5 / R-44 / Sess26 PR-η-3
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['app', 'src/features', 'src/components'];

const EXCLUDE_PATH_PATTERNS = [
  /node_modules/,
  /\/__tests__\//,
  /\.test\.(ts|tsx|js|jsx)$/,
  /\/src\/dev\//, // seed cleanup 用 (user UI でない)
  /\/src\/db\//, // 実装 file 自体
  /\/src\/services\//, // service 層 (file system 等)
  /\/src\/features\/notification\//, // 通知 wrapper 内部
];

const INCLUDE_EXT = new Set(['.ts', '.tsx']);

// 破壊的操作 callsite pattern (callExpression `funcName(`)
const DESTRUCTIVE_FNS = [
  'bulkSoftDeleteEvents',
  'softDeleteEvent',
  'purgeOldTrash',
  'deleteEventHard',
  'restoreEvents', // 復元も対 (Undo の中で呼ぶが、 単独 callsite なら違反)
];

const UNDO_CALL = 'useToastStore.getState().show(';

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');

function walk(dir, files = []) {
  if (!statSync(dir).isDirectory()) return files;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(ROOT, full).replace(/\\/g, '/');
    if (EXCLUDE_PATH_PATTERNS.some((re) => re.test(`/${rel}`))) continue;
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, files);
    } else if (INCLUDE_EXT.has(extname(name))) {
      files.push(full);
    }
  }
  return files;
}

function check(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const violations = [];
  // 各 destructive 関数呼出を行番号付きで検出
  for (const fn of DESTRUCTIVE_FNS) {
    const callPattern = new RegExp(`\\b${fn}\\(`, 'g');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // import や comment, type 定義は除外
      if (/^\s*\/\//.test(line)) continue;
      if (/^\s*\*/.test(line)) continue;
      if (/^\s*import\b/.test(line)) continue;
      if (callPattern.test(line)) {
        // 同 file 内に Toast.show callsite があるか (Sess27 PR-7: showUndoToast 撤回)
        if (!content.includes(UNDO_CALL)) {
          violations.push({ fn, line: i + 1, snippet: line.trim().slice(0, 100) });
        }
      }
      callPattern.lastIndex = 0; // reset for next line
    }
  }
  return violations;
}

const allFiles = SCAN_DIRS.flatMap((d) => {
  const abs = join(ROOT, d);
  try {
    return walk(abs);
  } catch (e) {
    return [];
  }
});

const violationsByFile = {};
for (const f of allFiles) {
  const v = check(f);
  if (v.length > 0) {
    violationsByFile[relative(ROOT, f).replace(/\\/g, '/')] = v;
  }
}

if (jsonOutput) {
  console.log(
    JSON.stringify(
      { violations: violationsByFile, count: Object.keys(violationsByFile).length },
      null,
      2,
    ),
  );
} else {
  const fileCount = Object.keys(violationsByFile).length;
  if (fileCount === 0) {
    console.log(
      '[check-destructive-undo] OK — 破壊的操作 callsite は全て同 file 内に Toast.show を併用 (ADR-0036 D5 撤回、 R-44 緩和、 Sess27 PR-7)',
    );
  } else {
    console.error(`[check-destructive-undo] ✗ R-44 違反候補: ${fileCount} file(s)`);
    for (const [file, vs] of Object.entries(violationsByFile)) {
      console.error(`  ${file}:`);
      for (const v of vs) {
        console.error(`    L${v.line}  ${v.fn}(  — 同 file 内 Toast.show 呼出なし`);
        console.error(`              ${v.snippet}`);
      }
    }
    console.error(
      '\nADR-0036 D5 撤回 (Sess27) / R-44 緩和: 破壊的操作 = ConfirmDialog + 通知 Toast 必須。',
    );
    console.error("同 file 内で `useToastStore.getState().show(t('...'))` を呼ぶか、");
    console.error('該当 file が UI 動線でないなら EXCLUDE_PATH_PATTERNS への追加を検討。');
  }
}

process.exit(Object.keys(violationsByFile).length > 0 ? 1 : 0);
