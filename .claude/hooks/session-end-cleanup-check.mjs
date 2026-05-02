#!/usr/bin/env node
/**
 * Stop hook - セッション終了時に cleanup 状態を警告する (削除はしない、ユーザー判断)。
 *
 * Issue retro 2026-05-03 P6 (本セッション L6 由来)。
 *
 * 警告対象:
 * - git worktree が main 以外に存在する (`git worktree list` 2 行目以降)
 * - git stash が 5 件以上たまっている (並列カオスの検知 sentinel)
 * - feat/* / chore/* / fix/* のローカルブランチが 5 件以上残っている (掃除候補)
 *
 * 仕組み:
 * - exit 0 で常に通す (block しない、警告のみ)
 * - stderr に検知結果を出すと Claude Code が確認可能
 */
import { execSync } from 'node:child_process';

function safe(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

const warnings = [];

// 1. worktree
const worktrees = safe('git worktree list')
  .split('\n')
  .filter((l) => l.length > 0);
if (worktrees.length > 1) {
  warnings.push(
    `[cleanup-check] ${worktrees.length - 1} 個の追加 worktree あり:\n${worktrees
      .slice(1)
      .map((w) => `  ${w}`)
      .join('\n')}`,
  );
}

// 2. stash
const stashCount = safe('git stash list')
  .split('\n')
  .filter((l) => l.length > 0).length;
if (stashCount >= 5) {
  warnings.push(
    `[cleanup-check] git stash が ${stashCount} 件たまっています (並列カオス sentinel)。\n` +
      '  確認: git stash list  /  整理: git stash drop stash@{N}',
  );
}

// 3. local feat/chore/fix branches
const branches = safe('git for-each-ref --format=%(refname:short) refs/heads/')
  .split('\n')
  .filter((b) => /^(feat|chore|fix)\//.test(b));
if (branches.length >= 5) {
  warnings.push(
    `[cleanup-check] ローカルブランチ feat/* / chore/* / fix/* が ${branches.length} 件残っています:\n` +
      branches.map((b) => `  ${b}`).join('\n') +
      '\n  確認: git branch -vv  /  削除 (マージ済): git branch -d <branch>',
  );
}

if (warnings.length > 0) {
  process.stderr.write(warnings.join('\n\n') + '\n');
}

process.exit(0);
