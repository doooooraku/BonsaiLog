#!/usr/bin/env node
/**
 * Sess108 案 1 (ADR-0063 Stage A): UserPromptSubmit 補助 — prompt 内 Windows/WSL path 検出 + 注入
 *
 * UserPromptSubmit hook
 * - stdin から JSON {user_prompt|prompt} を受け取り、 prompt 全文を走査して
 *   Windows path / WSL UNC path を全件抽出。
 * - 該当 path があれば「以下の path は WSL Linux path に正規化済 (案 1)」 を
 *   additionalContext として最大 5 件まで注入。
 * - Read hook (normalize-windows-paths.mjs) と組で動作:
 *   - PreToolUse: Claude が間違えた path を Read 段階で書き換え
 *   - UserPromptSubmit: Claude に最初から正規化済 path を見せて再質問削減
 *
 * Notion 215 prompts 分析由来 — 平均 50-100 字 prompt 短縮 × 70 件/月。
 *
 * 設計理由:
 * - hit なしなら silent exit 0 (副作用ゼロ)
 * - エラー時も silent exit 0 — Claude を絶対に壊さない
 * - 既存 pattern: .claude/hooks/check-rn-perf-hint.mjs
 */
import { readFileSync } from 'node:fs';

try {
  const raw = readFileSync(0, 'utf8');
  if (!raw.trim()) process.exit(0);
  const input = JSON.parse(raw);
  const prompt = input?.user_prompt || input?.prompt || '';
  if (typeof prompt !== 'string' || prompt.length === 0) process.exit(0);

  // 案 1 path 検出 regex (Windows + WSL UNC)
  // (a) C:\Users\doooo\Downloads\... — 区切りは \ / 両対応、 path 終端は whitespace / quote / 行末
  const WIN_RE = /[Cc]:[\\/]Users[\\/]doooo[\\/]Downloads[\\/][^\s"'`]+/g;
  // (b) \\wsl.localhost\Ubuntu\... または //wsl.localhost/Ubuntu/...
  const WSL_RE = /[\\/]{2}wsl\.localhost[\\/]Ubuntu[\\/][^\s"'`]+/gi;

  const conversions = [];
  const seen = new Set();

  for (const m of prompt.matchAll(WIN_RE)) {
    const orig = m[0];
    if (seen.has(orig)) continue;
    seen.add(orig);
    const sub = orig.match(/^[Cc]:[\\/]Users[\\/]doooo[\\/]Downloads[\\/](.+)$/);
    if (sub) {
      conversions.push({ from: orig, to: `/mnt/c/Users/doooo/Downloads/${sub[1].replace(/\\/g, '/')}` });
    }
  }

  for (const m of prompt.matchAll(WSL_RE)) {
    const orig = m[0];
    if (seen.has(orig)) continue;
    seen.add(orig);
    const sub = orig.match(/^[\\/]{2}wsl\.localhost[\\/]Ubuntu[\\/](.+)$/i);
    if (sub) {
      conversions.push({ from: orig, to: `/${sub[1].replace(/\\/g, '/')}` });
    }
  }

  if (conversions.length === 0) process.exit(0);

  const lines = [
    '【Sess108 案 1: Windows/WSL path 自動正規化】',
    '',
    '以下の path は WSL Linux path として扱えます (案 1 hook が Read 時に自動変換):',
    '',
  ];
  for (const c of conversions.slice(0, 5)) {
    lines.push(`- ${c.from}`);
    lines.push(`  → ${c.to}`);
  }
  if (conversions.length > 5) {
    lines.push('');
    lines.push(`(他 ${conversions.length - 5} 件の path も同様に正規化されます)`);
  }

  const output = {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: lines.join('\n'),
    },
  };
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
} catch {
  // 沈黙 + 必ず exit 0
  process.exit(0);
}
