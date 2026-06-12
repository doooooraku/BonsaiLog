#!/usr/bin/env node
/**
 * check-form-typography.mjs — Form atom typography drift check (ADR-0029 D1)。
 *
 * docs/reference/design_system.md §12-6 整合: Form 系 file 内に hardcoded
 * fontSize / fontWeight 直書きを grep で検出して warning 出力。
 *
 * Sess17 では warning のみ (exit code 0 で CI block しない)。
 * ESLint AST rule 化は Sess18 以降 (false positive リスク回避のため段階導入)。
 *
 * 対象 file:
 * - src/components/form/ ** /*.tsx (Form atom 本体)
 * - src/features/event/ ** /Work*Screen.tsx + Bulk*Screen.tsx (caller)
 *
 * 除外:
 * - typography.ts (token 定義本体)
 * - __tests__/ 配下 (snapshot test 等)
 *
 * 検出 anti-pattern:
 * - hardcoded `fontSize: <number>` (例: `fontSize: 13`、 `fontSize: 16`)
 * - hardcoded `fontWeight: '<value>'` (例: `fontWeight: '600'`、 `fontWeight: '500'`)
 *
 * 出力例:
 *   src/features/event/WorkLogConfirmScreen.tsx:624: fontSize: 20 → 検討: token 化推奨
 *   src/components/form/PhotoField.tsx:241: fontWeight: '500' → 検討: token 化推奨
 *
 * Exit code:
 * - 0 (常に成功、 warning のみ)
 *
 * 関連: docs/reference/design_system.md §12-6 Form atom typography contract
 *       src/core/theme/typography.ts (8 constants 定義)
 *       ADR-0029 D1
 */

import { execSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// 対象 glob (cross-platform で find / glob を使わず、 git ls-files で対象抽出)。
function listTargetFiles() {
  try {
    const out = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' });
    return out
      .split('\n')
      .filter((p) => p.length > 0)
      .filter((p) => {
        // Form atom 本体
        if (p.startsWith('src/components/form/') && p.endsWith('.tsx')) return true;
        // Work/Bulk 系 caller
        if (p.match(/^src\/features\/event\/.*(Work|Bulk).*Screen\.tsx$/)) return true;
        // Sess104 #1210: 全 UI 領域へ拡張 (再増殖の見える化。form 以外は summary 表示)
        if (p.startsWith('src/features/') && p.endsWith('.tsx')) return true;
        if (p.startsWith('src/shared/') && p.endsWith('.tsx')) return true;
        if (p.startsWith('app/') && p.endsWith('.tsx')) return true;
        return false;
      })
      .filter((p) => {
        // 除外
        if (p.includes('__tests__')) return false;
        return true;
      });
  } catch (e) {
    console.error('git ls-files 失敗:', e.message);
    process.exit(1);
  }
}

// 1 file を grep して anti-pattern を検出
function checkFile(filePath) {
  let content;
  try {
    content = readFileSync(join(ROOT, filePath), 'utf8');
  } catch {
    return [];
  }
  const lines = content.split('\n');
  const issues = [];
  // fontSize: <number> を検出 (token 経由は ...formLabel / ...formInput 等で
  // hardcoded ではないので AST 不要)。 単純 grep で十分。
  const fontSizeRe = /fontSize:\s*\d+/;
  const fontWeightRe = /fontWeight:\s*['"][^'"]+['"]/;
  lines.forEach((line, idx) => {
    // コメント行は除外 (// or * で始まる行、 または `/*` ブロック中の `*` 始まり)
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    if (fontSizeRe.test(line)) {
      const match = line.match(/fontSize:\s*\d+/);
      issues.push({ line: idx + 1, snippet: match[0], kind: 'fontSize' });
    }
    if (fontWeightRe.test(line)) {
      const match = line.match(/fontWeight:\s*['"][^'"]+['"]/);
      issues.push({ line: idx + 1, snippet: match[0], kind: 'fontWeight' });
    }
  });
  return issues;
}

function main() {
  const files = listTargetFiles();
  if (files.length === 0) {
    console.log('対象 file 0 (Form atom / Work*Screen.tsx が見つからない)');
    process.exit(0);
  }
  const allIssues = [];
  files.forEach((p) => {
    const issues = checkFile(p);
    issues.forEach((i) => allIssues.push({ file: p, ...i }));
  });

  if (allIssues.length === 0) {
    console.log('✅ Form typography drift 検出ゼロ (token 経由統一達成)');
    process.exit(0);
  }

  console.log('⚠️  Typography drift 検出 (ADR-0029 D1 / design_system.md §12-6 / #1210):');
  console.log('');
  console.log('hardcoded fontSize / fontWeight は src/core/theme/typography.ts の token');
  console.log('(formLabel / featureTableHeader* 等) 経由に段階置換する (#1210 台帳)。');
  console.log('');

  // Sess104 #1210: 全域拡張に伴い、form 系 (従来スコープ) のみ個別行を表示、
  // それ以外は file 単位の summary 表示 (verify ログの氾濫防止)。--verbose で全行。
  const verbose = process.argv.includes('--verbose');
  const isLegacyScope = (p) =>
    p.startsWith('src/components/form/') ||
    /^src\/features\/event\/.*(Work|Bulk).*Screen\.tsx$/.test(p);

  const legacy = allIssues.filter(({ file }) => isLegacyScope(file));
  const wide = allIssues.filter(({ file }) => !isLegacyScope(file));

  legacy.forEach(({ file, line, snippet, kind }) => {
    console.log(`  ${file}:${line}: ${snippet} (${kind})`);
  });
  if (verbose) {
    wide.forEach(({ file, line, snippet, kind }) => {
      console.log(`  ${file}:${line}: ${snippet} (${kind})`);
    });
  } else if (wide.length > 0) {
    const byFile = new Map();
    wide.forEach(({ file }) => byFile.set(file, (byFile.get(file) ?? 0) + 1));
    const top = [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    console.log(`  (全域スコープ: ${wide.length} 件 / ${byFile.size} files — 上位:`);
    top.forEach(([f, n]) => console.log(`    ${f}: ${n} 件`));
    console.log('   全行表示は --verbose)');
  }
  console.log('');
  console.log(`合計: ${allIssues.length} 件、 ${files.length} files scanned`);

  // warning のみ、 exit 0 (段階置換中の baseline 監視)
  process.exit(0);
}

main();
