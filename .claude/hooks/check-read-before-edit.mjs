#!/usr/bin/env node
/**
 * R-18: Read 前 Edit の絶対禁止
 *
 * PreToolUse hook (Edit / Write 対象)
 * - stdin から JSON {tool_name, tool_input, transcript_path} を受け取る
 * - tool_input.file_path が直近 transcript で Read されたか確認
 * - 未 Read なら exit 2 + stderr で block + ガイド出力
 *
 * Hook が読む transcript: Claude Code はセッション履歴を transcript_path に渡す。
 * その JSON 配列を末尾から走査し、Read ツールで同じ path を呼んだ tool_use を探す。
 *
 * 例外:
 * - 新規ファイル作成 (Write で path が存在しない) は Read 不要 → 通す
 */
import { readFileSync, existsSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const { tool_name, tool_input, transcript_path } = input;

// 対象は Edit / Write のみ (Read は無条件で通す)
if (!['Edit', 'Write'].includes(tool_name)) {
  process.exit(0);
}

const targetPath = tool_input?.file_path;
if (!targetPath) {
  process.exit(0); // path 不明、判定不能
}

// 新規ファイル作成 (Write で存在しない) は Read 不要
if (tool_name === 'Write' && !existsSync(targetPath)) {
  process.exit(0);
}

// transcript を読み込み、Read tool_use で targetPath があるか確認
if (!transcript_path || !existsSync(transcript_path)) {
  process.exit(0); // transcript なし、判定不能 (本番では block しない)
}

let lines;
try {
  lines = readFileSync(transcript_path, 'utf8').trim().split('\n');
} catch {
  process.exit(0);
}

let hasRead = false;
for (const line of lines) {
  try {
    const entry = JSON.parse(line);
    // tool_use エントリで Read かつ同じ path を探す
    if (entry?.type === 'tool_use' && entry?.name === 'Read' && entry?.input?.file_path === targetPath) {
      hasRead = true;
      break;
    }
    // assistant message 内の content 配列も走査
    if (entry?.message?.content) {
      for (const c of entry.message.content) {
        if (c?.type === 'tool_use' && c?.name === 'Read' && c?.input?.file_path === targetPath) {
          hasRead = true;
          break;
        }
      }
    }
    if (hasRead) break;
  } catch {
    // JSON parse 失敗は無視
  }
}

if (!hasRead) {
  console.error(
    `[R-18 violation] Edit/Write blocked: ${targetPath} は本セッションで Read されていません。\n` +
      `必ず Read してから編集してください。\n` +
      `Hook: .claude/hooks/check-read-before-edit.mjs`,
  );
  process.exit(2); // exit 2 で Claude にエラーを返す (block + retry guidance)
}

process.exit(0);
