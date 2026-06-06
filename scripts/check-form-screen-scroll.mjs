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
 * Sess72 PR-5 拡張 (R-63 自動化、 ADR-0040 D5 Amendment):
 * 4. FormScreenHeader を使う画面で `router.push` する flow がある場合、
 *    `useScrollPreservation` (Sess72 PR-1 #969) 適用必須。 未適用は warn (exit 0)。
 *    除外: `// scroll-preservation: no-child-push (<理由>)` 注釈で明示。
 *    warn 起動 → 違反 0 確認後 error 昇格 (Sess68 と同じ階段)。
 *
 * 違反検出時 exit 1 (R-51 違反)。 warn は exit 0 (R-63、 将来 error 昇格)。 `pnpm verify` に組込済。
 *
 * @see docs/adr/ADR-0040-form-screen-scroll-unification.md (D1-D5)
 * @see .claude/recurrence-prevention/specialized.md R-51 / R-63
 * @see docs/reference/design_system.md §23
 */
import { execSync } from 'node:child_process';
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

// ── R-63 (Sess72 PR-5、 ADR-0040 D5 Amendment) ────────────────────────
// FormScreenHeader を使う全画面で scroll preservation hook 適用必須を warn check。
// 子画面 push がある画面のみ対象 (router.replace のみは対象外)。
// warn 起動 → 違反 0 確認後 error 昇格 (Sess68 と同じ階段)。
const warnings = [];

function findFormScreenFiles() {
  try {
    const out = execSync(
      `grep -rln "FormScreenHeader" src/ app/ --include="*.tsx" --include="*.ts" 2>/dev/null`,
      { encoding: 'utf8', cwd: ROOT },
    );
    return out
      .split('\n')
      .filter(Boolean)
      .map((p) => path.resolve(ROOT, p));
  } catch {
    // grep が一致 0 件で exit 1 を返した場合も含めて安全に空配列
    return [];
  }
}

const formScreenFiles = findFormScreenFiles();

for (const filePath of formScreenFiles) {
  const relPath = path.relative(ROOT, filePath);
  if (!fs.existsSync(filePath)) continue;
  const source = fs.readFileSync(filePath, 'utf8');

  // ScrollView を使わない画面 (例: FlatList ベース) は対象外
  if (!/<ScrollView\b/.test(source)) continue;

  // router.push 有無を判定 (router.replace は対象外)
  const hasRouterPush = /\brouter\.push\s*\(/.test(source);
  const hasUseScrollPreservation = /useScrollPreservation/.test(source);
  const hasExemptMarker = /scroll-preservation:\s*no-child-push/.test(source);

  if (hasRouterPush && !hasUseScrollPreservation && !hasExemptMarker) {
    warnings.push(
      `[R-63 warn] ${relPath}: router.push があるが useScrollPreservation 未適用。 src/core/hooks/useScrollPreservation.ts を適用するか、 「// scroll-preservation: no-child-push (<理由>)」 注釈で除外を明示してください`,
    );
  }
}

if (warnings.length > 0) {
  console.warn(`Form screen scroll preservation check: ${warnings.length} warning(s)`);
  for (const w of warnings) {
    console.warn('  - ' + w);
  }
  console.warn(
    '  ★ R-63 (Sess72 PR-5 起票、 ADR-0040 D5 Amendment): 現在 warn 起動中、 違反 0 確認後 error 昇格予定',
  );
} else if (formScreenFiles.length > 0) {
  console.log(
    `Form screen scroll preservation check: ${formScreenFiles.length} FormScreenHeader files inspected, all passed (R-63)`,
  );
}
