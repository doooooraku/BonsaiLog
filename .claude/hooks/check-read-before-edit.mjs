#!/usr/bin/env node
/**
 * R-18: Read 前 Edit の絶対禁止
 *
 * PreToolUse hook (Edit / Write 対象)
 * - stdin から JSON {tool_name, tool_input, transcript_path} を受け取る
 * - tool_input.file_path が直近 transcript で Read されたか確認
 *   - 親セッション transcript + 同セッション配下 subagent transcript 群を走査
 *   - sub-agent (Task tool 経由) でも Read 履歴を拾えるよう subagents/*.jsonl も対象
 * - 未 Read なら exit 2 + stderr で block + ガイド出力
 *
 * 例外:
 * - 新規ファイル作成 (Write で path が存在しない) は Read 不要 → 通す
 *
 * 履歴:
 * - 2026-05-02: sub-agent から Edit/Write した際、 親 transcript には Read が記録されないため誤検知が頻発。
 *   同セッション ID 配下の `subagents/agent-*.jsonl` も走査するよう拡張 (Issue #12 F-11 着手時)。
 * - 2026-06-14 (Sess108 案 3 / #1287): transcript path 収集ロジックは transcript-scanner lib と
 *   同 pattern で揃えた。 Read tool_use 検出は本 hook 専用 (= lib は user/assistant message 抽出が主目的)
 *   なので、 JSONL 直接走査は維持。 挙動は完全に維持 (exit code / stderr 完全一致)。
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, basename, join } from 'node:path';

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

if (!transcript_path) {
  process.exit(0); // transcript なし、判定不能 (本番では block しない)
}

// 走査対象: 親 transcript + 同セッション subagent transcript 群
const transcripts = [];
if (existsSync(transcript_path)) {
  transcripts.push(transcript_path);
}
try {
  const dir = dirname(transcript_path);
  const baseFile = basename(transcript_path, '.jsonl');
  const subDir = join(dir, baseFile, 'subagents');
  if (existsSync(subDir)) {
    for (const f of readdirSync(subDir)) {
      if (f.endsWith('.jsonl')) {
        transcripts.push(join(subDir, f));
      }
    }
  }
} catch {
  // best-effort、subagent 走査の失敗は致命的ではない
}

let hasRead = false;
for (const tPath of transcripts) {
  let lines;
  try {
    lines = readFileSync(tPath, 'utf8').trim().split('\n');
  } catch {
    continue;
  }

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
  if (hasRead) break;
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
