#!/usr/bin/env node
/**
 * wait-pr-ci.mjs — PR の CI 完了を待つ再利用可能 script (Sess82 PR-H R-70)。
 *
 * Sess82 で Claude が Monitor + `gh pr checks --json` (= JSON 非対応) で
 * 空文字列を観測し続け、 既に CI green なのに永遠に待ち続ける silent failure
 * が発生した事故の構造再発防止。
 *
 * R-70 (= 同 PR で起票): 「長期 polling 設定前に同コマンドで期待値返却を verify」
 * meta-rule を本 script で具体化:
 * - 初回 polling サイクルで **必ず verbose log** を出力 (= silent failure 即検出)
 * - `gh pr view --json statusCheckRollup` を使用 (= JSON 完全対応、 `gh pr checks
 *   --json` は parse error を返す仕様)
 * - 全 check の status + conclusion を表示
 *
 * 使い方:
 *   node scripts/dev/wait-pr-ci.mjs 1014 1015 1016 1017     # 4 PR 待つ
 *   node scripts/dev/wait-pr-ci.mjs 1014 --interval 30      # polling 30 秒
 *   node scripts/dev/wait-pr-ci.mjs 1014 --timeout 600      # max 10 分
 *   node scripts/dev/wait-pr-ci.mjs 1014 --check verify     # verify check だけ判定
 *
 * Exit code:
 *   0  = 全 PR の指定 check が SUCCESS
 *   1  = いずれかの check が FAILURE / CANCELLED / TIMED_OUT
 *   2  = timeout (= 指定時間内に終わらず)
 *
 * 由来: Sess82 (2026-06-09) Monitor 故障事故、 Engram lesson 候補。
 */
import { execSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// 引数 parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const prs = [];
let intervalSec = 30;
let timeoutSec = 600;
let checkName = 'verify';

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--interval') {
    intervalSec = parseInt(args[++i], 10);
  } else if (a === '--timeout') {
    timeoutSec = parseInt(args[++i], 10);
  } else if (a === '--check') {
    checkName = args[++i];
  } else if (/^\d+$/.test(a)) {
    prs.push(a);
  } else {
    console.error(`✗ Unknown arg: ${a}`);
    console.error(
      '  使い方: node scripts/dev/wait-pr-ci.mjs <PR1> <PR2> ... [--interval N] [--timeout N] [--check NAME]',
    );
    process.exit(1);
  }
}

if (prs.length === 0) {
  console.error('✗ PR 番号を 1 つ以上指定してください');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// PR 状態取得 (= gh pr view --json statusCheckRollup、 JSON 完全対応)
// ---------------------------------------------------------------------------
function getCheckStatus(pr, name) {
  try {
    const json = execSync(`gh pr view ${pr} --json statusCheckRollup`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const data = JSON.parse(json);
    const check = data.statusCheckRollup?.find((c) => c.name === name);
    if (!check) {
      return { status: 'NOT_FOUND', conclusion: null };
    }
    return {
      status: check.status || 'UNKNOWN',
      conclusion: check.conclusion || null,
    };
  } catch (e) {
    return { status: 'ERROR', conclusion: null, error: e.message };
  }
}

function isDone(status) {
  return status === 'COMPLETED';
}

function isSuccess(conclusion) {
  return conclusion === 'SUCCESS';
}

// ---------------------------------------------------------------------------
// Main: R-70 適用 (= 初回 polling で必ず verbose log 出力 = silent failure 即検出)
// ---------------------------------------------------------------------------
console.log(`🌱 wait-pr-ci v1.0 (Sess82 R-70 適用)`);
console.log(`  PR: ${prs.join(', ')}`);
console.log(`  check: ${checkName}`);
console.log(`  interval: ${intervalSec}s, timeout: ${timeoutSec}s`);
console.log('');

const startTime = Date.now();
let cycle = 0;

while (true) {
  cycle++;
  const elapsedSec = Math.floor((Date.now() - startTime) / 1000);

  // 全 PR の状態取得
  const states = prs.map((pr) => ({ pr, ...getCheckStatus(pr, checkName) }));

  // R-70 適用: 初回サイクル + 状態変化時に必ず verbose log
  const allDone = states.every((s) => isDone(s.status));
  if (cycle === 1 || allDone) {
    console.log(`[cycle ${cycle}, elapsed ${elapsedSec}s] check="${checkName}":`);
    for (const s of states) {
      const icon = isDone(s.status) ? (isSuccess(s.conclusion) ? '✅' : '❌') : '⏳';
      const detail = isDone(s.status) ? s.conclusion : s.status;
      console.log(`  ${icon} PR #${s.pr}: ${detail}${s.error ? ` (${s.error})` : ''}`);
    }
    console.log('');
  }

  if (allDone) {
    // 全部完了、 結果判定
    const failures = states.filter((s) => !isSuccess(s.conclusion));
    if (failures.length > 0) {
      console.error(`❌ ${failures.length} PR が SUCCESS でない:`);
      for (const f of failures) {
        console.error(`   PR #${f.pr}: ${f.conclusion}`);
      }
      process.exit(1);
    }
    console.log(`✅ 全 ${prs.length} PR が SUCCESS (cycle=${cycle}, elapsed=${elapsedSec}s)`);
    process.exit(0);
  }

  // timeout check
  if (elapsedSec >= timeoutSec) {
    console.error(`⚠ timeout (${timeoutSec}s) — まだ完了していない PR:`);
    for (const s of states) {
      if (!isDone(s.status)) {
        console.error(`   PR #${s.pr}: ${s.status}`);
      }
    }
    process.exit(2);
  }

  // 次の cycle まで wait
  await new Promise((resolve) => setTimeout(resolve, intervalSec * 1000));
}
