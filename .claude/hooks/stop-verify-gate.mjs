#!/usr/bin/env node
/**
 * stop-verify-gate.mjs — ターン終了 (Stop) 時の verify ゲート (#1149 採用版、default ON)。
 *
 * 動作 (2 層 OR、 いずれか 1 層で block 条件成立なら exit 2):
 *   [層 A — verify 緑指紋ゲート (#1149)] 以下 3 条件が**すべて**成立した時に block。
 *     A-1. 本セッション (subagent 含む) が WATCHED パス (src / app / plugins / app.config.ts)
 *          のファイルを Edit / Write / NotebookEdit している (transcript 走査、R-18 hook と同方式)
 *     A-2. WATCHED パスの現在の内容指紋が `.claude/.verify-state.json` (= 最後に `pnpm verify` が
 *          緑だった時の指紋、record-verify-state.mjs が記録) と不一致 (or 記録なし)
 *     A-3. `.claude/.stop-gate-off` (安全網フラグ、R-61) が存在しない
 *   [層 B — 実機検証 SS 不在ゲート (Sess108 案 9 / #1293)] 以下が**すべて**成立した時に block。
 *     B-1. 層 A-1 と同じ (本セッションで WATCHED = UI 系を編集)
 *     B-2. 本セッション transcript の直近 20 turn で git commit / git push / gh pr create を観測
 *     B-3. SS 撮影キーワード (take-ss.sh / screencap / device-verify / dist/.*verify) が transcript に不在
 *     B-4. 直近 commit subject / PR title が exempt prefix (docs:/chore:/test:/refactor:/style:) でない
 *     B-5. 層 A-3 と同じ (.stop-gate-off なし)
 *
 * 層 A: 条件 A-1 により「他セッションが残した未検証変更」では block しない (docs 専用セッションの
 *   誤爆防止)。条件 A-2 の指紋は `git stash create` の tree oid ベースで **commit しても内容が
 *   同じなら不変** — 正規フロー「verify → commit → 終了」で誤 block しない (#1155 T6/live③ 実証)。
 * 層 B 由来: Notion 215 prompts 分析「実機検証において何故ユーザーに依頼する」 + user 恒常指示
 *   「screencap → Read で目視」 (Sess107)。 完了の鉄則 §4 (CLAUDE.md) の機械強制化。
 *   UI 系編集 (B-1) を必須にすることで harness 限定セッション (= hook/skill 編集のみ) の誤 block を防ぐ。
 *
 * 試験記録: 合成 7/7 + live 3/3 PASS (PR #1155 / #1156、Issue #1149)。 層 B は Sess108 で追加。
 * 暴走上限: 公式仕様の連続 8 block 強制終了 (https://code.claude.com/docs/en/hooks)。
 * 解除: verify を回して緑にする (指紋が自動更新) / 実機 SS を撮影 (take-ss.sh) /
 *       緊急時のみ .claude/.stop-gate-off 作成 (理由を 1 行書き残すこと)。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATE_PATH, WATCHED, computeFingerprint } from '../../scripts/dev/record-verify-state.mjs';
import { readTranscriptMessages } from './lib/transcript-scanner.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

// 安全網: 明示 off (R-61) — 両層 skip
if (existsSync(resolve(projectRoot, '.claude/.stop-gate-off'))) process.exit(0);

// --- 共通: hook input 取得 ---
let payload = {};
try {
  payload = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  payload = {};
}
const transcriptPath = payload.transcript_path;
if (!transcriptPath || !existsSync(transcriptPath)) process.exit(0); // 判定不能時は block しない

// --- 共通: 本セッションが WATCHED を編集したか (層 A-1 + 層 B-1 共有、 transcript 走査) ---
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
// UI 系 (WATCHED) を編集していない harness セッションは両層とも対象外
if (!sessionEditedWatched) process.exit(0);

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

// ============================================================================
// 層 A: verify 緑指紋ゲート (#1149)
// ============================================================================
let state = null;
try {
  state = JSON.parse(readFileSync(resolve(projectRoot, STATE_PATH), 'utf8'));
} catch {
  state = null;
}
const current = computeFingerprint(projectRoot);
const layerAFingerprintMatch = state && state.fingerprint === current;

if (!layerAFingerprintMatch) {
  process.stderr.write(
    [
      '[stop-verify-gate] BLOCK (層 A): 本セッションで src/app/plugins/app.config.ts を編集しましたが、その内容で pnpm verify が緑になった記録がありません (#1149)。',
      '  対処: `pnpm verify` を実行し全 chain 緑にしてください (成功すると指紋が自動記録され、次の終了で通過します)。',
      '  Node は .nvmrc の version を使うこと (verify:node が冒頭で検査します)。',
      '  どうしても今すぐ終了が必要な場合のみ: .claude/.stop-gate-off を作成 (理由を 1 行書くこと、R-61 安全網)。',
      `  状態: 記録=${state ? state.at : 'なし'} / 現在指紋=${current.slice(0, 12)}… / branch=${safe('git branch --show-current')}`,
    ].join('\n') + '\n',
  );
  process.exit(2);
}

// ============================================================================
// 層 B: 実機検証 SS 不在ゲート (Sess108 案 9 / #1293)
//   B-1 (WATCHED 編集) は冒頭で済 / B-5 (.stop-gate-off なし) も冒頭で済
// ============================================================================
// 直近 20 turn を読む (subagents 含めない — 親 transcript で十分)
const recentMessages = readTranscriptMessages(transcriptPath, { limit: 20, includeSubagents: false });
const recentText = recentMessages.map((m) => m.content).join('\n');

// B-2: git commit / git push / gh pr create を観測
//   transcript 内 Bash tool call の input 文字列 + assistant message text 両方を走査するため
//   readTranscriptMessages で取れる content (= text only) に加えて生 JSONL も部分走査する。
let rawTranscriptTail = '';
try {
  const lines = readFileSync(transcriptPath, 'utf8').split('\n');
  rawTranscriptTail = lines.slice(-Math.min(lines.length, 200)).join('\n');
} catch {
  rawTranscriptTail = '';
}
const haystack = recentText + '\n' + rawTranscriptTail;
const commitObservedRe = /\bgit\s+commit\b|\bgit\s+push\b|\bgh\s+pr\s+create\b/;
const commitObserved = commitObservedRe.test(haystack);

// B-3: SS 撮影キーワード (take-ss.sh / screencap / device-verify / dist/.*verify) が transcript に不在
const ssKeywordRe = /take-ss\.sh|screencap|device-verify|dist\/[^\s"']*verify/i;
const ssAbsent = !ssKeywordRe.test(haystack);

// B-4: 直近 commit subject / PR title が exempt prefix でない
//   現在の HEAD subject + 直近 git log 5 件 から判定。
const exemptRe = /^(docs|chore|test|refactor|style|ci|build|perf)(\([^)]*\))?!?:/i;
const headSubject = safe('git log -1 --pretty=%s');
const recentSubjects = safe('git log -5 --pretty=%s').split('\n').filter(Boolean);
const currentBranch = safe('git branch --show-current');
// 全 subject が exempt なら exempt 扱い / 1 つでも non-exempt があれば non-exempt (厳しめ判定)
const hasNonExemptSubject = recentSubjects.some((s) => s && !exemptRe.test(s));

if (commitObserved && ssAbsent && hasNonExemptSubject) {
  process.stderr.write(
    [
      '[stop-verify-gate] BLOCK (層 B): 完了の鉄則 §4 — 実機検証 SS が観測できません (Sess108 #1293)。',
      '  検出: 本セッションで git commit / push / gh pr create を観測しましたが、',
      '        take-ss.sh / screencap / device-verify / dist/*verify のいずれの SS keyword も transcript に不在です。',
      '  対処: /device-verify を起動し Step 4-6 (撮影 → Read 目視 → PR コメント添付) を実施してください。',
      '        または UI 影響なしの場合は commit subject を `docs:` / `chore:` / `test:` / `refactor:` / `style:` で始めてください (exempt)。',
      '        どうしても今すぐ終了が必要な場合のみ: .claude/.stop-gate-off を作成 (理由を 1 行書くこと、R-61 安全網)。',
      `  状態: HEAD subject="${headSubject.slice(0, 80)}" / branch=${currentBranch}`,
    ].join('\n') + '\n',
  );
  process.exit(2);
}

// 全層 OK
process.exit(0);
