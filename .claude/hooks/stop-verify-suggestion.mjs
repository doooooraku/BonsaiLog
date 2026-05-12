#!/usr/bin/env node
/**
 * Stop hook - コード変更ありの時のみ「pnpm verify 推奨」 を stderr 警告する。
 *
 * Claude Opus 4.7 ベストプラクティス取り込み (2026-05-12 議論セッション、Qiita ot12 記事 + 公式 docs)。
 * 「検証機構なしで任せるのはやめろ」 公式最高評価施策の軽量版実装。
 *
 * 動作:
 * - git status --porcelain で変更検知
 * - src / app / tests / scripts / maestro 配下に変更があれば stderr 警告
 * - block しない (exit 0)、議論モードや単純質問では何も出さない
 *
 * 仕組み:
 * - 1 秒以内で完了 (execSync 1 回)
 * - matcher 配下に変更なし = 即 exit 0
 * - 警告は Claude が次セッション開始時に context として読み込む
 *
 * 関連: R-25 (機械判定のみ禁止、Claude Read 主導)、R-6 (仕組み化優先)
 */
import { execSync } from 'node:child_process';

function safe(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

const dirty = safe('git status --porcelain');
if (!dirty) process.exit(0);

const hasCodeChange = dirty
  .split('\n')
  .some((line) => /^.{2,3}(src|app|tests?|scripts|maestro)\//.test(line));

if (!hasCodeChange) process.exit(0);

process.stderr.write(
  [
    '[verify-suggestion] コード変更あり、未検証の可能性があります。',
    '  推奨: pnpm verify  (lint + type-check + format + test + i18n + config + docs + template + native + theme + a11y + maestro)',
    '  軽量: pnpm verify:lint && pnpm verify:type-check',
    '  根拠: R-25 (機械判定のみ禁止) + Claude Opus 4.7 ベストプラクティス「検証機構なしで任せるな」',
  ].join('\n') + '\n',
);

process.exit(0);
