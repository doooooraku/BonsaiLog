#!/usr/bin/env node
/**
 * next-r-number.mjs — 次に起票する R 番号 (= 再発防止ルール番号) を main HEAD + 未 merge PR base で 採番。
 *
 * Sess83-86 retro 由来 (= Issue #1024、 Sess83 PR #1019 で R 番号衝突 hotfix 30 分ロス):
 *   - worktree base = cedb7c1 で 「R-67 が最新 = R-68 が次」 と判断
 *   - main HEAD は 28e3a08 まで進化 (= Sess81/82 で R-68/69/70 既起票)
 *   - 結果 3 番号衝突 → R-71 rename hotfix
 *
 * Sess89 retro 由来 (= 2026-06-10、 本拡張):
 *   - 私の PR-C 着手時に next-r-number.mjs で R-72 取得
 *   - 同時並行で別 session が PR #1033 を作成して R-72 を起票
 *   - PR #1033 が先 main merge → 私の PR-C merge で R-72 重複 → R-73 hotfix
 *   - 真因: 旧 next-r-number.mjs は `origin/main` のみ参照、 **未 merge PR の specialized.md は見ていない**
 *   - 対策: 本拡張で 全 open PR の specialized.md も grep して R 番号衝突回避
 *
 * 動作:
 *   1. `git fetch origin main` (= remote 最新化)
 *   2. `git show origin/main:.claude/recurrence-prevention/specialized.md` で main の specialized.md 内容取得
 *   3. `^## R-(\d+)` regex で main の R 番号抽出
 *   4. **Sess89 拡張**: `gh pr list --state open` で 全 open PR 取得、 各 PR の branch の
 *      specialized.md (= 取得失敗時 skip) も grep して R 番号統合
 *   5. 全 R 番号の max + 1 を計算
 *   6. stdout = 数値のみ (= 「74」)、 stderr = 詳細 (= 「main = 73、 PR #N = 74、 次 = 75」)
 *   7. 異常時 exit 1
 *
 * 使い方:
 *   pnpm r:next              # 数値出力 (= 「74」)
 *   node scripts/dev/next-r-number.mjs
 *   pnpm r:next --verbose    # 詳細出力 (= main HEAD + 各 PR の R 番号 + 統合 max)
 *   pnpm r:next --no-prs     # 未 merge PR の grep をスキップ (= main のみ参照、 旧挙動)
 *
 * 関連:
 *   - Issue #1024 (= 本 script 起票元)
 *   - Sess83-86 retro: docs/reference/tasks/lessons/retro.md
 *   - Sess89 R-72 衝突 hotfix (= PR #1035) + 本拡張 (= 構造防御)
 *   - ADR-0046 「足す前ゲート」 (= 本 script の 構造的 適用)
 *   - R-61 (機械判定 + 安全網 meta-rule)
 */
import { execSync } from 'node:child_process';
import { argv, exit, stderr, stdout } from 'node:process';

const args = argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const help = args.includes('--help') || args.includes('-h');
const noPrs = args.includes('--no-prs');

if (help) {
  stdout.write(`next-r-number.mjs — 次に起票する R 番号 を main HEAD + 未 merge PR base で 採番

使い方:
  pnpm r:next              # 数値出力 (= 「74」 等)
  pnpm r:next --verbose    # 詳細 (= main HEAD + 各 PR の R 番号 list)
  pnpm r:next --no-prs     # 未 merge PR を skip (= 旧挙動、 main のみ参照)
  pnpm r:next --help       # 本 help

動作:
  1. git fetch origin main (= remote 最新化)
  2. main の specialized.md 内容取得
  3. ^## R-(N) で main の R 番号抽出
  4. (default) gh pr list で 全 open PR 取得、 各 PR branch の specialized.md も grep
  5. 全 R 番号の max + 1 を出力

related: Issue #1024、 Sess83-86 retro (lessons/retro.md)、 Sess89 R-72 衝突 hotfix (PR #1035)
`);
  exit(0);
}

function log(msg) {
  if (verbose) stderr.write(`[next-r-number] ${msg}\n`);
}

/**
 * specialized.md 内容から R 番号を抽出 (= ## R-NN または ### R-NN heading)。
 * regex を関数 local で生成することで lastIndex の状態を持ち越さない。
 * @param {string} content
 * @returns {number[]}
 */
function extractRNumbers(content) {
  const regex = /^#{2,3}\s+R-(\d+)/gm;
  const numbers = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    numbers.push(Number(match[1]));
  }
  return numbers;
}

try {
  log('git fetch origin main...');
  execSync('git fetch origin main', { stdio: verbose ? 'inherit' : 'pipe' });

  log('main HEAD 確認...');
  const mainSha = execSync('git rev-parse origin/main', { encoding: 'utf8' }).trim();
  log(`main HEAD = ${mainSha.slice(0, 8)}`);

  log('main の specialized.md 取得...');
  const mainContent = execSync(
    `git show origin/main:.claude/recurrence-prevention/specialized.md`,
    { encoding: 'utf8' },
  );
  const mainNumbers = extractRNumbers(mainContent);

  if (mainNumbers.length === 0) {
    stderr.write('[next-r-number] ERROR: R-NN heading が main specialized.md に見つかりません\n');
    exit(1);
  }

  const mainMax = Math.max(...mainNumbers);
  log(
    `main の R 番号 (${mainNumbers.length} 件): R-${[...new Set(mainNumbers)].sort((a, b) => a - b).join(' / R-')}`,
  );
  log(`main 最新 = R-${mainMax}`);

  // 全 R 番号を統合する collector
  const allNumbers = [...mainNumbers];
  let prCount = 0;
  let prMax = 0;

  // Sess89 拡張: 未 merge PR の specialized.md も grep して R 番号衝突回避
  if (!noPrs) {
    log('未 merge PR 取得 (gh pr list)...');
    let prRefs = [];
    try {
      const prListJson = execSync('gh pr list --state open --json number,headRefName --limit 50', {
        encoding: 'utf8',
      });
      prRefs = JSON.parse(prListJson);
      log(`open PR: ${prRefs.length} 件`);
    } catch (err) {
      log(
        `gh pr list 失敗 (= gh CLI 未インストール or 認証なし or オフライン)、 main のみで採番続行: ${err.message.split('\n')[0]}`,
      );
    }

    for (const pr of prRefs) {
      try {
        // PR branch を fetch (= remote-tracking 取得)
        execSync(`git fetch origin ${pr.headRefName}`, { stdio: 'pipe' });
        // PR branch の specialized.md 取得 (= 存在しない場合は exception)
        const prContent = execSync(
          `git show origin/${pr.headRefName}:.claude/recurrence-prevention/specialized.md`,
          { encoding: 'utf8' },
        );
        const prNumbers = extractRNumbers(prContent);

        if (prNumbers.length === 0) continue;

        const prLocalMax = Math.max(...prNumbers);
        // main を超える R 番号のみ報告 (= 新規起票候補)
        const newRNumbers = prNumbers.filter((n) => n > mainMax);
        if (newRNumbers.length > 0) {
          log(
            `  PR #${pr.number} (${pr.headRefName}): 新規 R-${[...new Set(newRNumbers)].sort((a, b) => a - b).join(' / R-')}`,
          );
          prCount += 1;
          prMax = Math.max(prMax, prLocalMax);
        }
        allNumbers.push(...prNumbers);
      } catch (e) {
        // specialized.md が無い PR や、 branch 削除済 等は skip (= ok)
        log(`  PR #${pr.number} skip: ${e.message.split('\n')[0]}`);
      }
    }
    if (prCount > 0) {
      log(`未 merge PR 起票候補 R 番号 合計: ${prCount} PR、 最大 R-${prMax}`);
    } else {
      log('未 merge PR で main を超える R 番号 起票なし');
    }
  } else {
    log('--no-prs 指定、 未 merge PR スキップ');
  }

  const max = Math.max(...allNumbers);
  const next = max + 1;

  log(`統合 最新 = R-${max}、 次起票 = R-${next}`);

  // stdout = 数値のみ (= script 連携で使いやすく)
  stdout.write(`${next}\n`);
  exit(0);
} catch (err) {
  stderr.write(`[next-r-number] ERROR: ${err.message}\n`);
  if (err.stdout) stderr.write(`stdout: ${err.stdout}\n`);
  if (err.stderr) stderr.write(`stderr: ${err.stderr}\n`);
  exit(1);
}
