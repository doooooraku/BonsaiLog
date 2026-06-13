#!/usr/bin/env node
/**
 * log-prompt-metrics.mjs — Sess108 認知飽和ガード 6 軸 prompt 計測 hook (案 8 / #1292)
 *
 * 由来: Notion 215 prompts 分析 (Sess108) + Stage A の効果計測欠落構造リスク。
 *       user 体感に影響を与えない silent 計測で、 Stage A 改善の効果を 6 軸で定量化する。
 *
 * 役割: UserPromptSubmit hook — user prompt の長さ + キーワード hit を計測し、
 *       .claude/metrics/ 配下の 6 jsonl に append。
 *       silent exit 0 (= block しない、 stdout に何も出さない)。
 *
 * 計測軸:
 *   ① prompt-length.jsonl    — 全 prompt の長さ
 *   ② explain-keyword.jsonl  — "誰にでもわかる" 等の説明品質指示
 *   ③ frustrated.jsonl       — "なんで" "理解できません" 等のフラスト指標
 *   ④ ui-fix-length.jsonl    — /ui-fix / 「UI 修正」 系
 *   ⑤ notion-paste.jsonl     — Notion path 言及 (= 手動コピペ依頼)
 *   ⑥ skill-invocation.jsonl — /<skill> 呼び出し
 *
 * 安全網: 全 catch + silent exit 0 (UX 影響ゼロ最優先)。
 */
import { readFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

const METRICS_DIR = join(projectRoot, '.claude/metrics');

const PATTERNS = {
  explain: [/誰にでもわか/, /誰でもわか/, /小中学生/, /やさし.{0,3}説明/],
  frustrated: [/なんで/, /理解できません/, /わからな[いく]/, /変じゃ/, /おかしい/, /うまくいか/],
  uiFix: [/\/ui-fix/, /UI\s*修正/, /画面.{0,5}修正/, /ヘッダ.{0,3}修正/, /配置.{0,3}修正/],
  notionPaste: [/notion\.so\//i, /\bNotion\b.{0,20}(パス|path|コピペ|貼って)/, /Notion.{0,20}URL/i],
  skill: /(^|\s)\/([a-zA-Z][a-zA-Z0-9-]+)\b|<command-name>\s*([a-zA-Z][a-zA-Z0-9-]+)\s*<\/command-name>/,
};

function append(name, record) {
  try {
    mkdirSync(METRICS_DIR, { recursive: true });
    const fp = join(METRICS_DIR, name);
    appendFileSync(fp, JSON.stringify(record) + '\n');
  } catch {
    /* silent */
  }
}

try {
  let payload = {};
  try {
    payload = JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    payload = {};
  }
  const prompt = String(payload.user_prompt ?? payload.prompt ?? payload.user_message ?? '');
  const sessionId = payload.session_id ?? null;
  const ts = new Date().toISOString();

  if (!prompt) process.exit(0);

  const length = prompt.length;

  // ① prompt 長 (全件)
  append('prompt-length.jsonl', { ts, session_id: sessionId, length });

  // ② 説明品質指示
  if (PATTERNS.explain.some((re) => re.test(prompt))) {
    append('explain-keyword.jsonl', { ts, session_id: sessionId, length });
  }

  // ③ Frustrated
  if (PATTERNS.frustrated.some((re) => re.test(prompt))) {
    append('frustrated.jsonl', { ts, session_id: sessionId, length, snippet: prompt.slice(0, 120) });
  }

  // ④ UI 修正
  if (PATTERNS.uiFix.some((re) => re.test(prompt))) {
    append('ui-fix-length.jsonl', { ts, session_id: sessionId, length });
  }

  // ⑤ Notion 手動コピペ
  if (PATTERNS.notionPaste.some((re) => re.test(prompt))) {
    append('notion-paste.jsonl', { ts, session_id: sessionId, length });
  }

  // ⑥ Skill 起動
  const skillMatch = prompt.match(PATTERNS.skill);
  if (skillMatch) {
    const skillName = skillMatch[2] ?? skillMatch[3] ?? null;
    if (skillName) {
      append('skill-invocation.jsonl', { ts, session_id: sessionId, skill: skillName });
    }
  }

  process.exit(0);
} catch {
  process.exit(0);
}
