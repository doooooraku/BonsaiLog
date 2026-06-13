#!/usr/bin/env node
/**
 * measure-prompt-metrics.mjs — Sess108 認知飽和ガード 6 軸計測集計 CLI (案 8 / #1292)
 *
 * 由来: Notion 215 prompts 分析 + Sess108 認知飽和ガード議論。
 *       「効果計測がない」 を構造防御するため、 6 軸の jsonl を集計して達成度評価。
 *
 * 役割:
 *   .claude/metrics/ 配下の jsonl を集計:
 *     ① prompt-length.jsonl       — user prompt 長 (目標 < 400 字)
 *     ② explain-keyword.jsonl     — "誰にでもわかる" 出現率 (目標 < 10%)
 *     ③ frustrated.jsonl          — Frustrated prompt 数 (目標 = 0)
 *     ④ ui-fix-length.jsonl       — UI 修正 prompt 長 (目標 ~ 200 字)
 *     ⑤ notion-paste.jsonl        — Notion 手動コピペ依頼 (目標 = 0)
 *     ⑥ skill-invocation.jsonl    — 1 セッション Skill 起動 (目標 4+)
 *
 * 引数:
 *   --report           集計表示 (default)
 *   --bootstrap        初期値記録 (= 計測開始 marker を残す)
 *   --since YYYY-MM-DD 期間指定
 *   --json             機械可読出力
 *
 * 安全網: 全 jsonl 不在でも 0 件として report (= 計測開始前 state を明示)。
 *         例外は catch、 silent exit 0。
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const bootstrap = args.includes('--bootstrap');
const sinceIdx = args.indexOf('--since');
const sinceDate = sinceIdx >= 0 ? args[sinceIdx + 1] : null;

const METRICS_DIR = join(projectRoot, '.claude/metrics');
const FILES = {
  promptLength: 'prompt-length.jsonl',
  explainKeyword: 'explain-keyword.jsonl',
  frustrated: 'frustrated.jsonl',
  uiFixLength: 'ui-fix-length.jsonl',
  notionPaste: 'notion-paste.jsonl',
  skillInvocation: 'skill-invocation.jsonl',
};

const TARGETS = {
  promptLengthAvg: 400, // 平均 < 400 字
  explainKeywordRate: 0.1, // < 10%
  frustratedCount: 0,
  uiFixLengthAvg: 200,
  notionPasteCount: 0,
  skillPerSession: 4, // 1 セッション 4+ Skill 起動
};

function readJsonl(name) {
  const fp = join(METRICS_DIR, name);
  if (!existsSync(fp)) return [];
  const records = [];
  try {
    const content = readFileSync(fp, 'utf8');
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (sinceDate) {
          const ts = Date.parse(obj.ts ?? '');
          const since = Date.parse(sinceDate);
          if (!Number.isNaN(ts) && !Number.isNaN(since) && ts < since) continue;
        }
        records.push(obj);
      } catch {
        /* skip */
      }
    }
  } catch {
    /* read 失敗 */
  }
  return records;
}

function avg(arr, key) {
  if (arr.length === 0) return 0;
  const sum = arr.reduce((s, r) => s + (typeof r[key] === 'number' ? r[key] : 0), 0);
  return Math.round((sum / arr.length) * 10) / 10;
}

function bootstrapCmd() {
  mkdirSync(METRICS_DIR, { recursive: true });
  const ts = new Date().toISOString();
  const marker = { ts, event: 'bootstrap', note: 'Sess108 案 8 計測開始' };
  for (const name of Object.values(FILES)) {
    const fp = join(METRICS_DIR, name);
    if (!existsSync(fp)) {
      writeFileSync(fp, '');
    }
    appendFileSync(fp, JSON.stringify(marker) + '\n');
  }
  console.log('✅ bootstrap 完了: ' + Object.values(FILES).length + ' 軸の jsonl を初期化');
}

function generateReport() {
  const data = {
    promptLength: readJsonl(FILES.promptLength).filter((r) => r.event !== 'bootstrap'),
    explainKeyword: readJsonl(FILES.explainKeyword).filter((r) => r.event !== 'bootstrap'),
    frustrated: readJsonl(FILES.frustrated).filter((r) => r.event !== 'bootstrap'),
    uiFixLength: readJsonl(FILES.uiFixLength).filter((r) => r.event !== 'bootstrap'),
    notionPaste: readJsonl(FILES.notionPaste).filter((r) => r.event !== 'bootstrap'),
    skillInvocation: readJsonl(FILES.skillInvocation).filter((r) => r.event !== 'bootstrap'),
  };

  // ① プロンプト平均長
  const promptAvg = avg(data.promptLength, 'length');
  // ② "誰にでもわかる" 出現率 = explain hit / 全 prompt
  const totalPrompts = data.promptLength.length || 1;
  const explainRate = data.explainKeyword.length / totalPrompts;
  // ③ Frustrated
  const frustratedCount = data.frustrated.length;
  // ④ UI 修正 prompt 長
  const uiFixAvg = avg(data.uiFixLength, 'length');
  // ⑤ Notion 手動コピペ依頼
  const notionPasteCount = data.notionPaste.length;
  // ⑥ Skill 起動 / セッション
  const sessions = new Set(data.skillInvocation.map((r) => r.session_id).filter(Boolean));
  const skillPerSession =
    sessions.size > 0 ? Math.round((data.skillInvocation.length / sessions.size) * 10) / 10 : 0;

  function ok(actual, target, mode) {
    if (mode === 'lte') return actual <= target;
    if (mode === 'lt') return actual < target;
    if (mode === 'eq') return actual === target;
    if (mode === 'gte') return actual >= target;
    return false;
  }

  const axes = [
    {
      id: '①',
      name: 'プロンプト平均長',
      actual: promptAvg,
      target: `< ${TARGETS.promptLengthAvg} 字`,
      pass: ok(promptAvg, TARGETS.promptLengthAvg, 'lt'),
    },
    {
      id: '②',
      name: '「誰にでもわかる」出現率',
      actual: `${(explainRate * 100).toFixed(1)}%`,
      target: `< ${TARGETS.explainKeywordRate * 100}%`,
      pass: ok(explainRate, TARGETS.explainKeywordRate, 'lt'),
    },
    {
      id: '③',
      name: 'Frustrated prompt 数',
      actual: frustratedCount,
      target: `= ${TARGETS.frustratedCount}`,
      pass: ok(frustratedCount, TARGETS.frustratedCount, 'eq'),
    },
    {
      id: '④',
      name: 'UI 修正 prompt 長',
      actual: uiFixAvg,
      target: `~ ${TARGETS.uiFixLengthAvg} 字`,
      pass: ok(uiFixAvg, TARGETS.uiFixLengthAvg * 1.5, 'lte'),
    },
    {
      id: '⑤',
      name: 'Notion 手動コピペ依頼',
      actual: notionPasteCount,
      target: `= ${TARGETS.notionPasteCount}`,
      pass: ok(notionPasteCount, TARGETS.notionPasteCount, 'eq'),
    },
    {
      id: '⑥',
      name: '1 セッション Skill 起動',
      actual: skillPerSession,
      target: `>= ${TARGETS.skillPerSession}`,
      pass: ok(skillPerSession, TARGETS.skillPerSession, 'gte'),
    },
  ];

  const passed = axes.filter((a) => a.pass).length;
  const achievement = Math.round((passed / axes.length) * 100);

  if (jsonMode) {
    process.stdout.write(
      JSON.stringify(
        {
          since: sinceDate,
          totalPrompts,
          axes,
          passed,
          totalAxes: axes.length,
          achievementPct: achievement,
          verdict: achievement >= 80 ? 'Stage A 目標達成' : '要調整',
        },
        null,
        2,
      ),
    );
    process.stdout.write('\n');
    return;
  }

  console.log('# Sess108 案 8 — 6 軸プロンプト計測 report');
  console.log('');
  if (sinceDate) console.log(`期間: ${sinceDate} 以降`);
  console.log(`計測 prompt 総数: ${totalPrompts}`);
  console.log('');
  console.log('| 軸 | 名称                        | 実測値           | 目標            | 判定 |');
  console.log('|----|----------------------------|------------------|------------------|------|');
  for (const a of axes) {
    const mark = a.pass ? '✅' : '⚠️';
    const name = String(a.name).padEnd(26, ' ');
    const actual = String(a.actual).padEnd(16, ' ');
    const target = String(a.target).padEnd(16, ' ');
    console.log(`| ${a.id} | ${name}| ${actual} | ${target} | ${mark}  |`);
  }
  console.log('');
  console.log(`達成度: ${achievement}% (${passed}/${axes.length})`);
  console.log(`判定: ${achievement >= 80 ? '✅ Stage A 目標達成' : '⚠️ 要調整'}`);
  console.log('');
  if (totalPrompts === 0) {
    console.log(
      'Note: まだ計測 prompt が 0 件です。 hook (log-prompt-metrics.mjs) が稼働後、 翌セッションから集計可能。',
    );
  }
}

try {
  if (bootstrap) {
    bootstrapCmd();
  } else {
    generateReport();
  }
  process.exit(0);
} catch (err) {
  console.error('[metrics] error:', err?.message ?? err);
  process.exit(0);
}
