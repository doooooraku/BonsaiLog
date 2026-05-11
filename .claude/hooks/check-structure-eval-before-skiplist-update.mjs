#!/usr/bin/env node
/**
 * Issue #443 受けて: skip-list.json の achieved 配列に新エントリ追加 / 既存エントリ
 * 更新時、構造系 4 項目チェック (PR #442 Claude Read 評価ガイド) の証跡が
 * `rationale` または `reevalRationale` に含まれているか確認する PreToolUse hook。
 *
 * 防ぐ問題: ImageMagick RMSE のみで「達成」 判定し、構造的差分を見逃して
 * skip-list に追加するケース (Issue #439-#441 で bonsai-detail 3 タブが発覚)。
 *
 * 動作:
 * - 対象は Edit / Write で `scripts/ui-diff/skip-list.json` を編集する場合のみ
 * - new_string / content に構造系キーワード (タブ構成 / セクション構成 / UI 種別 /
 *   スクロール範囲) が 1 つも含まれない場合は block + ガイド出力
 *
 * 既存 hook (check-read-before-edit.mjs) の流儀に整合。
 */
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const { tool_name, tool_input } = input;

// 対象は Edit / Write のみ
if (!['Edit', 'Write'].includes(tool_name)) {
  process.exit(0);
}

const targetPath = tool_input?.file_path ?? '';
// skip-list.json のみ対象
if (!targetPath.endsWith('scripts/ui-diff/skip-list.json')) {
  process.exit(0);
}

const content = tool_input?.new_string ?? tool_input?.content ?? '';

// 構造系 4 項目のキーワード (PR #442 整合)
const STRUCTURE_KEYWORDS = ['タブ構成', 'セクション構成', 'UI 種別', 'スクロール範囲', '構造系 4 項目'];

const hasStructureMention = STRUCTURE_KEYWORDS.some((kw) => content.includes(kw));

// achieved/rationale フィールドの更新パターンを検出 (簡易)
// content に "rationale" または "reevalRationale" 文字列があれば skip-list 更新と判定
const isAchievedUpdate = /["']rationale["']|["']reevalRationale["']/.test(content);

if (isAchievedUpdate && !hasStructureMention) {
  console.error(
    `[R-25 violation] skip-list.json の achieved/rationale 更新で構造系 4 項目チェックの証跡が不足。\n` +
    `\n` +
    `PR #442 (Claude Read 必須化) の構造系 4 項目チェックを実施した証跡を rationale または\n` +
    `reevalRationale に含めてください。以下のキーワードを 1 つ以上含むこと:\n` +
    `  - タブ構成\n` +
    `  - セクション構成\n` +
    `  - UI 種別\n` +
    `  - スクロール範囲\n` +
    `  - 構造系 4 項目\n` +
    `\n` +
    `背景: 2026-05-11 セッションで ImageMagick RMSE のみで「達成」 判定し、bonsai-detail\n` +
    `3 タブで構造的大差を見逃した事例あり (Issue #439-#441)。構造系チェック未実施で\n` +
    `「達成」 フラグを立てるのは禁止。\n` +
    `\n` +
    `詳細: docs/how-to/ui-diff/auto-improve-loop.md § Claude Read 評価ガイド\n` +
    `Hook: .claude/hooks/check-structure-eval-before-skiplist-update.mjs\n`
  );
  process.exit(2);
}

process.exit(0);
