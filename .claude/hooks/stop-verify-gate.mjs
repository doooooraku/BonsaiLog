#!/usr/bin/env node
/**
 * stop-verify-gate.mjs — ターン終了 (Stop) 時の verify ゲート (#1149 PoC、stop-verify-suggestion.mjs の後継)。
 *
 * 2 モード:
 * - **suggestion モード (default)**: 旧 stop-verify-suggestion.mjs と同じ。コード変更が
 *   あれば stderr で `pnpm verify` を推奨するだけ。block しない (exit 0)。
 * - **ゲートモード (`.claude/.stop-gate-on` が存在する時だけ)**: WATCHED パス
 *   (src / app / plugins / app.config.ts) の現在の内容指紋を `.claude/.verify-state.json`
 *   (= 最後に `pnpm verify` が緑だった時の指紋、record-verify-state.mjs が記録) と照合し、
 *   不一致なら **exit 2 でターン終了を block** する。verify を回して緑になれば指紋が
 *   更新され、次の Stop で通過する。
 *
 * 設計根拠:
 * - 公式 best practices 検証ゲート 4 段階の ③ Stop hook (https://code.claude.com/docs/en/hooks)。
 *   連続 8 block で Claude Code 本体が強制終了する公式仕様が暴走上限。
 * - 指紋は commit 非依存 (内容アドレス) — 「verify → commit → Stop」の正規フローで
 *   誤 block しない。「verify を飛ばして commit → Stop」は検出できる。
 * - docs / scripts のみの変更は WATCHED 外 = block しない (#1145 tiering 表 T1/T2 整合)。
 * - 既知の限界: state ファイルが無い初回は「committed 済み未検証」を区別できないため、
 *   dirty/untracked の WATCHED 変更がある時のみ block する (限界は #1149 に記録)。
 *
 * 安全網 (R-61): `.claude/.stop-gate-off` が存在すれば無条件 exit 0 (理由はファイル内に
 * 1 行書き残すこと)。flag はどちらも gitignored。
 */
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATE_PATH, computeFingerprint } from '../../scripts/dev/record-verify-state.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

function safe(cmd) {
  try {
    return execSync(cmd, { cwd: projectRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

// 安全網: 明示 off
if (existsSync(resolve(projectRoot, '.claude/.stop-gate-off'))) process.exit(0);

const gateOn = existsSync(resolve(projectRoot, '.claude/.stop-gate-on'));

// ---- suggestion モード (default、旧 stop-verify-suggestion.mjs と同挙動) ----
if (!gateOn) {
  const dirty = safe('git status --porcelain');
  if (!dirty) process.exit(0);
  const hasCodeChange = dirty
    .split('\n')
    .some((line) => /^.{2,3}(src|app|tests?|scripts|maestro)\//.test(line));
  if (!hasCodeChange) process.exit(0);
  process.stderr.write(
    [
      '[verify-suggestion] コード変更あり、未検証の可能性があります。',
      '  推奨: pnpm verify (全 chain、構成は package.json が正)',
      '  ゲートモード試験中は .claude/.stop-gate-on を作成 (#1149)',
    ].join('\n') + '\n',
  );
  process.exit(0);
}

// ---- ゲートモード (#1149 PoC) ----
let state = null;
try {
  state = JSON.parse(readFileSync(resolve(projectRoot, STATE_PATH), 'utf8'));
} catch {
  state = null;
}

const current = computeFingerprint(projectRoot);

if (state && state.fingerprint === current) process.exit(0); // 最後の verify 緑から内容無変更

if (!state) {
  // 初回 (記録なし): dirty/untracked の WATCHED 変更がある時のみ block (上記「既知の限界」)
  const dirtyWatched = safe('git status --porcelain -- src app plugins app.config.ts');
  if (!dirtyWatched) process.exit(0);
}

process.stderr.write(
  [
    '[stop-verify-gate] BLOCK: src/app/plugins/app.config.ts に verify 未通過の変更があります (#1149)。',
    `  対処: PATH=/usr/bin:/bin:$HOME/.nvm/versions/node/v$(cat .nvmrc).x.x/bin:$PATH 相当で \`pnpm verify\` を実行し、`,
    '  全 chain 緑にしてください (成功すると指紋が自動記録され、次の終了で通過します)。',
    '  どうしても今すぐ終了が必要な場合のみ: .claude/.stop-gate-off を作成 (理由を 1 行書くこと、R-61 安全網)。',
    `  状態: 記録=${state ? state.at : 'なし'} / 現在指紋=${current.slice(0, 12)}…`,
  ].join('\n') + '\n',
);
process.exit(2);
