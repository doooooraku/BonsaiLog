#!/usr/bin/env node
/**
 * stop-verify-gate.mjs — ターン終了 (Stop) 時の verify ゲート (#1149 採用版、default ON)。
 *
 * 動作: 以下 3 条件が**すべて**成立した時だけ exit 2 でターン終了を block する。
 *   1. 本セッション (subagent 含む) が WATCHED パス (src / app / plugins / app.config.ts)
 *      のファイルを Edit / Write / NotebookEdit している (transcript 走査、R-18 hook と同方式)
 *   2. WATCHED パスの現在の内容指紋が `.claude/.verify-state.json` (= 最後に `pnpm verify` が
 *      緑だった時の指紋、record-verify-state.mjs が記録) と不一致 (or 記録なし)
 *   3. `.claude/.stop-gate-off` (安全網フラグ、R-61) が存在しない
 *
 * 条件 1 により「他セッションが残した未検証変更」では block しない (docs 専用セッションの
 * 誤爆防止)。条件 2 の指紋は `git stash create` の tree oid ベースで **commit しても内容が
 * 同じなら不変** — 正規フロー「verify → commit → 終了」で誤 block しない (#1155 T6/live③ 実証)。
 *
 * 試験記録: 合成 7/7 + live 3/3 PASS (PR #1155 / #1156、Issue #1149)。
 * 暴走上限: 公式仕様の連続 8 block 強制終了 (https://code.claude.com/docs/en/hooks)。
 * 解除: verify を回して緑にする (指紋が自動更新) / 緊急時のみ .claude/.stop-gate-off 作成
 *       (理由を 1 行書き残すこと)。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATE_PATH, WATCHED, computeFingerprint } from '../../scripts/dev/record-verify-state.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

// 安全網: 明示 off (R-61)
if (existsSync(resolve(projectRoot, '.claude/.stop-gate-off'))) process.exit(0);

// --- 条件 1: 本セッションが WATCHED を編集したか (transcript 走査、R-18 hook と同方式) ---
let payload = {};
try {
  payload = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  payload = {};
}
const transcriptPath = payload.transcript_path;
if (!transcriptPath || !existsSync(transcriptPath)) process.exit(0); // 判定不能時は block しない

const transcripts = [transcriptPath];
try {
  const subDir = join(dirname(transcriptPath), basename(transcriptPath, '.jsonl'), 'subagents');
  if (existsSync(subDir)) {
    for (const f of readdirSync(subDir)) {
      if (f.endsWith('.jsonl')) transcripts.push(join(subDir, f));
    }
  }
} catch {
  /* subagent transcript なしは無視 */
}

const watchedPrefixes = WATCHED.map((p) => resolve(projectRoot, p));
const editRe = /"name":\s*"(Edit|Write|NotebookEdit)"/;
const pathRe = /"(?:file_path|notebook_path)":\s*"([^"]+)"/g;

let sessionEditedWatched = false;
outer: for (const t of transcripts) {
  let content = '';
  try {
    content = readFileSync(t, 'utf8');
  } catch {
    continue;
  }
  for (const line of content.split('\n')) {
    if (!editRe.test(line)) continue;
    for (const m of line.matchAll(pathRe)) {
      const p = m[1];
      if (watchedPrefixes.some((w) => p === w || p.startsWith(w + '/'))) {
        sessionEditedWatched = true;
        break outer;
      }
    }
  }
}
if (!sessionEditedWatched) process.exit(0);

// --- 条件 2: 内容指紋が最後の verify 緑と一致するか ---
let state = null;
try {
  state = JSON.parse(readFileSync(resolve(projectRoot, STATE_PATH), 'utf8'));
} catch {
  state = null;
}
const current = computeFingerprint(projectRoot);
if (state && state.fingerprint === current) process.exit(0); // verify 緑から内容無変更

function safe(cmd) {
  try {
    return execSync(cmd, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
  }
}

process.stderr.write(
  [
    '[stop-verify-gate] BLOCK: 本セッションで src/app/plugins/app.config.ts を編集しましたが、その内容で pnpm verify が緑になった記録がありません (#1149)。',
    '  対処: `pnpm verify` を実行し全 chain 緑にしてください (成功すると指紋が自動記録され、次の終了で通過します)。',
    '  Node は .nvmrc の version を使うこと (verify:node が冒頭で検査します)。',
    '  どうしても今すぐ終了が必要な場合のみ: .claude/.stop-gate-off を作成 (理由を 1 行書くこと、R-61 安全網)。',
    `  状態: 記録=${state ? state.at : 'なし'} / 現在指紋=${current.slice(0, 12)}… / branch=${safe('git branch --show-current')}`,
  ].join('\n') + '\n',
);
process.exit(2);
