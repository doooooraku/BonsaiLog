#!/usr/bin/env node
/**
 * check-form-screen-scroll.mjs (Sess33 P2-2、 R-51 自動化、 ADR-0040)
 *
 * フォーム画面 (盆栽追加 / 作業記録 / まとめて記録) で以下を満たしているか検証:
 * 1. `Stack.Screen options={{ headerShown: false }}` で Stack header 廃止
 * 2. `<FormScreenHeader` 配置 (sticky 戻るボタン)
 * 3. measureLayout 使用時は `UIManager.measureLayout` (公式 native API) 強制
 *    (instance method `ref.current?.measureLayout(...)` は forwardRef 経由で Console Error)
 *
 * 違反検出時 exit 1。 `pnpm verify` に組込予定。
 *
 * @see docs/adr/ADR-0040-form-screen-scroll-unification.md
 * @see .claude/recurrence-prevention/specialized.md R-51
 * @see docs/reference/design_system.md §23
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGETS = [
  'src/features/event/BulkLogConfirmScreen.tsx',
  'src/features/bonsai/BonsaiCreateScreen.tsx',
  'src/features/event/WorkLogConfirmScreen.tsx',
];

const errors = [];

for (const relPath of TARGETS) {
  const filePath = path.join(ROOT, relPath);
  if (!fs.existsSync(filePath)) {
    errors.push(`[ENOENT] ${relPath} が存在しません`);
    continue;
  }
  const source = fs.readFileSync(filePath, 'utf8');

  // 1. Stack header 廃止確認
  if (!/headerShown:\s*false/.test(source)) {
    errors.push(
      `[R-51 違反] ${relPath}: \`Stack.Screen options={{ headerShown: false }}\` が見つかりません`,
    );
  }

  // 2. FormScreenHeader 配置確認
  if (!/<FormScreenHeader\b/.test(source)) {
    errors.push(`[R-51 違反] ${relPath}: \`<FormScreenHeader />\` 配置が見つかりません`);
  }

  // 3. measureLayout 禁止 pattern 検出 (コメント行を除外)
  const lines = source.split('\n');
  const violations = [];
  let inBlockComment = false;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (inBlockComment) {
      const endIdx = line.indexOf('*/');
      if (endIdx === -1) continue;
      line = line.slice(endIdx + 2);
      inBlockComment = false;
    }
    if (line.includes('/*') && !line.includes('*/')) {
      line = line.slice(0, line.indexOf('/*'));
      inBlockComment = true;
    }
    const codeOnly = line.split('//')[0];
    if (/\w+Ref\.current\??\.measureLayout\(/.test(codeOnly)) {
      violations.push(`line ${i + 1}: ${codeOnly.trim()}`);
    }
  }
  if (violations.length > 0) {
    errors.push(
      `[R-46 v4 違反] ${relPath}: \`ref.current?.measureLayout(...)\` 禁止 (forwardRef 経由で Console Error)、 \`UIManager.measureLayout(findNodeHandle(input), scroll, fail, success)\` を使うこと\n  検出: ${violations.join(', ')}`,
    );
  }
}

if (errors.length > 0) {
  console.error('Form screen scroll check: ' + errors.length + ' error(s)');
  for (const err of errors) {
    console.error('  - ' + err);
  }
  process.exit(1);
}

console.log(`Form screen scroll check: ${TARGETS.length} files passed`);
