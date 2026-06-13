/**
 * transcript-scanner.mjs — Claude Code transcript JSONL 走査の共通モジュール
 *
 * 由来: Sess108 案 3 / Issue #1287 / Notion 215 prompts 由来 (Anthropic 公式の hook input pattern)。
 * 設計理由:
 *   - check-read-before-edit.mjs と check-phase-transition.mjs が独立に transcript 走査ロジックを
 *     重複実装しており、 (a) 親 transcript + subagents/*.jsonl 走査 (b) user message 抽出
 *     (c) 承認文字列 regex などが drift しやすかった。 共通 lib に集約して drift 防止 +
 *     新規 hook (check-ask-after-approval.mjs) が薄く実装できるようにする。
 *   - 既存 hook の挙動は **完全維持**。 内部の transcript 走査ロジックのみ import 化。
 *
 * 安全網: 全ての import 元 hook は例外時 silent exit 0 を維持する想定。 本 lib は throw しない。
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, basename, join } from 'node:path';

/**
 * 親 transcript + 同セッション subagents/*.jsonl を走査して messages 配列を返す。
 *
 * @param {string} transcriptPath - 親 transcript の絶対 path
 * @param {object} [options]
 * @param {number} [options.limit=50] - 末尾から N 件まで読む (0 は全件)
 * @param {boolean} [options.includeSubagents=true] - subagents/*.jsonl も含むか
 * @returns {Array<{role: 'user'|'assistant'|'system', content: string, timestamp?: string, raw: object}>}
 */
export function readTranscriptMessages(transcriptPath, options = {}) {
  const { limit = 50, includeSubagents = true } = options;

  if (!transcriptPath || !existsSync(transcriptPath)) {
    return [];
  }

  // 走査対象: 親 transcript + 同セッション subagent transcript 群
  const transcripts = [transcriptPath];
  if (includeSubagents) {
    try {
      const dir = dirname(transcriptPath);
      const baseFile = basename(transcriptPath, '.jsonl');
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
  }

  const messages = [];
  for (const tPath of transcripts) {
    let lines;
    try {
      lines = readFileSync(tPath, 'utf8').split('\n').filter((l) => l.trim().length > 0);
    } catch {
      continue;
    }

    const slice = limit > 0 ? lines.slice(-Math.min(lines.length, limit)) : lines;
    for (const line of slice) {
      try {
        const obj = JSON.parse(line);
        // role 判定
        let role = null;
        if (obj.type === 'user' || obj.role === 'user' || obj.message?.role === 'user') role = 'user';
        else if (obj.type === 'assistant' || obj.role === 'assistant' || obj.message?.role === 'assistant') role = 'assistant';
        else if (obj.type === 'system' || obj.role === 'system' || obj.message?.role === 'system') role = 'system';
        if (!role) continue;

        // content 抽出 (string or array)
        const msg = obj.message ?? obj;
        let text = '';
        if (typeof msg.content === 'string') {
          text = msg.content;
        } else if (Array.isArray(msg.content)) {
          text = msg.content
            .map((c) => {
              if (typeof c === 'string') return c;
              if (c?.type === 'text' && typeof c.text === 'string') return c.text;
              if (typeof c?.text === 'string') return c.text;
              return '';
            })
            .join(' ');
        }
        if (!text) continue;

        messages.push({
          role,
          content: text,
          timestamp: obj.timestamp ?? obj.message?.timestamp,
          raw: obj,
        });
      } catch {
        /* skip 不正 line */
      }
    }
  }

  return messages;
}

/**
 * messages 配列を末尾から走査し、 regex hit する最新の message を返す。
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {RegExp} regex
 * @param {object} [opts]
 * @param {number} [opts.afterIndex=0] - この index より後ろ (= 0 起算 inclusive)
 * @param {'user'|'assistant'|'both'} [opts.role='user'] - 検索対象 role
 * @returns {{index: number, message: object} | null}
 */
export function findLatestMatch(messages, regex, opts = {}) {
  const { afterIndex = 0, role = 'user' } = opts;
  if (!Array.isArray(messages) || !regex) return null;

  for (let i = messages.length - 1; i >= Math.max(afterIndex, 0); i--) {
    const m = messages[i];
    if (!m) continue;
    if (role !== 'both' && m.role !== role) continue;
    if (regex.test(m.content)) {
      return { index: i, message: m };
    }
  }
  return null;
}

// === 共通 regex ===
const DISCUSS_RE = /(^|\s)\/discuss(\b|\s|$)|<command-name>\s*discuss\s*<\/command-name>/i;
const PLAN_RE = /(^|\s)\/plan(\b|\s|$)|<command-name>\s*plan\s*<\/command-name>/i;
const IMPLEMENT_RE = /(^|\s)\/implement(\b|\s|$)|<command-name>\s*implement\s*<\/command-name>/i;
// 承認文字列 (check-phase-transition.mjs から踏襲)
const APPROVAL_RE =
  /(✅|承認|認識合っています|認識あって|認識合って|進めて|お願いします|よろしく|OK\b|^ok$|go ahead|approve|approved|了解|GO\b)/i;
// 不可逆操作キーワード (案 3 仕様より)
const IRREVERSIBLE_RE =
  /(delete|destroy|drop|purge|削除|廃止|取消|破壊|DROP\s+TABLE)/i;

/**
 * messages から phase 遷移の各 index を検出する。
 *
 * @param {Array<{role: string, content: string}>} messages
 * @returns {{discussIdx: number, planIdx: number, implementIdx: number, approvalIdx: number, irreversibleIdx: number}}
 *   見つからない場合は -1。
 *   - discussIdx / planIdx / implementIdx / approvalIdx は user message のみ走査。
 *   - approvalIdx は discuss の **後** (= discussIdx + 1 以降) を探す。 discuss が無ければ -1。
 *   - irreversibleIdx は user / assistant 両方を走査 (= 不可逆操作の言及検知)。
 */
export function detectPhase(messages) {
  const result = {
    discussIdx: -1,
    planIdx: -1,
    implementIdx: -1,
    approvalIdx: -1,
    irreversibleIdx: -1,
  };
  if (!Array.isArray(messages)) return result;

  // user message の index を集める
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m || m.role !== 'user') continue;
    if (result.planIdx === -1 && PLAN_RE.test(m.content)) result.planIdx = i;
    if (result.discussIdx === -1 && DISCUSS_RE.test(m.content)) result.discussIdx = i;
    if (result.implementIdx === -1 && IMPLEMENT_RE.test(m.content)) result.implementIdx = i;
  }

  // approval は discuss より後ろ (= 順方向で最初の hit)
  if (result.discussIdx !== -1) {
    for (let i = result.discussIdx + 1; i < messages.length; i++) {
      const m = messages[i];
      if (!m || m.role !== 'user') continue;
      if (APPROVAL_RE.test(m.content)) {
        result.approvalIdx = i;
        break;
      }
    }
  }

  // 不可逆キーワードは user / assistant 両方の末尾走査
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m) continue;
    if (m.role !== 'user' && m.role !== 'assistant') continue;
    if (IRREVERSIBLE_RE.test(m.content)) {
      result.irreversibleIdx = i;
      break;
    }
  }

  return result;
}

// 内部 regex を export (テスト + 他 hook 流用用)
export const REGEX = {
  DISCUSS: DISCUSS_RE,
  PLAN: PLAN_RE,
  IMPLEMENT: IMPLEMENT_RE,
  APPROVAL: APPROVAL_RE,
  IRREVERSIBLE: IRREVERSIBLE_RE,
};
