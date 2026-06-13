#!/usr/bin/env node
/**
 * check-phase-transition.mjs — R-82 推奨フロー (/discuss 承認 → /plan → /implement) 逸脱 WARN
 *
 * 由来:
 *   feedback-plan-approval-implies-execution.md + docs/how-to/development/whole_workflow.md §1.5.4
 *   /discuss で設計確定 (= user 承認) を観測した後、 /plan を経由せず直接 /implement に進むと
 *   親 Issue 起票なしで実装が始まり、 AC / ADR / Context が track されない事故が起きる。
 *
 * 役割:
 *   UserPromptSubmit で hook input から transcript path を取得し、 直近 50 turn を JSONL で走査:
 *     - 直近 /discuss 起動
 *     - その後の user 承認文字列 (✅ / OK / 進めて / 承認 等)
 *     - その後の /plan 起動 (なし)
 *     - 現在の prompt が /implement (引数 <N> なし)
 *   いずれか case A / case C に該当したら additionalContext で 1 文 WARN を注入する (exit 0)。
 *
 * 安全網: 例外は全て catch して silent exit 0 (Claude の動作を絶対に壊さない)。
 * 警告レベル: exit 2 block はせず、 1 セッション運用観察後の昇格判断対象。
 *
 * 仕様参考: parallel-session-guard.mjs の UserPromptSubmit additionalContext 注入 pattern を踏襲。
 *
 * 履歴:
 * - 2026-06-14 (Sess108 案 3 / #1287): transcript 走査 + phase 検出を ./lib/transcript-scanner.mjs に集約。
 *   挙動 (= case A / case C 判定 / WARN 文 / log 形式) は完全維持、 内部 import 化のみ。
 */
import { readFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readTranscriptMessages, detectPhase, REGEX } from './lib/transcript-scanner.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

function log(msg) {
  try {
    const logDir = join(projectRoot, '.claude', 'logs');
    mkdirSync(logDir, { recursive: true });
    appendFileSync(
      join(logDir, 'phase-transition.log'),
      `${new Date().toISOString()}\t${msg}\n`,
    );
  } catch {
    /* ログ失敗は無視 */
  }
}

try {
  // --- hook input 取得 (parallel-session-guard.mjs と同 pattern) ---
  let payload = {};
  try {
    payload = JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    payload = {};
  }
  const transcriptPath = payload.transcript_path;
  const currentPrompt = String(payload.prompt ?? payload.user_message ?? '');

  if (!transcriptPath || !existsSync(transcriptPath)) {
    // 判定不能 → 安全 silent exit
    process.exit(0);
  }

  // --- 現在の prompt が /implement か判定 ---
  const implementRe = /(^|\s)\/implement(\b|\s|$)/;
  const implementCmdRe = /<command-name>\s*implement\s*<\/command-name>/i;
  const isImplementNow = implementRe.test(currentPrompt) || implementCmdRe.test(currentPrompt);
  if (!isImplementNow) {
    // 現在 /implement でないなら R-82 対象外
    process.exit(0);
  }

  // --- /implement <N> 形式 (引数 = Issue 番号) なら既に Issue 指定済みで AC 満たすので skip ---
  // 例: "/implement 1234" / "/implement #1234"
  const implementWithIssueRe = /\/implement\s+#?\d+/;
  const hasIssueArg = implementWithIssueRe.test(currentPrompt);

  // --- transcript を JSONL で読み、 直近 50 turn を走査 (= transcript-scanner lib に集約) ---
  const messages = readTranscriptMessages(transcriptPath, { limit: 50, includeSubagents: false });
  const phase = detectPhase(messages);
  const { discussIdx, planIdx, approvalIdx } = phase;

  // case 判定 (= 元実装と同じ)
  // case A: /discuss 観測 + 承認文字列観測 + /plan 観測なし (or plan が discuss より前) + 現在 /implement
  const planAfterDiscuss = planIdx !== -1 && discussIdx !== -1 && planIdx > discussIdx;
  const caseA =
    discussIdx !== -1 &&
    approvalIdx !== -1 &&
    !planAfterDiscuss &&
    !hasIssueArg;
  // case B: /implement <N> 形式 → skip (= 既に判定済みで approval なしでも OK)
  // case C: 現在 /implement <N> なし + 直近 /plan 起動なし
  const caseC = !hasIssueArg && planIdx === -1;

  if (!caseA && !caseC) {
    log(`skip\timplement\thasIssueArg=${hasIssueArg}\tdiscussIdx=${discussIdx}\tplanIdx=${planIdx}\tapprovalIdx=${approvalIdx}`);
    process.exit(0);
  }

  const detectedCase = caseA ? 'A' : 'C';
  log(`warn\tcase=${detectedCase}\thasIssueArg=${hasIssueArg}\tdiscussIdx=${discussIdx}\tplanIdx=${planIdx}\tapprovalIdx=${approvalIdx}`);

  const warnMsg =
    '⚠️ R-82 phase transition WARN (case ' +
    detectedCase +
    '): /discuss 承認後に /plan を経由していない可能性があります。 ' +
    '親 Issue を /plan で起票してから /implement <N> を起動するのが推奨フローです ' +
    '(= feedback-plan-approval-implies-execution.md + docs/how-to/development/whole_workflow.md §1.5.4)。 ' +
    '1 文修正の typo / chore は label:no-issue で直接 PR 可。';

  // additionalContext 注入 (= UserPromptSubmit hook の Claude Code 仕様)
  const out = {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: warnMsg,
    },
  };
  process.stdout.write(JSON.stringify(out));
  // REGEX は使わないが lib 経由で stable な値を取得していることを示す (= 共有 SoT 確認用 import)
  void REGEX;
  process.exit(0);
} catch {
  process.exit(0);
}
