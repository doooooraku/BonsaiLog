#!/usr/bin/env node
// scripts/ui-diff/auto-revert.mjs
// 自動改善ループでの RMSE 悪化検知 (Phase 0.1)。
//
// 仕様:
// - 指定 flow の直近 2 回の試走 RMSE を比較
// - latest > prev * 1.1 (10% 以上悪化) なら REGRESSION 検出
// - 検出時は exit code 1 + 推奨アクション (revert / skip 追加) を stdout
// - exit code 0 なら問題なし
//
// 自動 revert 自体は呼び出し側 (Claude) が exit code に応じて git revert HEAD を実行。
// 本 script は判定のみで、git 操作は行わない (副作用最小化)。

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const OUT_ROOT = path.join(ROOT, 'scripts/ui-diff/out');

/** flow の最新 N 件の RMSE 履歴を timestamp 降順で返す。 */
async function collectRmseHistory(flowId, n = 3) {
  const timestamps = (await fs.readdir(OUT_ROOT).catch(() => []))
    .filter((t) => /^\d{8}-\d{4}$/.test(t))
    .sort()
    .reverse();

  const history = [];
  for (const ts of timestamps) {
    const reportPath = path.join(OUT_ROOT, ts, 'report.md');
    const content = await fs.readFile(reportPath, 'utf-8').catch(() => null);
    if (!content) continue;
    const flowMatch = content.match(/# UI Diff Report — (\S+)/);
    if (!flowMatch || flowMatch[1] !== flowId) continue;
    const rmseMatch = content.match(/RMSE \(raw\)\*\*: `(\d+(?:\.\d+)?)/);
    if (!rmseMatch) continue;
    history.push({ rmse: parseFloat(rmseMatch[1]), timestamp: ts });
    if (history.length >= n) break;
  }
  return history;
}

const REGRESSION_THRESHOLD = 1.1; // 10% 以上の悪化で検出

async function main() {
  const flowId = process.argv[2];
  if (!flowId) {
    console.error('Usage: node auto-revert.mjs <flowId>');
    process.exit(2);
  }

  const history = await collectRmseHistory(flowId, 2);
  if (history.length < 2) {
    console.log(`[auto-revert] ${flowId}: insufficient history (${history.length}/2), skip check`);
    process.exit(0);
  }

  const [latest, prev] = history;
  const ratio = latest.rmse / prev.rmse;

  if (ratio > REGRESSION_THRESHOLD) {
    console.log(`[auto-revert] ${flowId}: REGRESSION DETECTED`);
    console.log(`  prev:   ${prev.rmse.toFixed(0)} (${prev.timestamp})`);
    console.log(
      `  latest: ${latest.rmse.toFixed(0)} (${latest.timestamp})  ← +${((ratio - 1) * 100).toFixed(1)}%`,
    );
    console.log(``);
    console.log(`  推奨アクション:`);
    console.log(`    1. git revert HEAD で前 commit を取り消す`);
    console.log(`    2. skip-list.json に同 flow + 同箇所を追加`);
    console.log(`    3. 次サイクルで別の修正候補を試す`);
    process.exit(1);
  }

  console.log(`[auto-revert] ${flowId}: OK`);
  console.log(`  prev:   ${prev.rmse.toFixed(0)}`);
  console.log(`  latest: ${latest.rmse.toFixed(0)}  (${ratio < 1 ? '改善' : '悪化なし'})`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[auto-revert]', err);
  process.exit(2);
});
