// scripts/ui-diff/summary.ts
// 自動改善ループの進捗 SUMMARY 自動生成 (Phase 0.1)。
//
// 役割:
// - scripts/ui-diff/out/<timestamp>/report.md を時系列 scan
// - 各 flow の最新 RMSE を抽出
// - skip-list.json と統合
// - SUMMARY-loop.md を markdown 表で自動生成
//
// 使い方:
//   pnpm exec tsx scripts/ui-diff/summary.ts
//   → scripts/ui-diff/out/SUMMARY-loop.md が更新される

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SCREEN_PAIRS } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const OUT_ROOT = path.join(ROOT, 'scripts/ui-diff/out');
const SKIP_LIST_PATH = path.join(__dirname, 'skip-list.json');
const SUMMARY_PATH = path.join(OUT_ROOT, 'SUMMARY-loop.md');

// Retro-A: schema 定義 (Retro PR で validation 実装)
// Retro-E: status フィールド (provisional = 初回試走で skip、confirmed = 3 回試走後)
type SkipStatus = 'provisional' | 'confirmed';

type SkipEntry = {
  flow: string;
  reason: string;
  added_at: string;
  fail_count: number;
  permanent: boolean;
  status?: SkipStatus; // Retro-E: 省略時は confirmed 扱い (後方互換)
  // 任意の追加情報 (artifact / needsHumanReview 等は許容)
  artifact?: string | null;
  needsHumanReview?: boolean;
};

type AchievedEntry = {
  flow: string;
  level: number;
  rmse: number;
  achieved_at: string;
  // 任意フィールド
  rmseNormalized?: number;
  artifact?: string;
  rationale?: string;
  judgedBy?: string;
};

type SkipList = {
  version: number;
  skipped: SkipEntry[];
  achieved: AchievedEntry[];
};

/** Retro-A: SkipList schema validation。
 *  必須フィールドの欠落 / 型違いを検出してエラーで停止 (camelCase/snake_case mismatch 早期検出)。 */
function validateSkipList(data: unknown): SkipList {
  if (typeof data !== 'object' || data === null) {
    throw new Error('[skip-list] root must be an object');
  }
  const d = data as Record<string, unknown>;
  if (typeof d.version !== 'number') throw new Error('[skip-list] version must be number');
  if (!Array.isArray(d.skipped)) throw new Error('[skip-list] skipped must be array');
  if (!Array.isArray(d.achieved)) throw new Error('[skip-list] achieved must be array');

  const skippedRequired = ['flow', 'reason', 'added_at', 'fail_count', 'permanent'] as const;
  for (const [i, raw] of d.skipped.entries()) {
    if (typeof raw !== 'object' || raw === null) {
      throw new Error(`[skip-list] skipped[${i}] must be object`);
    }
    const s = raw as Record<string, unknown>;
    for (const k of skippedRequired) {
      if (!(k in s))
        throw new Error(
          `[skip-list] skipped[${i}] (flow="${typeof s.flow === 'string' ? s.flow : '?'}") missing required field "${k}"`,
        );
    }
    if (typeof s.flow !== 'string')
      throw new Error(`[skip-list] skipped[${i}].flow must be string`);
    if (typeof s.fail_count !== 'number')
      throw new Error(`[skip-list] skipped[${i}].fail_count must be number`);
    if (typeof s.permanent !== 'boolean')
      throw new Error(`[skip-list] skipped[${i}].permanent must be boolean`);
    if (s.status != null && s.status !== 'provisional' && s.status !== 'confirmed') {
      throw new Error(
        `[skip-list] skipped[${i}].status must be 'provisional' | 'confirmed' if present`,
      );
    }
  }

  const achievedRequired = ['flow', 'level', 'rmse', 'achieved_at'] as const;
  for (const [i, raw] of d.achieved.entries()) {
    if (typeof raw !== 'object' || raw === null) {
      throw new Error(`[skip-list] achieved[${i}] must be object`);
    }
    const a = raw as Record<string, unknown>;
    for (const k of achievedRequired) {
      if (!(k in a))
        throw new Error(
          `[skip-list] achieved[${i}] (flow="${typeof a.flow === 'string' ? a.flow : '?'}") missing required field "${k}"`,
        );
    }
    if (typeof a.flow !== 'string')
      throw new Error(`[skip-list] achieved[${i}].flow must be string`);
    if (typeof a.level !== 'number')
      throw new Error(`[skip-list] achieved[${i}].level must be number`);
    if (typeof a.rmse !== 'number')
      throw new Error(`[skip-list] achieved[${i}].rmse must be number`);
  }

  return d as unknown as SkipList;
}

async function loadSkipList(): Promise<SkipList> {
  const raw = await fs
    .readFile(SKIP_LIST_PATH, 'utf-8')
    .catch(() => '{"version":1,"skipped":[],"achieved":[]}');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `[skip-list] JSON parse error: ${(err as Error).message}\n` +
        `  → ${path.relative(ROOT, SKIP_LIST_PATH)} の構文を確認してください`,
    );
  }
  return validateSkipList(parsed);
}

async function collectLatestReports(): Promise<Map<string, { rmse: number; timestamp: string }>> {
  const timestamps = (await fs.readdir(OUT_ROOT).catch(() => []))
    .filter((t) => /^\d{8}-\d{4}$/.test(t))
    .sort()
    .reverse();

  const latestByFlow = new Map<string, { rmse: number; timestamp: string }>();
  for (const ts of timestamps) {
    const reportPath = path.join(OUT_ROOT, ts, 'report.md');
    const content = await fs.readFile(reportPath, 'utf-8').catch(() => null);
    if (!content) continue;
    const flowMatch = content.match(/# UI Diff Report — (\S+)/);
    if (!flowMatch) continue;
    const flowId = flowMatch[1];
    if (latestByFlow.has(flowId)) continue; // 既に最新を保持済
    const rmseMatch = content.match(/RMSE \(raw\)\*\*: `(\d+(?:\.\d+)?)/);
    if (!rmseMatch) continue;
    latestByFlow.set(flowId, { rmse: parseFloat(rmseMatch[1]), timestamp: ts });
  }
  return latestByFlow;
}

async function main(): Promise<void> {
  const skipList = await loadSkipList();
  const latestByFlow = await collectLatestReports();

  const totalFlows = Object.keys(SCREEN_PAIRS).length;
  const achievedFlows = skipList.achieved.length;
  const skippedFlows = skipList.skipped.filter((s) => s.permanent).length;
  const remainingFlows = totalFlows - achievedFlows - skippedFlows;
  const progressPct = totalFlows > 0 ? Math.round((achievedFlows / totalFlows) * 100) : 0;

  const lines: string[] = [];
  lines.push('# Auto Improve Loop SUMMARY');
  lines.push('');
  lines.push(`> Last updated: ${new Date().toISOString()}`);
  lines.push('');

  lines.push('## 進捗');
  lines.push('');
  lines.push(`- 全 flow: **${totalFlows}**`);
  lines.push(`- 達成 (整合度レベル 2 以上): **${achievedFlows}**`);
  lines.push(`- 永久 skip: **${skippedFlows}**`);
  lines.push(`- 残: **${remainingFlows}**`);
  lines.push(`- 進捗率: **${progressPct}%**`);
  lines.push('');

  lines.push('## flow 最新結果');
  lines.push('');
  lines.push('| flow | 最新 RMSE | 最新時刻 | 状態 |');
  lines.push('|---|---|---|---|');
  const skippedFlowIds = new Set(skipList.skipped.filter((s) => s.permanent).map((s) => s.flow));
  const achievedFlowIds = new Set(skipList.achieved.map((a) => a.flow));
  for (const flowId of Object.keys(SCREEN_PAIRS)) {
    const latest = latestByFlow.get(flowId);
    let state: string;
    if (achievedFlowIds.has(flowId)) state = '✅ 達成';
    else if (skippedFlowIds.has(flowId)) state = '⏭️ skip';
    else if (latest != null) state = '🔄 試走済';
    else state = '⬜ 未試走';
    const rmseStr = latest != null ? latest.rmse.toFixed(0) : '-';
    const tsStr = latest?.timestamp ?? '-';
    lines.push(`| \`${flowId}\` | ${rmseStr} | ${tsStr} | ${state} |`);
  }
  lines.push('');

  if (skipList.skipped.length > 0) {
    // Retro-E: status (provisional / confirmed) を表示
    lines.push('## skip リスト');
    lines.push('');
    lines.push('| flow | 理由 | 失敗回数 | skip 日 | status | permanent |');
    lines.push('|---|---|---|---|---|---|');
    for (const s of skipList.skipped) {
      const status = s.status ?? (s.permanent ? 'confirmed' : 'provisional');
      lines.push(
        `| \`${s.flow}\` | ${s.reason} | ${s.fail_count} | ${s.added_at} | ${status} | ${s.permanent ? 'YES' : 'no'} |`,
      );
    }
    lines.push('');
    const provisionalCount = skipList.skipped.filter(
      (s) => (s.status ?? (s.permanent ? 'confirmed' : 'provisional')) === 'provisional',
    ).length;
    if (provisionalCount > 0) {
      lines.push(
        `> ℹ️ provisional (仮置き) **${provisionalCount} 件** あり。再評価で達成可能性あり。`,
      );
      lines.push('');
    }
  }

  if (skipList.achieved.length > 0) {
    lines.push('## 達成済 (整合度レベル 2 以上)');
    lines.push('');
    lines.push('| flow | レベル | RMSE | 達成日 |');
    lines.push('|---|---|---|---|');
    for (const a of skipList.achieved) {
      lines.push(`| \`${a.flow}\` | ${a.level} | ${a.rmse} | ${a.achieved_at} |`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## 関連');
  lines.push('');
  lines.push('- 運用 doc: `docs/how-to/ui-diff/auto-improve-loop.md`');
  lines.push('- 整合度判定基準: `docs/reference/integration-criteria.md`');
  lines.push('- 永久 skip リスト: `scripts/ui-diff/skip-list.json`');
  lines.push('- 停止: `touch /tmp/claude-stop.flag` → 次サイクル前に停止');
  lines.push('');

  await fs.mkdir(OUT_ROOT, { recursive: true });
  await fs.writeFile(SUMMARY_PATH, lines.join('\n'), 'utf-8');

  console.log(`[summary] saved: ${path.relative(ROOT, SUMMARY_PATH)}`);
  console.log(
    `  total: ${totalFlows}, achieved: ${achievedFlows}, skipped: ${skippedFlows}, remaining: ${remainingFlows} (${progressPct}%)`,
  );
}

main().catch((err) => {
  console.error('[summary]', err);
  process.exit(1);
});
