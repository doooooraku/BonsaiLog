#!/usr/bin/env node
/**
 * R-21: 並列サブエージェントの worktree 隔離強制 (Issue retro 2026-05-03、本セッション L1 由来)。
 *
 * PreToolUse hook (Agent / Task tool 対象)
 * - stdin から JSON {tool_name, tool_input} を受け取る
 * - tool_input.subagent_type が 'general-purpose' or 'Explore' / 'Plan' 以外で、
 *   かつ run_in_background=true で複数並列稼働する可能性がある場合、
 *   isolation: 'worktree' が指定されているか確認する。
 *
 * 背景:
 * - 2026-05-02 セッションで 5 サブエージェントが同じ working directory を共有し、
 *   互いの中間ファイルを stash/restore/delete し合うカオスが発生 (F-09/F-10/F-15 で再発)。
 * - 主な被害:
 *   - F-15 エージェントが eventRepository.ts の F-05 関数を 45 行誤削除しかけた
 *   - 6 件中 4 件のエージェントが「並列カオスで完了不能」と報告
 *   - 主セッションで cleanup に膨大な context を消費
 *
 * 例外 (block しない):
 * - run_in_background=false (foreground、1 件ずつ実行) → 競合しないため通す
 * - subagent_type が 'Explore' / 'Plan' (read-only) → 通す
 * - subagent_type が 'commit-helper' / 'eas-build-doctor' 等の専用エージェント → 通す
 *   (これらは並列起動しない設計)
 *
 * 適用対象 (block 対象):
 * - run_in_background=true で general-purpose Agent を起動するとき、
 *   isolation: 'worktree' が指定されていない場合
 */
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const { tool_name, tool_input } = input;

if (tool_name !== 'Agent' && tool_name !== 'Task') {
  process.exit(0);
}

const subagentType = tool_input?.subagent_type ?? 'general-purpose';
const runInBackground = tool_input?.run_in_background === true;
const isolation = tool_input?.isolation;

// foreground 実行は競合しないため通す
if (!runInBackground) {
  process.exit(0);
}

// read-only / 専用エージェントは通す
const READ_ONLY_TYPES = new Set([
  'Explore',
  'Plan',
  'claude-code-guide',
  'commit-helper',
  'eas-build-doctor',
  'statusline-setup',
]);
if (READ_ONLY_TYPES.has(subagentType)) {
  process.exit(0);
}

// general-purpose で background 起動 → isolation 必須
if (isolation !== 'worktree') {
  process.stderr.write(
    `[R-21 violation] Background ${subagentType} agent without isolation:"worktree" is blocked.\n` +
      '\n' +
      '理由 (recurrence-prevention.md R-21、Issue retro 2026-05-03):\n' +
      '- 並列サブエージェントが同じ working directory を共有すると、\n' +
      '  互いの git stash/checkout/edit が衝突してカオスになる (2026-05-02 で実証)。\n' +
      '\n' +
      '修正方法:\n' +
      '- Agent ツールに isolation: "worktree" を追加してください。\n' +
      '- foreground (run_in_background=false) で 1 件ずつ実行に切り替えても OK。\n' +
      '\n' +
      'Hook: .claude/hooks/check-agent-isolation.mjs\n',
  );
  process.exit(2);
}

process.exit(0);
