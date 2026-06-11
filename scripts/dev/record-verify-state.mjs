#!/usr/bin/env node
/**
 * record-verify-state.mjs — `pnpm verify` 全 chain 成功時に「コード内容の指紋」を記録する (#1149)。
 *
 * 配線: package.json の `verify` chain 末尾 (`&& node scripts/dev/record-verify-state.mjs`)。
 *       && 連結なので全ゲート緑の時だけ走る = 「記録がある」=「この内容で verify 緑だった」。
 * 出力: .claude/.verify-state.json (gitignored) — { fingerprint, at }
 *
 * 指紋の性質 (Stop hook ゲート `.claude/hooks/stop-verify-gate.mjs` が照合に使う):
 * - 対象は WATCHED パス (src / app / plugins / app.config.ts) の「内容」のみ
 * - `git stash create` の tree oid ベースなので、**verify 後に commit しても内容が
 *   同じなら指紋は変わらない** (commit 有無や HEAD 位置に依存しない)
 * - untracked の新規ファイルは stash create に含まれないため、`git hash-object` で個別に混ぜる
 * - docs / scripts 等 WATCHED 外の変更は指紋に影響しない (#1145 tiering 表 T1/T2 整合)
 */
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

export const WATCHED = ['src', 'app', 'plugins', 'app.config.ts'];
export const STATE_PATH = '.claude/.verify-state.json';

function safe(cmd, cwd) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

/** WATCHED パスの現在内容の指紋を返す (commit 非依存・内容アドレス)。 */
export function computeFingerprint(root = projectRoot) {
  // stash create = working tree (tracked 分) を匿名 commit 化、tree 無変更なら '' → HEAD を使う
  const commit = safe('git stash create', root) || safe('git rev-parse HEAD', root);
  const parts = [];
  for (const p of WATCHED) {
    parts.push(`${p}=${safe(`git rev-parse "${commit}:${p}"`, root) || 'absent'}`);
  }
  // untracked (新規ファイル) は stash create 対象外 → 内容 hash を個別に混ぜる
  const untracked = safe(
    `git ls-files -o --exclude-standard -- ${WATCHED.map((p) => `"${p}"`).join(' ')}`,
    root,
  );
  for (const f of untracked.split('\n').filter(Boolean)) {
    parts.push(`${f}=${safe(`git hash-object "${f}"`, root) || 'unreadable'}`);
  }
  return createHash('sha1').update(parts.join('|')).digest('hex');
}

// 直接実行時のみ記録 (hook からは computeFingerprint を import するだけ)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const statePath = resolve(projectRoot, STATE_PATH);
  mkdirSync(dirname(statePath), { recursive: true });
  const fingerprint = computeFingerprint();
  writeFileSync(
    statePath,
    JSON.stringify({ fingerprint, at: new Date().toISOString() }, null, 2) + '\n',
  );
  console.log(`\x1b[32m✓ verify-state 記録: ${fingerprint.slice(0, 12)}… (${STATE_PATH})\x1b[0m`);
}
