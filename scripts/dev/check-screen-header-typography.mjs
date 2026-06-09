#!/usr/bin/env node
/**
 * check-screen-header-typography.mjs — Screen header typography hardcode 検出 (R-75)。
 *
 * docs/reference/design_system.md §3-4 整合: 画面ヘッダー (= タブ画面 SearchHeader /
 * Stack 画面 React Navigation native header) の font geometry / background hardcode を
 * grep で検出して warning 出力。 検出された場合は `screenTitleTab` / `screenTitleStack`
 * token (= src/core/theme/typography.ts) と `c.background` (= useColors() 経由) に
 * 置換することを推奨。
 *
 * Sess90 PR-C では warning のみ (exit code 0 で CI block しない)、 false positive を
 * 観察してから error 昇格を検討する段階導入 (= ADR-0029 D1 form typography 同型 pattern)。
 *
 * 対象 file:
 * - app/_layout.tsx (root Stack)
 * - app/(modals)/_layout.tsx
 * - app/settings/_layout.tsx
 * - app/(tabs)/<tab>/_layout.tsx (= plan / bonsai / record / look-back 等)
 * - app/<screen>.tsx (= Stack.Screen options の headerTitleStyle / headerStyle 設定箇所)
 * - src/features/bonsai/SearchHeader.tsx (= タブ画面自前 header)
 *
 * 除外:
 * - src/core/theme/typography.ts (token 定義本体)
 * - __tests__/ 配下
 * - 既知 SoT file (= 後述 ALLOWLIST)
 *
 * 検出 anti-pattern:
 * - hardcoded `fontFamily: 'NotoSerifJP_500Medium'` (header の token 経由化漏れ)
 * - hardcoded `fontSize: <number>` が `headerTitleStyle` 同行 / 近接 5 行で出現
 * - hardcoded `backgroundColor: '#FFFFFF'` / `'#F7F3E8'` が headerStyle に直書き
 * - `c.surface` が `headerStyle.backgroundColor` に渡されている (= PR-B で washi 統一決定)
 *
 * 出力例:
 *   app/(tabs)/plan/_layout.tsx:24: fontSize: 20 → 検討: screenTitleStack token 経由を推奨
 *   app/settings/_layout.tsx:21: fontFamily: 'NotoSerifJP_500Medium' → 検討: screenTitleStack token 経由を推奨
 *
 * Exit code:
 * - 0 (常に成功、 warning のみ)
 *
 * 関連:
 * - ADR-0053 Sess90 PR-A / PR-B Amendment (= header SoT 確立)
 * - R-75 (= screen header font geometry hardcode 禁止、 token 参照必須)
 * - docs/reference/design_system.md §3-4 Screen header background contract
 * - docs/reference/design_system.md §3-5 Screen header typography contract
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

// ALLOWLIST: token 定義本体や 議論用 doc (= false positive 抑止)
const ALLOWLIST = new Set([
  'src/core/theme/typography.ts',
  'scripts/dev/check-screen-header-typography.mjs',
]);

/** 対象 file 列挙: app 配下の .tsx (header 設定可能) + SearchHeader.tsx。 */
function listTargetFiles() {
  try {
    const out = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' });
    return out
      .split('\n')
      .filter((p) => p.length > 0)
      .filter((p) => {
        if (ALLOWLIST.has(p)) return false;
        if (p.includes('__tests__')) return false;
        if (!p.endsWith('.tsx')) return false;
        // app/ 配下 (= Stack screen / _layout.tsx)
        if (p.startsWith('app/')) return true;
        // タブ画面 自前 header
        if (p === 'src/features/bonsai/SearchHeader.tsx') return true;
        return false;
      });
  } catch (e) {
    console.error('git ls-files 失敗:', e.message);
    process.exit(1);
  }
}

/**
 * 1 file を grep して header 関連 anti-pattern を検出。
 * 単純 grep + 「header 関連 context 行を直前 5 行 lookback で判定」 で AST 不要に保つ。
 */
function checkFile(filePath) {
  let content;
  try {
    content = readFileSync(join(ROOT, filePath), 'utf8');
  } catch {
    return [];
  }
  const lines = content.split('\n');
  const issues = [];

  // header 関連プロパティ regex
  const headerContextRe = /headerTitleStyle|headerStyle|headerTintColor|HEADER_BASE_HEIGHT/;
  // anti-pattern
  const notoSerifRe = /fontFamily:\s*['"]NotoSerifJP_\d+\w+['"]/;
  const fontSizeRe = /fontSize:\s*\d+/;
  const surfaceBgRe = /backgroundColor:\s*c\.surface|backgroundColor:\s*headerColors\.surface/;
  const hexBgRe = /backgroundColor:\s*['"]#(FFFFFF|FFF|F7F3E8|fffafa|fefefe)['"]/i;

  // 5 行 lookback で header context 確認
  const isInHeaderContext = (idx) => {
    for (let i = Math.max(0, idx - 5); i <= Math.min(lines.length - 1, idx + 1); i++) {
      if (headerContextRe.test(lines[i])) return true;
    }
    return false;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    // コメント行は除外
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;

    // NotoSerifJP hardcode は header context 関係なく検出 (token に集約する原則)
    if (notoSerifRe.test(line)) {
      const m = line.match(notoSerifRe);
      issues.push({
        line: idx + 1,
        snippet: m[0],
        kind: 'fontFamily',
        hint: 'screenTitleTab / screenTitleStack token 経由を推奨',
      });
    }

    // fontSize は header context のみ検出 (= body の hardcoded は別 lint)
    if (fontSizeRe.test(line) && isInHeaderContext(idx)) {
      const m = line.match(fontSizeRe);
      issues.push({
        line: idx + 1,
        snippet: m[0],
        kind: 'fontSize (header context)',
        hint: 'screenTitleStack.fontSize / SearchHeader 系 token 経由を推奨',
      });
    }

    // header backgroundColor の c.surface / 純白 hex は PR-B で禁止
    // context check 必須 (= body の card 系 backgroundColor: c.surface は対象外、 false positive 抑止)
    if (surfaceBgRe.test(line) && isInHeaderContext(idx)) {
      const m = line.match(surfaceBgRe);
      issues.push({
        line: idx + 1,
        snippet: m[0],
        kind: 'header background',
        hint: 'c.background (washi/宵墨) に統一 (ADR-0053 Sess90 PR-B Amendment)',
      });
    }

    if (hexBgRe.test(line) && isInHeaderContext(idx)) {
      const m = line.match(hexBgRe);
      issues.push({
        line: idx + 1,
        snippet: m[0],
        kind: 'header background hex',
        hint: 'c.background (= useColors() 経由) 推奨、 hex 直書き禁止',
      });
    }
  });

  return issues;
}

function main() {
  const files = listTargetFiles();
  if (files.length === 0) {
    console.log('対象 file 0 (app 配下の .tsx + SearchHeader.tsx)');
    process.exit(0);
  }
  const allIssues = [];
  files.forEach((p) => {
    const issues = checkFile(p);
    issues.forEach((i) => allIssues.push({ file: p, ...i }));
  });

  if (allIssues.length === 0) {
    console.log(
      '✅ Screen header typography / background drift 検出ゼロ (token 経由統一達成、 R-75)',
    );
    process.exit(0);
  }

  console.log('⚠️  Screen header drift 検出 (R-75 / ADR-0053 Sess90 PR-A+B Amendment):');
  console.log('');
  console.log('以下の hardcoded font geometry / background は');
  console.log('  - src/core/theme/typography.ts の screenTitleTab / screenTitleStack token');
  console.log('  - useColors() 経由の c.background (= washi/宵墨 scheme-aware)');
  console.log('に置換することを推奨。 Sess90 PR-C では warning のみ (CI block しない)、');
  console.log('ESLint AST rule 化は false positive 観察後に検討。');
  console.log('');
  allIssues.forEach((i) => {
    console.log(`  ${i.file}:${i.line}: ${i.snippet}`);
    console.log(`    → [${i.kind}] ${i.hint}`);
  });
  console.log('');
  console.log(`合計 ${allIssues.length} 件 (${files.length} file 走査)`);
  process.exit(0);
}

main();
