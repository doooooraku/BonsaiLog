#!/usr/bin/env node
// scripts/ui-diff/kill-switch.mjs
// 自動改善ループの停止チェック utility (Phase 0.1)。
// /tmp/claude-stop.flag が存在すればループ停止のシグナル。

import * as fs from 'node:fs';

const KILL_SWITCH_PATH = '/tmp/claude-stop.flag';

export function isKillSwitchActive() {
  return fs.existsSync(KILL_SWITCH_PATH);
}

// CLI 実行: node kill-switch.mjs → STOP / CONTINUE を stdout 出力 + exit code (STOP=1, CONTINUE=0)
if (import.meta.url === `file://${process.argv[1]}`) {
  if (isKillSwitchActive()) {
    console.log('STOP');
    console.log(`  found: ${KILL_SWITCH_PATH}`);
    console.log(`  解除: rm ${KILL_SWITCH_PATH}`);
    process.exit(1);
  } else {
    console.log('CONTINUE');
    console.log(`  not found: ${KILL_SWITCH_PATH}`);
    console.log(`  停止する場合: touch ${KILL_SWITCH_PATH}`);
    process.exit(0);
  }
}
