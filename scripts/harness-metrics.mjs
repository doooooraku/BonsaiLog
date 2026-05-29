#!/usr/bin/env node
/**
 * harness-metrics — ハーネス(AI の安全装置)の「効きめ」を既存ログから読み取り専用で集計する。
 *
 * 施策② (ADR-0046 退役判断の材料 / 一次情報: Martin Fowler "Harness engineering" の sensors = feedback)。
 * 追加 instrumentation も外部課金も不要。git / gh を読むだけ。取得失敗は "N/A"、常に exit 0 (副作用なし)。
 *
 * 出す数字 (いずれも事故率/品質/速度の信頼できる代理指標):
 *   1. merged PR スループット (直近30日 / 全期間)
 *   2. CI 成功率 (直近20)
 *   3. revert 比率 (事故率の代理)
 *
 * 注: hook ブロック「回数」の正確計測はセッションログ grep では会話中の hook 言及に汚染され
 *     近似にならない (試作で 365 ≒ ほぼノイズ を確認) ため除外。正確化には各 hook に専用ログ
 *     1 行追記が必要なので follow-on とする (ADR-0046「2 回再発で昇華」方針)。
 */
import { execSync } from 'node:child_process';

const NA = 'N/A';

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 30000 });
}
function safe(fn) {
  try {
    const v = fn();
    return v === undefined || v === null || v === '' ? NA : v;
  } catch {
    return NA;
  }
}

// 1. merged PR スループット (直近 30 日 / 全期間)
function prThroughput() {
  const arr = JSON.parse(sh('gh pr list --state merged --limit 1000 --json mergedAt'));
  const since = Date.now() - 30 * 24 * 3600 * 1000;
  const last30 = arr.filter((p) => p.mergedAt && new Date(p.mergedAt).getTime() >= since).length;
  return `${last30} / ${arr.length}`;
}

// 2. CI 成功率 (直近 20、完了済みのみ)
function ciSuccess() {
  const arr = JSON.parse(sh('gh run list --limit 20 --json conclusion')).filter(
    (r) => r.conclusion,
  );
  if (arr.length === 0) return NA;
  const ok = arr.filter((r) => r.conclusion === 'success').length;
  return `${Math.round((ok / arr.length) * 100)}% (${ok}/${arr.length})`;
}

// 3. revert 比率 (事故率の代理) — git 標準の revert コミットのみ (「完全削除」等の機能語は誤マッチするため除外)
function revertRatio() {
  const total = parseInt(sh('git rev-list --count HEAD').trim(), 10);
  const out = sh('git log --oneline -i --grep=revert').trim();
  const r = out ? out.split('\n').filter(Boolean).length : 0;
  return `${total ? ((r / total) * 100).toFixed(1) : NA}% (${r}/${total})`;
}

const rows = [
  ['merged PR (直近30日 / 全期間)', safe(prThroughput)],
  ['CI 成功率 (直近20)', safe(ciSuccess)],
  ['revert 比率 (事故率の代理, 全期間)', safe(revertRatio)],
  ['hook ブロック回数', '— (要・各 hook 専用ログ, follow-on)'],
];

console.log('\n=== ハーネス効きめレポート (pnpm harness:metrics) ===');
console.log('読み取り専用・既存ログ集計 / 施策② (ADR-0046 退役判断の材料)\n');
console.log('| 指標 | 値 |');
console.log('| --- | --- |');
for (const [k, v] of rows) console.log(`| ${k} | ${v} |`);
console.log(
  '\nN/A = 取得失敗 (gh 未認証 / network 等)。hook ブロックの正確計測は follow-on (各 hook に 1 行ログ追記)。',
);
console.log('本スクリプトは副作用なし (read-only)。\n');
