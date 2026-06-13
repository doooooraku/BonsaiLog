#!/usr/bin/env node
/**
 * Sess108 案 7 (Notion 215 prompts 由来 — "Inbox/Triage/Active/Done" の未消化を visible 化):
 * SessionStart で「未着手 + 担当 = Claude」 の Notion 依頼件数を session に注入する hook。
 * Notion MCP は本セッションの cwd で認証されている前提だが、 hook 自身は MCP を呼べない
 * (= hook process は MCP client を持たない)。 代替として cache ファイル
 * (.claude/state/notion-pending.json) を読み、 「未消化 N 件」 を additionalContext で
 * 注入する。 cache は /notion-intake / /notion-report が書き換える設計 (= 取込時に N--、
 * 取込済件数を見える化)。 cache なし / count=0 / ENV off / 例外: 全て silent exit 0。
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function safeSilentExit() {
  // どの分岐でも壊れず、 SessionStart を絶対 block しない
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart' } }));
  process.exit(0);
}

try {
  // ENV flag による全 off (Notion MCP 未認証 / network 不調時の safety net)
  if (process.env.BONSAI_NOTION_SYNC === 'off') {
    safeSilentExit();
  }

  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const cachePath = join(projectDir, '.claude', 'state', 'notion-pending.json');

  if (!existsSync(cachePath)) {
    // cache 未生成 (= /notion-intake が一度も走っていない初回) は silent
    safeSilentExit();
  }

  let cache;
  try {
    cache = JSON.parse(readFileSync(cachePath, 'utf8'));
  } catch {
    safeSilentExit();
  }

  const count = Number(cache?.pending_count ?? 0);
  const updatedAt = cache?.updated_at ?? null;

  if (!Number.isFinite(count) || count <= 0) {
    // 0 件 / 不正値は silent
    safeSilentExit();
  }

  // cache が 7 日以上古い場合は信頼せず silent (stale guard)
  if (updatedAt) {
    const ageMs = Date.now() - new Date(updatedAt).getTime();
    if (Number.isFinite(ageMs) && ageMs > 7 * 24 * 60 * 60 * 1000) {
      safeSilentExit();
    }
  }

  const lines = [
    '【Sess108 案 7 / Notion 双方向同期】',
    '',
    `## 未消化 Notion 依頼: ${count} 件`,
    '',
    `- 取込コマンド: \`/notion-intake\` で「未着手 + 担当 = Claude」 を一括取込`,
    `- 完了報告: セッション終了時に \`/session-end\` 経由で \`/notion-report\` が自動連結`,
    updatedAt ? `- cache 最終更新: ${updatedAt}` : null,
    '- 一時 off: 環境変数 `BONSAI_NOTION_SYNC=off` で全 step skip',
  ].filter(Boolean).join('\n');

  const output = {
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: lines,
    },
  };
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
} catch {
  safeSilentExit();
}
