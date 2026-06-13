#!/usr/bin/env node
/**
 * stop-explain-self-judge.mjs — Sess108 案 2 説明品質ゲート (後段、 自己判定)
 *
 * 由来: Notion 215 prompts 分析 (Sess108) + feedback-explain-plainly-with-diagrams.md
 *       + feedback-proposals-with-rationale.md。 Stop 時点の直近 assistant 出力を
 *       簡易検査して、 3 観点 (専門用語 5 個未満 / ASCII 図あり / 複数案推薦) で 2 個以上
 *       NG なら additionalContext で次ターン改善を促す。
 *
 * 役割: Stop hook — transcript の最後の assistant message を抽出し、 regex / keyword で
 *       簡易判定する。 block しない (silent exit 0)。 1 セッション 1 回だけ判定する
 *       (.claude/metrics/stop-judge.lock 存在で skip)。
 *
 * 設計理由: 説明品質は user の高頻度フィードバック領域 (Sess108 観察) のため、
 *           受動 (Stop) 時点でも自己観察し改善ループを構造化する。 false positive 抑制のため
 *           text 長 < 800 字は skip。 lock ファイルで 1 session 1 回に絞り通知疲れを防ぐ。
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

try {
  // --- 1 session 1 回 lock (metrics/stop-judge.lock) ---
  const lockPath = join(projectRoot, '.claude', 'metrics', 'stop-judge.lock');
  if (existsSync(lockPath)) process.exit(0);

  // --- hook input 取得 ---
  let payload = {};
  try {
    payload = JSON.parse(readFileSync(0, 'utf8') || '{}');
  } catch {
    payload = {};
  }
  const transcriptPath = payload.transcript_path;
  if (!transcriptPath || !existsSync(transcriptPath)) process.exit(0);

  // --- transcript JSONL を末尾から走査して最後の assistant message を抽出 ---
  let content = '';
  try {
    content = readFileSync(transcriptPath, 'utf8');
  } catch {
    process.exit(0);
  }
  const lines = content.split('\n').filter((l) => l.trim().length > 0);

  let lastAssistantText = '';
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const obj = JSON.parse(lines[i]);
      const isAssistant =
        obj.type === 'assistant' ||
        obj.role === 'assistant' ||
        obj.message?.role === 'assistant';
      if (!isAssistant) continue;
      const msg = obj.message ?? obj;
      let text = '';
      if (typeof msg.content === 'string') text = msg.content;
      else if (Array.isArray(msg.content)) {
        text = msg.content
          .map((c) => (typeof c === 'string' ? c : c?.text ?? ''))
          .join('\n');
      }
      if (text && text.length > 0) {
        lastAssistantText = text;
        break;
      }
    } catch {
      /* skip 不正 line */
    }
  }

  // 800 字未満は判定対象外 (short answer / 確認のみ)
  if (lastAssistantText.length < 800) process.exit(0);

  // --- 観点 1: 専門用語混入 (hardcoded 30 語のうち 5 個以上) ---
  const jargon = [
    'Hermes',
    'FlashList',
    'Reanimated',
    'KAV',
    'c.tint',
    'paddingBottom',
    'Z-order',
    'debounce',
    'throttle',
    'Zustand',
    'persist',
    'Drizzle',
    'FTS5',
    'RRULE',
    'safeArea',
    'focusEffect',
    'NavigationContainer',
    'Stack',
    'migration',
    'WCAG',
    'BORDER_DEFAULT',
    'mockup',
    'wireframe',
    'TTI',
    'FPS',
    'JS thread',
    'bridge overhead',
    'memo',
    'useMemo',
    'useCallback',
  ];
  let jargonCount = 0;
  for (const w of jargon) {
    // word boundary 風 (含むだけ判定で十分)
    if (lastAssistantText.includes(w)) jargonCount++;
  }
  const jargonNG = jargonCount >= 5;

  // --- 観点 2: ASCII 図 (code fence or box-drawing chars or arrows) ---
  const hasAscii =
    /```/.test(lastAssistantText) ||
    /[┌└├┤┬┴┼─│]/.test(lastAssistantText) ||
    /→|↓|⇒|⇩/.test(lastAssistantText);
  const asciiNG = !hasAscii;

  // --- 観点 3: 複数案 + 推薦 ---
  const hasMultiplePlans =
    /案\s*[AB]|案\s*[12]|\(推薦\)|（推薦）/.test(lastAssistantText);
  const planNG = !hasMultiplePlans;

  const ngCount = [jargonNG, asciiNG, planNG].filter(Boolean).length;
  if (ngCount < 2) process.exit(0);

  // --- 改善促し additionalContext 注入 ---
  const ngLabels = [];
  if (jargonNG) ngLabels.push(`専門用語 ${jargonCount} 個 (5 個未満が目標)`);
  if (asciiNG) ngLabels.push('ASCII 図なし');
  if (planNG) ngLabels.push('複数案 + 推薦表記なし');

  const warn = [
    '【説明品質自己判定 (Sess108 案 2) — NG ' + ngCount + '/3】',
    'NG: ' + ngLabels.join(' / '),
    '次の出力で 3 観点 (専門用語 5 個未満 / ASCII 図あり / 複数案 + 推薦) を改善してください。',
    '辞書: .claude/glossary/ui-terms.md (= 平易訳の参照先)。',
  ].join('\n');

  // lock 書き込み (1 session 1 回)
  try {
    mkdirSync(dirname(lockPath), { recursive: true });
    writeFileSync(lockPath, new Date().toISOString());
  } catch {
    /* lock 失敗は無視 */
  }

  const out = {
    hookSpecificOutput: {
      hookEventName: 'Stop',
      additionalContext: warn,
    },
  };
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
} catch {
  process.exit(0);
}
