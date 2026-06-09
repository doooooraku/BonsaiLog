#!/usr/bin/env node
/**
 * log-doc-reads.mjs — ClaudeCode の doc 系 Read を継続収集する hook (Sess90 PR2 Phase 2)。
 *
 * Phase 1 (= PR #1039 + #1040 で整備された baseline) を継続的に裏付けるため、
 * PreToolUse:Read と InstructionsLoaded の 2 event を append-only JSONL に記録。
 * 30 日後の /retro Skill 統合 (Phase 3) で消費する。
 *
 * 入力: stdin JSON (= ClaudeCode hook payload)
 * 出力: ${CLAUDE_PROJECT_DIR}/.claude/metrics/doc-reads.jsonl (= append-only、 .gitignore 済)
 * 失敗時: catch all + 必ず exit 0 (= Claude 動作には絶対影響させない)
 *
 * scope filter は scripts/dev/lib/doc-scope.mjs と共有 (= 二重管理回避)。
 *
 * 議題: Sess89+ 議論モード結論 (= 案 A+B ハイブリッド 3 Phase、 PR 2 本順次)。
 * Plan: /home/doooo/.claude/plans/keen-dancing-quokka.md
 */
import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

try {
  // 共通 module を動的 import (= hook は .claude/hooks/、 module は scripts/dev/lib/)
  const { isInScope } = await import(resolve(projectRoot, 'scripts/dev/lib/doc-scope.mjs'));

  const raw = readFileSync(0, 'utf8');
  if (!raw.trim()) process.exit(0);
  const input = JSON.parse(raw);
  const eventName = input?.hook_event_name;
  const sessionId = input?.session_id ?? null;
  const outDir = process.env.CLAUDE_PROJECT_DIR ?? projectRoot;
  const ts = new Date().toISOString();

  let record = null;
  if (eventName === 'PreToolUse' && input?.tool_name === 'Read') {
    const fp = input?.tool_input?.file_path;
    if (typeof fp === 'string' && isInScope(fp)) {
      record = {
        ts,
        session_id: sessionId,
        event: 'PreToolUse:Read',
        file_path: fp,
        memory_type: null,
        load_reason: null,
      };
    }
  } else if (eventName === 'InstructionsLoaded') {
    const fp = input?.file_path;
    if (typeof fp === 'string' && isInScope(fp)) {
      record = {
        ts,
        session_id: sessionId,
        event: 'InstructionsLoaded',
        file_path: fp,
        memory_type: input?.memory_type ?? null,
        load_reason: input?.load_reason ?? null,
      };
    }
  }

  if (record) {
    const outPath = join(outDir, '.claude/metrics/doc-reads.jsonl');
    mkdirSync(dirname(outPath), { recursive: true });
    appendFileSync(outPath, JSON.stringify(record) + '\n', 'utf8');
  }
} catch {
  // 沈黙 + 必ず exit 0 (= Claude UX 影響ゼロ)
}
process.exit(0);
