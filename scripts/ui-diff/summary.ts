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

type SkipEntry = {
  flow: string;
  reason: string;
  added_at: string;
  fail_count: number;
  permanent: boolean;
};

type AchievedEntry = {
  flow: string;
  level: number;
  rmse: number;
  achieved_at: string;
};

type SkipList = {
  version: number;
  skipped: SkipEntry[];
  achieved: AchievedEntry[];
};

async function loadSkipList(): Promise<SkipList> {
  const raw = await fs
    .readFile(SKIP_LIST_PATH, 'utf-8')
    .catch(() => '{"version":1,"skipped":[],"achieved":[]}');
  return JSON.parse(raw) as SkipList;
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
    lines.push('## 永久 skip リスト');
    lines.push('');
    lines.push('| flow | 理由 | 失敗回数 | skip 日 | permanent |');
    lines.push('|---|---|---|---|---|');
    for (const s of skipList.skipped) {
      lines.push(
        `| \`${s.flow}\` | ${s.reason} | ${s.fail_count} | ${s.added_at} | ${s.permanent ? 'YES' : 'no'} |`,
      );
    }
    lines.push('');
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
