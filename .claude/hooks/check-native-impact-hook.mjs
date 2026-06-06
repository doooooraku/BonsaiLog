#!/usr/bin/env node
/**
 * Sess71 PR-2 / ADR-0046 Amendment: Claude Code PostToolUse(Edit|Write) hook 連携。
 *
 * 役割: Claude Code が file 編集した直後に scripts/check-native-impact.mjs に委譲し、
 * Native 影響を検出した場合は dist/.native-dirty flag file を立てる。
 *
 * 設計の核 (Sess71 plan 整合):
 * - 共通核 scripts/check-native-impact.mjs を call (重複実装回避、 DRY)
 * - stdin で受信した Claude Code の hook context を package して --from=hook で渡す
 * - 共通核の判定結果 (Native 影響あり/なし) は exit code ではなく flag file で表現
 *   (本 hook 自体は常に exit 0 = Claude Code の処理をブロックしない)
 *
 * 関連: scripts/check-native-impact.mjs / docs/how-to/development/dev-workflow.md / R-61 起票
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CHECK_SCRIPT = resolve(
  process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
  'scripts/check-native-impact.mjs',
);

function readStdinSync() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function main() {
  // Claude Code hook context (stdin JSON) を受信
  const raw = readStdinSync();
  if (!raw.trim()) {
    // hook context 無しの場合は何もしない (例: 非 Edit/Write tool 由来)
    process.exit(0);
  }

  // 共通核 (scripts/check-native-impact.mjs) に stdin として渡す
  const result = spawnSync('node', [CHECK_SCRIPT, '--from=hook'], {
    input: raw,
    encoding: 'utf-8',
  });

  // 共通核の stdout を Claude Code log に転送 (user / agent 両方に visible)
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  // 本 hook 自体は常に exit 0 (Claude Code の処理をブロックしない、 ADR-0046 整合)
  process.exit(0);
}

main();
