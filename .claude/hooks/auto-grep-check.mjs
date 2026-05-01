#!/usr/bin/env node
/**
 * R-1 自動化: 一括処理後の目視確認
 *
 * PostToolUse hook (Edit 対象)
 * - docs/ 配下の Edit 完了後に自動で取り消し線パターン + Codex 言及残存を grep
 * - 検出時は警告 (block しない、stderr に出力)
 *
 * 検出パターン:
 *   - 取り消し線: ~~F-[0-9]+~~|削除お知らせ|履歴のため残置|旧 F-[0-9]+ 仕様
 *   - 不採用宣言以外の Codex 言及 (R-22 移行漏れ防止)
 */
import { readFileSync, existsSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const { tool_name, tool_input } = input;

if (tool_name !== 'Edit') process.exit(0);
const path = tool_input?.file_path;
if (!path || !path.includes('/docs/')) process.exit(0);
if (!existsSync(path)) process.exit(0);

const content = readFileSync(path, 'utf8');

const warnings = [];

// 取り消し線パターン (R-2 違反)
const strikePatterns = [
  /~~F-[0-9]+~~/g,
  /削除お知らせ/g,
  /履歴のため残置/g,
  /旧 F-[0-9]+ 仕様/g,
];
for (const re of strikePatterns) {
  const matches = content.match(re);
  if (matches?.length) {
    warnings.push(`[R-2] 取り消し線パターン検出: ${re.source} (${matches.length} 件)`);
  }
}

// Codex 言及 (R-22 = Codex → Claude Code 移行漏れ)
// ただし「Codex 不採用」「Codex 単独運用」「Codex は使用しない」「Codex は使用しない」「履歴互換」等の宣言系は許容
if (/Codex/.test(content) && !path.includes('ADR-0012')) {
  const lines = content.split('\n');
  const violations = lines.filter(
    (l) =>
      /Codex/.test(l) &&
      !/不採用|単独運用|使用しない|履歴互換|Codex 担当 PR で実施|2026-05-01|deprecate Codex/.test(l),
  );
  if (violations.length > 0) {
    warnings.push(
      `[R-22] Codex 言及残存: ${violations.length} 行 (移行漏れ可能性、最初の 3 行: ${violations.slice(0, 3).map((l) => l.trim().slice(0, 80)).join(' / ')})`,
    );
  }
}

if (warnings.length > 0) {
  console.error(`[auto-grep-check.mjs] ${path}:\n  ` + warnings.join('\n  '));
  // exit 0 (block しない、警告のみ)
}

process.exit(0);
