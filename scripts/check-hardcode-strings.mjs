#!/usr/bin/env node
/**
 * scripts/check-hardcode-strings.mjs
 *
 * Sess20 PR-0-3 (ADR-0033 D2 + R-41) — user 視覚部分の日本語直書きハードコード検知。
 *
 * 検出 pattern (ADR-0033 D2):
 *   1. JSX text 内日本語: `>[ぁ-んァ-ヶ一-龯][^<]*<`
 *   2. props string literal 日本語 (title/headerTitle/label/placeholder/message/accessibilityLabel)
 *   3. Alert.alert / Snackbar.show / Toast.show / Toast.success の user 表示 string
 *
 * 除外 (debug/dev/test/lib):
 *   - console.log/warn/error/info/debug
 *   - __DEV__ 内のブロック (簡易: 同一行 __DEV__ 検知)
 *   - Sentry.captureException / Sentry tag
 *   - test/__tests__/, *.test.ts(x)
 *   - src/core/i18n/locales/, scripts/, docs/, node_modules/, android/, ios/
 *
 * Usage:
 *   node scripts/check-hardcode-strings.mjs              # 全件 grep、 violation あれば exit 1
 *   node scripts/check-hardcode-strings.mjs --json       # JSON 出力 (CI 連携用)
 *   node scripts/check-hardcode-strings.mjs --max 999    # 上限変更 (default 表示 50)
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['app', 'src'];

const EXCLUDE_PATH_PATTERNS = [
  /node_modules/,
  /^android\//,
  /^ios\//,
  /^scripts\//,
  /^docs\//,
  /^\.expo\//,
  /^\.claude\//,
  /^dist\//,
  /^out\//,
  /^build\//,
  /\/__tests__\//,
  /\.test\.(ts|tsx|js|jsx)$/,
  /\/locales\//,
  /\/i18n\//,
  // dev 専用コード (本番 build で枝刈り、 i18n 対象外。header の「除外(dev)」方針)。
  // seedTestData.ts / DevSettingsSection.tsx 等。元 settings の DEV section は __DEV__ ブロック
  // 検知で除外されていたが、 Phase 4 A3 で src/dev/ へ抽出したため path 除外に明示。
  /^src\/dev\//,
];

const INCLUDE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx']);

const JP_CHAR = '\\u3040-\\u309F\\u30A0-\\u30FF\\u4E00-\\u9FFF';

const PATTERNS = [
  {
    id: 'jsx-text',
    description: 'JSX text 内日本語直書き',
    re: new RegExp(`>\\s*([${JP_CHAR}][^<>{}\\n]*?)\\s*<`, 'g'),
    textGroup: 1,
  },
  {
    id: 'props-string',
    description: 'props string literal 日本語直書き (object/JSX attribute)',
    re: new RegExp(
      `\\b(title|headerTitle|label|placeholder|message|accessibilityLabel|aria-label|alt|subtitle|caption|hint)[=:]\\s*\\{?['"]([${JP_CHAR}][^'"]*)['"]`,
      'g',
    ),
    textGroup: 2,
  },
  {
    id: 'alert-alert',
    description: 'Alert.alert 第 1/2 引数日本語',
    re: new RegExp(`Alert\\.alert\\(\\s*['"]([${JP_CHAR}][^'"]*)['"]`, 'g'),
    textGroup: 1,
  },
  {
    id: 'toast-show',
    description: 'Toast.show/success/error/info 日本語',
    re: new RegExp(
      `Toast\\.(show|success|error|info|warn)\\(\\s*['"]([${JP_CHAR}][^'"]*)['"]`,
      'g',
    ),
    textGroup: 2,
  },
  {
    id: 'snackbar-show',
    description: 'Snackbar.show 日本語',
    re: new RegExp(`Snackbar\\.show\\(\\s*['"]([${JP_CHAR}][^'"]*)['"]`, 'g'),
    textGroup: 1,
  },
];

const EXCLUDE_LINE_PATTERNS = [
  /\/\//, // line comment (簡易: // 含む line は skip)
  /^\s*\*/, // block comment
  /console\.(log|warn|error|info|debug)/,
  /Sentry\.(captureException|captureMessage|setTag|setContext|addBreadcrumb)/,
  /__DEV__/,
];

function shouldExcludePath(relPath) {
  return EXCLUDE_PATH_PATTERNS.some((re) => re.test(relPath));
}

function walkDir(dir, results = []) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const rel = relative(ROOT, full);
    if (shouldExcludePath(rel)) continue;
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walkDir(full, results);
    } else if (st.isFile() && INCLUDE_EXT.has(extname(full))) {
      results.push(full);
    }
  }
  return results;
}

function findDevBlockLines(lines) {
  const devLineSet = new Set();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/__DEV__/.test(line)) continue;
    if (!/[\(\{][^)}]*__DEV__|__DEV__[^()}]*[&|]{2}|__DEV__[^()}]*\?/.test(line)) {
      devLineSet.add(i);
      continue;
    }
    let depth = 0;
    let started = false;
    for (let j = i; j < lines.length; j++) {
      const l = lines[j];
      for (const ch of l) {
        if (ch === '(' || ch === '{') {
          depth++;
          started = true;
        } else if (ch === ')' || ch === '}') {
          depth--;
        }
      }
      devLineSet.add(j);
      if (started && depth <= 0) break;
      if (j - i > 500) break;
    }
  }
  return devLineSet;
}

function scanFile(filePath, relPath) {
  const violations = [];
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const devBlockLines = findDevBlockLines(lines);
  for (let lineNo = 0; lineNo < lines.length; lineNo++) {
    const line = lines[lineNo];
    if (devBlockLines.has(lineNo)) continue;
    if (EXCLUDE_LINE_PATTERNS.some((re) => re.test(line))) continue;
    for (const pat of PATTERNS) {
      pat.re.lastIndex = 0;
      let m;
      while ((m = pat.re.exec(line)) !== null) {
        const text = (m[pat.textGroup] || '').slice(0, 80);
        if (!text) continue;
        violations.push({
          file: relPath,
          line: lineNo + 1,
          column: m.index + 1,
          pattern: pat.id,
          description: pat.description,
          text,
        });
      }
    }
  }
  return violations;
}

function main() {
  const argv = process.argv.slice(2);
  const jsonOutput = argv.includes('--json');
  const maxIdx = argv.indexOf('--max');
  const maxDisplay = maxIdx >= 0 ? parseInt(argv[maxIdx + 1], 10) : 50;

  const allFiles = [];
  for (const dir of SCAN_DIRS) {
    const full = join(ROOT, dir);
    try {
      const st = statSync(full);
      if (st.isDirectory()) walkDir(full, allFiles);
    } catch {
      // skip if dir not exist
    }
  }

  const allViolations = [];
  for (const filePath of allFiles) {
    const relPath = relative(ROOT, filePath);
    const v = scanFile(filePath, relPath);
    allViolations.push(...v);
  }

  if (jsonOutput) {
    console.log(
      JSON.stringify({ count: allViolations.length, violations: allViolations }, null, 2),
    );
  } else {
    if (allViolations.length === 0) {
      console.log('[lint:hardcode] OK — 直書きハードコード 0 件 (ADR-0033 D2 / R-41 整合)');
      process.exit(0);
    }
    console.error(
      `[lint:hardcode] NG — 直書きハードコード ${allViolations.length} 件検出 (ADR-0033 D2 / R-41 違反)`,
    );
    console.error('');
    const grouped = {};
    for (const v of allViolations) {
      grouped[v.pattern] = grouped[v.pattern] || [];
      grouped[v.pattern].push(v);
    }
    for (const [patId, vs] of Object.entries(grouped)) {
      console.error(`  [${patId}] ${vs.length} 件`);
    }
    console.error('');
    console.error(`詳細 (最初 ${maxDisplay} 件):`);
    for (const v of allViolations.slice(0, maxDisplay)) {
      console.error(`  ${v.file}:${v.line}:${v.column} [${v.pattern}] "${v.text}"`);
    }
    if (allViolations.length > maxDisplay) {
      console.error(`  ... and ${allViolations.length - maxDisplay} more`);
    }
    console.error('');
    console.error('対処: 各 hardcode を i18n key 化 (`t("key")` 経由)、 ja.ts に SoT 追加。');
    console.error('詳細: docs/adr/ADR-0033-i18n-translation-policy.md (D2)');
    process.exit(1);
  }
}

main();
