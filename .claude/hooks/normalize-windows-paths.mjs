#!/usr/bin/env node
/**
 * Sess108 案 1 (ADR-0063 Stage A): Windows / WSL UNC path 自動正規化 hook
 *
 * PreToolUse(Read) hook
 * - stdin から JSON {tool_name, tool_input} を受け取り、 file_path が
 *   `C:\Users\doooo\Downloads\...` または `\\wsl.localhost\Ubuntu\...` の場合、
 *   WSL Linux path (`/mnt/c/...` または `/...`) に書き換えて
 *   `hookSpecificOutput.toolInput.file_path` で更新する。
 *
 * Notion 215 prompts 分析 (sess108-thinking-pattern-analysis.md) 由来:
 * - Windows path 67 件 + WSL UNC path 40 件 + 混在 16 件 → Read fail / 再質問 5-8 件/月
 * - 平均 50-100 字短縮 × 70 件/月 効率改善
 *
 * 設計理由:
 * - tool_name !== 'Read' は exit 0 (副作用ゼロ)
 * - ホワイトリスト外 (D:\ 等) は silent passthrough — 誤変換を起こさない
 * - エラー時は必ず silent exit 0 — Claude を絶対に壊さない
 */
import { readFileSync } from 'node:fs';

try {
  const raw = readFileSync(0, 'utf8');
  if (!raw.trim()) process.exit(0);
  const input = JSON.parse(raw);

  if (input?.tool_name !== 'Read') process.exit(0);

  const filePath = input?.tool_input?.file_path;
  if (typeof filePath !== 'string' || filePath.length === 0) process.exit(0);

  // 案 1 ホワイトリスト正規化:
  // (a) Windows path: C:\Users\doooo\Downloads\... → /mnt/c/Users/doooo/Downloads/...
  //     (backslash + forwardslash 両対応、 大文字小文字無視)
  // (b) WSL UNC path: \\wsl.localhost\Ubuntu\... → /...
  //     (forward slash 互換: //wsl.localhost/Ubuntu/...)
  let normalized = null;

  // (a) Windows Downloads path
  const winMatch = filePath.match(/^[Cc]:[\\/]Users[\\/]doooo[\\/]Downloads[\\/](.+)$/);
  if (winMatch) {
    normalized = `/mnt/c/Users/doooo/Downloads/${winMatch[1].replace(/\\/g, '/')}`;
  }

  // (b) WSL UNC path → Linux path
  if (!normalized) {
    const wslMatch = filePath.match(/^[\\/]{2}wsl\.localhost[\\/]Ubuntu[\\/](.+)$/i);
    if (wslMatch) {
      normalized = `/${wslMatch[1].replace(/\\/g, '/')}`;
    }
  }

  if (!normalized || normalized === filePath) process.exit(0);

  // hookSpecificOutput.toolInput.file_path を上書きして Claude Code に返す
  const output = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      toolInput: {
        ...input.tool_input,
        file_path: normalized,
      },
    },
  };
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
} catch {
  // 沈黙 + 必ず exit 0 (Claude UX 影響ゼロ)
  process.exit(0);
}
