#!/usr/bin/env node
/**
 * check-hooks.mjs — `.githooks/pre-commit` 配線 verify (Sess82 PR-F R-69)。
 *
 * Sess81 で PR #1008/#1009 で prettier format 違反 + 17 言語 fallback 漏れが
 * commit 時に検出されず CI fail 3 回した事故の構造再発防止。 既存資産
 * (`.lintstagedrc.js` + `.githooks/pre-commit`) は揃っているが、
 * `core.hooksPath` が `.git/hooks` のまま (= `prepare` script が走っていない or
 * worktree 環境で反映されていない) で hook が動いていなかった。
 *
 * 本 script は `core.hooksPath` を verify、 `.githooks` でなければ:
 *   - --quiet なし: 警告 + 自動設定
 *   - --check: 警告のみ、 自動設定しない (= CI 用)
 *
 * 使い方:
 *   node scripts/dev/check-hooks.mjs            # check + auto-fix
 *   node scripts/dev/check-hooks.mjs --check    # check only (= CI / verify 用、 exit 1 on mismatch)
 *   node scripts/dev/check-hooks.mjs --quiet    # OK 時に出力しない
 *
 * 由来: Sess81 振り返り 6 名チーム + R-61 (= 機械判定 + 安全網) 適用。
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const quiet = args.includes('--quiet');

function log(msg) {
  if (!quiet) console.log(msg);
}

function err(msg) {
  console.error(msg);
}

// `.githooks` ディレクトリの存在 verify
const githooksPath = resolve(projectRoot, '.githooks');
if (!existsSync(githooksPath)) {
  err('\x1b[33m⚠ .githooks ディレクトリが存在しません — skip\x1b[0m');
  process.exit(0);
}

// `core.hooksPath` 取得
let current;
try {
  current = execSync('git config core.hooksPath', { cwd: projectRoot, encoding: 'utf8' }).trim();
} catch {
  current = '';
}

const expected = '.githooks';

if (current === expected) {
  log(`\x1b[32m✓ core.hooksPath OK: ${current}\x1b[0m`);
  process.exit(0);
}

// mismatch
if (checkOnly) {
  err('');
  err('\x1b[31m✗ core.hooksPath mismatch (Sess82 R-69 適用):\x1b[0m');
  err(`   expected: ${expected}`);
  err(`   current:  ${current || '(unset)'}`);
  err('');
  err('  対処:');
  err('    pnpm install        # prepare script で git config core.hooksPath .githooks');
  err('    node scripts/dev/check-hooks.mjs   # 自動設定 (本 script を直接実行)');
  err('');
  process.exit(1);
}

// auto-fix
try {
  execSync(`git config core.hooksPath ${expected}`, { cwd: projectRoot });
  log(`\x1b[32m✓ core.hooksPath を ${expected} に自動設定しました\x1b[0m`);
  log(
    '  以後、 git commit 時に .githooks/pre-commit が走り、 prettier --write 等が自動実行されます。',
  );
  process.exit(0);
} catch (e) {
  err(`\x1b[31m✗ core.hooksPath 設定失敗: ${e.message}\x1b[0m`);
  process.exit(1);
}
