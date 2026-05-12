#!/usr/bin/env node
/**
 * Maestro flow 新規作成時の事前 testID 検索 hook (R-31、2026-05-12 retro 結果で導入)。
 *
 * PreToolUse Write at `maestro/flows/*.yml` を hook、以下を強制:
 * 1. `_template.yml` をベースにすること (推奨)
 * 2. text tap (`tapOn: text:`) の含有を即 block (testID 経由のみ)
 * 3. `appId: app.bonsailog` 等の誤 appId を block (正しくは `com.doooooraku.bonsailog`)
 *
 * 実装:
 * - PreToolUse Write hook、対象: `maestro/flows/*.yml`
 * - new content から禁止パターン検出、見つかったら exit 2 で block
 *
 * 補助:
 * - 既存 flow の編集 (Edit) は対象外、Write の新規 / 全面置換のみ対象
 */
import { readFileSync } from 'node:fs';

const FLOW_PATTERN = /\/maestro\/flows\/[^/]+\.yml$/;

const FORBIDDEN_PATTERNS = [
  {
    id: 'no-text-tap',
    regex: /^\s*tapOn:\s*\n\s*text:\s*['"]/m,
    message:
      '[R-31 violation] tapOn: text: は禁止 (Developer Menu 誤起動防止)。testID 経由 (id: e2e_xxx) を使用してください。',
  },
  {
    id: 'wrong-app-id',
    regex: /^appId:\s*['"]?app\.bonsailog['"]?/m,
    message:
      "[R-31 violation] appId 誤り。正しくは 'com.doooooraku.bonsailog' です (app.bonsailog は不可)。",
  },
];

function readInput() {
  try {
    return readFileSync(0, 'utf-8');
  } catch {
    return '';
  }
}

function main() {
  const raw = readInput();
  if (!raw) {
    process.exit(0);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const toolName = payload.tool_name ?? payload.toolName ?? '';
  if (toolName !== 'Write') {
    process.exit(0); // Write 以外は対象外
  }

  const filePath = payload.tool_input?.file_path ?? payload.toolInput?.file_path ?? '';
  if (!FLOW_PATTERN.test(filePath)) {
    process.exit(0); // maestro/flows/*.yml 以外は対象外
  }

  // _template.yml 自体は対象外
  if (filePath.endsWith('/_template.yml')) {
    process.exit(0);
  }

  const content = payload.tool_input?.content ?? payload.toolInput?.content ?? '';
  if (!content) {
    process.exit(0);
  }

  const violations = [];
  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.regex.test(content)) {
      violations.push(rule);
    }
  }

  if (violations.length > 0) {
    console.error('[R-31] Maestro flow 新規作成時の禁止パターン検出:');
    for (const v of violations) {
      console.error(`  - ${v.id}: ${v.message}`);
    }
    console.error('対処: `cp maestro/flows/_template.yml ' + filePath + '` から始めてください。');
    process.exit(2); // block
  }

  process.exit(0);
}

main();
