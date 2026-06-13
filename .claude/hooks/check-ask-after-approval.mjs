#!/usr/bin/env node
/**
 * check-ask-after-approval.mjs — AskUserQuestion 抑制 (Sess108 案 3 / Issue #1287)
 *
 * 由来: feedback-plan-approval-implies-execution.md + Notion 215 prompts 由来。
 *   user が /discuss で設計承認した後、 /plan / 不可逆操作なしで AskUserQuestion を出すのは
 *   「計画承認 = 実行承認」 (Sess102 lesson) の違反。 進めて欲しいタイミングで再確認を挟むと
 *   user の context switch 負荷が増える。
 *
 * 設計:
 *   - PreToolUse / matcher: AskUserQuestion
 *   - transcript-scanner lib で直近 50 turn を走査
 *   - detectPhase で phase 状態を取得し:
 *     * discuss + approval かつ plan なし かつ 不可逆操作なし → exit 2 で block + stderr 案内
 *     * 不可逆操作言及あり → exit 0 + stderr に WARN のみ (= 不可逆は確認すべき)
 *     * その他 → silent exit 0
 *   - 例外時は silent exit 0 (Claude を絶対に壊さない)
 */
import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readTranscriptMessages, detectPhase } from './lib/transcript-scanner.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

function logSafe(msg) {
  try {
    const logDir = join(projectRoot, '.claude', 'logs');
    mkdirSync(logDir, { recursive: true });
    appendFileSync(
      join(logDir, 'ask-after-approval.log'),
      `${new Date().toISOString()}\t${msg}\n`,
    );
  } catch {
    /* ログ失敗は無視 */
  }
}

try {
  let payload = {};
  try {
    payload = JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    payload = {};
  }
  const toolName = payload.tool_name;
  const transcriptPath = payload.transcript_path;

  if (toolName !== 'AskUserQuestion') {
    process.exit(0);
  }
  if (!transcriptPath) {
    process.exit(0);
  }

  const messages = readTranscriptMessages(transcriptPath, { limit: 50 });
  if (messages.length === 0) {
    process.exit(0);
  }

  const phase = detectPhase(messages);
  const { discussIdx, planIdx, approvalIdx, irreversibleIdx } = phase;

  // case 1: 不可逆操作言及あり → 確認は妥当、 WARN のみ
  if (irreversibleIdx !== -1) {
    process.stderr.write(
      '[ask-after-approval WARN] 不可逆操作 (delete/destroy/drop/purge/削除 等) が context に含まれます。 ' +
        '確認は許可されますが、 質問前に「やります」 と宣言してから問う形を推奨します ' +
        '(= feedback-plan-approval-implies-execution.md)。\n',
    );
    logSafe(`warn-irreversible\tirreversibleIdx=${irreversibleIdx}`);
    process.exit(0);
  }

  // case 2: discuss + approval かつ plan なし → block
  if (discussIdx !== -1 && approvalIdx !== -1 && planIdx === -1) {
    logSafe(`block\tdiscussIdx=${discussIdx}\tapprovalIdx=${approvalIdx}\tplanIdx=${planIdx}`);
    process.stderr.write(
      '[ask-after-approval BLOCK] /discuss 承認後の AskUserQuestion は抑制対象です。 ' +
        'user は既に「承認 = 実行承認」 を表明済みなので、 再確認なしで実装に進んでください ' +
        '(= feedback-plan-approval-implies-execution.md)。\n' +
        '例外 (= 確認すべきケース):\n' +
        '  - 不可逆操作 (delete/destroy/drop/purge/削除/廃止/取消/破壊/DROP TABLE)\n' +
        '  - 計画変更が必要 (= discuss 範囲外)\n' +
        '  - user 専決分岐 (= user の好み判断)\n' +
        '本当に確認が必要なら、 文脈に「削除」「破壊」 等の不可逆語を明示してください。\n' +
        'Hook: .claude/hooks/check-ask-after-approval.mjs',
    );
    process.exit(2);
  }

  // case 3: その他は silent
  process.exit(0);
} catch {
  process.exit(0);
}
