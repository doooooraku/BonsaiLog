#!/usr/bin/env node
/**
 * check-node-version.mjs — `.nvmrc` と現 Node version の一致 verify (Sess82 PR-E)。
 *
 * Sess81 で Claude (= 私) が ローカル開発で Node 20 を使ってしまい (= `.nvmrc=22`
 * 不一致)、 jest で SQLite native module が 113 tests 誤検知 fail した事故の
 * 構造再発防止。 `pnpm verify` 冒頭で本 script を実行し、 mismatch なら exit 1
 * + 「次にやること」 メッセージ表示。
 *
 * 使い方:
 *   node scripts/dev/check-node-version.mjs            # check
 *   node scripts/dev/check-node-version.mjs --quiet    # mismatch 時のみ出力
 *   node scripts/dev/check-node-version.mjs --skip-major-only  # major version のみ一致 OK
 *
 * 由来: Sess81 振り返り議論 6 名チーム + R-61 (= 機械判定 + 安全網) 適用。
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const skipMajorOnly = args.includes('--skip-major-only');

function log(msg) {
  if (!quiet) console.log(msg);
}

function err(msg) {
  console.error(msg);
}

// `.nvmrc` 読み込み
let expected;
try {
  expected = readFileSync(resolve(projectRoot, '.nvmrc'), 'utf8').trim();
} catch {
  err('\x1b[31m✗ .nvmrc が見つかりません\x1b[0m');
  process.exit(1);
}

// 現在の Node version (= `process.version` = "v22.22.2" 等)
const current = process.version.replace(/^v/, '');
const currentMajor = current.split('.')[0];
const expectedMajor = expected.replace(/^v/, '').split('.')[0];

const matched = skipMajorOnly ? currentMajor === expectedMajor : current === expected || currentMajor === expectedMajor;

if (matched) {
  log(`\x1b[32m✓ Node version OK: .nvmrc=${expected}, current=${current}\x1b[0m`);
  process.exit(0);
}

// mismatch
err('');
err('\x1b[31m✗ Node version mismatch (Sess82 R-61 適用):\x1b[0m');
err(`   .nvmrc expects: ${expected}`);
err(`   current node:   ${current}`);
err('');
err('  対処 (= 開発者の選択肢):');
err(`    1. nvm install ${expected} && nvm use ${expected}`);
err(`    2. corepack を使う場合: corepack pnpm install`);
err(`    3. PATH に v${expectedMajor} を prepend: PATH=$HOME/.nvm/versions/node/v${expectedMajor}.X.X/bin:$PATH`);
err('');
err('  詳細: docs/how-to/development/dev-workflow.md §Node version');
err('  Sess81 教訓: Node 20 で jest を走らせると SQLite native module で 113 tests 誤検知 fail。');
err('');
process.exit(1);
