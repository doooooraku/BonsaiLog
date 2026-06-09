#!/usr/bin/env node
/**
 * next-r-number.mjs — 次に起票する R 番号 (= 再発防止ルール番号) を main HEAD base で 採番。
 *
 * Sess83-86 retro 由来 (= Issue #1024、 Sess83 PR #1019 で R 番号衝突 hotfix 30 分ロス):
 *   - worktree base = cedb7c1 で 「R-67 が最新 = R-68 が次」 と判断
 *   - main HEAD は 28e3a08 まで進化 (= Sess81/82 で R-68/69/70 既起票)
 *   - 結果 3 番号衝突 → R-71 rename hotfix
 *
 * 動作:
 *   1. `git fetch origin main` (= remote 最新化)
 *   2. `git show origin/main:.claude/recurrence-prevention/specialized.md` で main の specialized.md 内容取得
 *   3. `^## R-(\d+)` regex で 全 R 番号抽出 + max + 1 を計算
 *   4. stdout = 数値のみ (= 「72」)、 stderr = 詳細 (= 「main HEAD = xxx、 最新 = R-71、 次 = R-72」)
 *   5. 異常時 exit 1
 *
 * 使い方:
 *   pnpm r:next              # 数値出力 (= 「72」)
 *   node scripts/dev/next-r-number.mjs
 *   pnpm r:next --verbose    # 詳細出力 (= main HEAD + 既存 R 番号 list)
 *
 * 関連:
 *   - Issue #1024 (= 本 script 起票元)
 *   - Sess83-86 retro: docs/reference/tasks/lessons/retro.md
 *   - ADR-0046 「足す前ゲート」 (= 本 script の 構造的 適用)
 *   - R-61 (機械判定 + 安全網 meta-rule)
 */
import { execSync } from 'node:child_process';
import { argv, exit, stderr, stdout } from 'node:process';

const args = argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const help = args.includes('--help') || args.includes('-h');

if (help) {
  stdout.write(`next-r-number.mjs — 次に起票する R 番号 を main HEAD base で 採番

使い方:
  pnpm r:next              # 数値出力 (= 「72」 等)
  pnpm r:next --verbose    # 詳細 (= main HEAD + 既存 R 番号 list)
  pnpm r:next --help       # 本 help

動作:
  1. git fetch origin main (= remote 最新化)
  2. main の specialized.md 内容取得
  3. ^## R-(N) で 全 R 番号抽出 + max + 1 を出力

related: Issue #1024、 Sess83-86 retro (lessons/retro.md)
`);
  exit(0);
}

function log(msg) {
  if (verbose) stderr.write(`[next-r-number] ${msg}\n`);
}

try {
  log('git fetch origin main...');
  execSync('git fetch origin main', { stdio: verbose ? 'inherit' : 'pipe' });

  log('main HEAD 確認...');
  const mainSha = execSync('git rev-parse origin/main', { encoding: 'utf8' }).trim();
  log(`main HEAD = ${mainSha.slice(0, 8)}`);

  log('main の specialized.md 取得...');
  const content = execSync(`git show origin/main:.claude/recurrence-prevention/specialized.md`, {
    encoding: 'utf8',
  });

  // ^## R-NN. or ^## R-NN (= h2 heading) + ^### R-NN. (= h3 heading) 両方拾う
  const regex = /^#{2,3}\s+R-(\d+)/gm;
  const numbers = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    numbers.push(Number(match[1]));
  }

  if (numbers.length === 0) {
    stderr.write('[next-r-number] ERROR: R-NN heading が main specialized.md に見つかりません\n');
    exit(1);
  }

  const max = Math.max(...numbers);
  const next = max + 1;

  log(
    `既存 R 番号 (${numbers.length} 件): R-${[...new Set(numbers)].sort((a, b) => a - b).join(' / R-')}`,
  );
  log(`最新 = R-${max}、 次起票 = R-${next}`);

  // stdout = 数値のみ (= script 連携で使いやすく)
  stdout.write(`${next}\n`);
  exit(0);
} catch (err) {
  stderr.write(`[next-r-number] ERROR: ${err.message}\n`);
  if (err.stdout) stderr.write(`stdout: ${err.stdout}\n`);
  if (err.stderr) stderr.write(`stderr: ${err.stderr}\n`);
  exit(1);
}
