#!/usr/bin/env node
/**
 * doc-freshness-check.mjs — doc の「正確性」鮮度検査 (Doc-Truth Audit P4)
 *
 * doc-routing.md の各行について以下を比較し、「コードの方が新しいのに長期間
 * 再検証されていない doc」を表で出力する:
 *   a. doc の最終 commit 時刻 (git log -1 --format=%ct -- <doc>)
 *   b. 対応コード領域の最終 commit 時刻 (glob 接頭 dir / file の git log)
 *   c. freshness-ledger.md の最終検証日 (中央台帳、per-doc frontmatter なし = user 決定)
 *
 * flag 条件: 「コード最終 commit > doc 最終 commit」 かつ 「台帳の最終検証日が N 日超 (default 90)」
 *
 * 既存の `pnpm metrics:doc-30day-zero` (利用頻度 = 読まれているか) と対になる
 * 「正確性 (実態とズレていないか)」版。frontmatter 不要・git 履歴だけで動く。
 *
 * 起動:
 *   pnpm metrics:doc-freshness              # default N=90 日
 *   pnpm metrics:doc-freshness --days=0     # 検証日条件を無効化 (コード先行 doc を全列挙)
 *
 * 出力は報告用 (exit 0)。30 日周期の棚卸 (freshness-ledger.md ヘッダ参照) で
 * /retro Step・/memory-review から実行する。
 */
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

import { parseDocRouting, globPrefix } from './lib/parse-doc-routing.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER = 'docs/audit/freshness-ledger.md';
const daysArg = process.argv.find((a) => a.startsWith('--days='));
const MAX_AGE_DAYS = daysArg ? Number(daysArg.split('=')[1]) : 90;

// ---- 1. routing 表 + 台帳の読み込み ----
const { rows, errors } = parseDocRouting(ROOT);
if (errors.length > 0) {
  console.error(`✗ doc-freshness-check: 原本 parse エラー ${errors.length} 件`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

// 台帳: | No | `path` … | 区分 | 判定 | YYYY-MM-DD | → path → 最終検証日
const ledgerDates = new Map();
for (const line of readFileSync(join(ROOT, LEDGER), 'utf8').split('\n')) {
  const m = line.match(/^\| \d+ +\| `([^`]+)`.*\| (\d{4}-\d{2}-\d{2}) +\|$/);
  if (m) ledgerDates.set(m[1], m[2]);
}

// ---- 2. git 時刻の取得 ----
function gitEpoch(pathspec) {
  try {
    const out = execSync(`git log -1 --format=%ct -- "${pathspec}"`, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out ? Number(out) : null;
  } catch {
    return null;
  }
}
const fmt = (epoch) => (epoch ? new Date(epoch * 1000).toISOString().slice(0, 10) : '(履歴なし)');

// ---- 3. 比較 ----
const nowEpoch = Math.floor(Date.now() / 1000);
const flagged = [];
let docCount = 0;
let skippedNoHistory = 0;

for (const row of rows) {
  const codeTimes = row.globs.map((g) => gitEpoch(globPrefix(g))).filter((t) => t !== null);
  const codeLatest = codeTimes.length > 0 ? Math.max(...codeTimes) : null;
  if (codeLatest === null) {
    skippedNoHistory++; // 例: android/** = gitignored 生成物のみの領域
    continue;
  }
  for (const doc of row.docs) {
    docCount++;
    const docTime = gitEpoch(doc);
    const verified = ledgerDates.get(doc) ?? null;
    const verifiedEpoch = verified ? Math.floor(Date.parse(`${verified}T00:00:00Z`) / 1000) : 0;
    const ageDays = Math.floor((nowEpoch - verifiedEpoch) / 86400);
    const codeNewer = docTime === null || codeLatest > docTime;
    if (codeNewer && ageDays > MAX_AGE_DAYS) {
      flagged.push({
        id: row.id,
        doc,
        docDate: fmt(docTime),
        codeDate: fmt(codeLatest),
        verified: verified ?? '(台帳に行なし)',
        ageDays: verified ? ageDays : '-',
      });
    }
  }
}

// ---- 4. 出力 (検算行付き) ----
console.log(`# doc 鮮度検査 (コード先行 + 台帳検証 ${MAX_AGE_DAYS} 日超)\n`);
if (flagged.length === 0) {
  console.log('再検証が必要な doc: 0 件 ✅');
} else {
  console.log('| routing ID | doc | doc 最終 commit | コード最終 commit | 台帳検証日 | 経過日 |');
  console.log('| --- | --- | --- | --- | --- | --- |');
  for (const f of flagged)
    console.log(
      `| ${f.id} | ${f.doc} | ${f.docDate} | ${f.codeDate} | ${f.verified} | ${f.ageDays} |`,
    );
  console.log(
    '\n→ 各 doc を実態と突き合わせ、freshness-ledger.md の判定・最終検証日を更新すること',
  );
}
console.log(
  `\n検算: 表 ${rows.length} 行 / doc 検査 ${docCount} 件 / flagged ${flagged.length} 件 / git 履歴なし領域 skip ${skippedNoHistory} / 台帳突合 ${ledgerDates.size} 行読込`,
);
