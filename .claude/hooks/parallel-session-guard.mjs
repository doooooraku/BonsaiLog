#!/usr/bin/env node
/**
 * parallel-session-guard.mjs — 並行セッション検知 + main checkout の branch 操作 block (R-81)
 *
 * 由来: Sess99 (2026-06-11) で並行セッションが main checkout の branch を切替え、
 * 作業中の編集がディスク上で巻き戻る事故が実発生 (reflog 実証)。
 * 「並行時は worktree (R-64)」が運用頼みだったため機械強制化。
 *
 * 役割 (1 script で 2 event を処理):
 *   - UserPromptSubmit / PreToolUse(Bash): heartbeat lock (.claude/locks/sess-<session_id>) を更新
 *   - 他セッションの active lock (45 分以内 mtime) を検知した時:
 *     - UserPromptSubmit → 警告を additionalContext として stdout 注入 (exit 0)
 *     - PreToolUse(Bash) → branch 切替系 git コマンド (checkout / switch / reset --hard) を exit 2 で block
 *       ただし worktree scoped (`git -C …` / `git worktree …` / コマンドに worktrees を含む) は許可
 *
 * 安全設計: 例外は全て catch して exit 0 (Claude の動作を絶対に壊さない)。意図的 block のみ exit 2。
 * bypass: 環境変数 CLAUDE_PARALLEL_GUARD=off / .claude/locks/ の他 lock 削除。
 * lock は gitignored・24h 超は自動掃除。
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';

const ACTIVE_WINDOW_MS = 45 * 60 * 1000;
const STALE_MS = 24 * 60 * 60 * 1000;

try {
  if (process.env.CLAUDE_PARALLEL_GUARD === 'off') process.exit(0);
  const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  const sid = String(input.session_id ?? 'unknown');
  const lockDir = join(root, '.claude', 'locks');
  mkdirSync(lockDir, { recursive: true });

  // heartbeat 更新 + stale lock 掃除 + 他セッション active 判定
  writeFileSync(join(lockDir, `sess-${sid}`), new Date().toISOString());
  const now = Date.now();
  const others = [];
  for (const f of readdirSync(lockDir)) {
    if (!f.startsWith('sess-')) continue;
    const p = join(lockDir, f);
    const age = now - statSync(p).mtimeMs;
    if (age > STALE_MS) {
      rmSync(p, { force: true });
      continue;
    }
    if (f !== `sess-${sid}` && age < ACTIVE_WINDOW_MS) others.push(f);
  }
  if (others.length === 0) process.exit(0);

  const event = input.hook_event_name;
  if (event === 'UserPromptSubmit') {
    console.log(
      `【R-81 並行セッション検知 (他 ${others.length} 件 active)】実装・branch 操作は worktree 分離必須: git worktree add .claude/worktrees/<name> <base> → bash scripts/dev/worktree-init.sh (R-64)。main checkout での git checkout / switch / reset --hard は hook が block する。worktree 内操作は 'git -C <worktree絶対path> …' で対象を明示すること。`,
    );
    process.exit(0);
  }
  if (event === 'PreToolUse' && input.tool_name === 'Bash') {
    const cmd = String(input.tool_input?.command ?? '');
    const dangerous = /\bgit\s+(checkout|switch)\b|\bgit\s+reset\s+--hard\b/.test(cmd);
    const scoped = /worktrees/.test(cmd) || /\bgit\s+-C\s/.test(cmd) || /\bgit\s+worktree\b/.test(cmd);
    if (dangerous && !scoped) {
      console.error(
        `R-81 block: 並行セッション ${others.length} 件 active 中は main checkout の branch 操作 (checkout/switch/reset --hard) 禁止。\n` +
          `→ worktree で作業: git worktree add .claude/worktrees/<name> <base> + bash scripts/dev/worktree-init.sh\n` +
          `→ worktree 内の操作なら: git -C <worktree絶対path> … で対象を明示して再実行\n` +
          `→ 単独セッションと確信できる場合: .claude/locks/ の他 lock を削除 or CLAUDE_PARALLEL_GUARD=off`,
      );
      process.exit(2);
    }
  }
  process.exit(0);
} catch {
  process.exit(0);
}
