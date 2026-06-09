#!/usr/bin/env node
/**
 * check-manager-screen-symmetry.mjs — master/custom 管理画面 UI 統一 SoT 同型 lint (R-76 起票)。
 *
 * 検出: `app/tags.tsx` / `app/custom-species.tsx` / `app/custom-styles.tsx` の 3 file で、
 * 必須 element の出現回数が一致しているかを grep 比較。 不整合あれば warning (= R-76 違反候補)。
 *
 * Sess91 PR-1〜PR-3 で 3 画面の見た目・操作・inline 展開を統一した SoT を維持するための構造防御 lint。
 * 1 領域改修で 3 画面同時改修必須 (= R-55 関連項目網羅調査 + R-76 5 軸 SoT) を機械検出。
 *
 * 対象 element (= 各画面で出現回数が一致すべきもの):
 * - `managerScreenStyles.rowWithToggle` (= 横並び layout + 左 toggle area、 統一 row pattern)
 * - `<RowActionMenu` (= kebab メニュー、 編集 + 削除 2 択)
 * - `<ConfirmDialog` (= 削除確認 dialog)
 * - `styles.toggleArea` (= 左 toggle ▶/▼ ヒット領域 44×44)
 * - `styles.kebabButton` (= 右 kebab ⋮ ヒット領域 32×32)
 * - `styles.expandedArea` (= inline 関連盆栽 展開エリア)
 *
 * 検出ロジック:
 * 1. 3 file の content を Read
 * 2. 各 element の出現回数を grep
 * 3. 3 画面で完全一致するか比較、 不一致あれば warning + 出現回数 dump
 *
 * Exit code:
 * - 0 (常に成功、 warning のみ — 段階導入、 Sess92+ で error 昇格検討)
 *
 * Sess91 PR-4 時点の baseline (= 全 3 画面で同一回数):
 * - rowWithToggle: 1 (= map() で各 item に 1 度)
 * - RowActionMenu: 1 (= 画面最下部 fixed)
 * - ConfirmDialog: 1 (= 画面最下部 fixed)
 * - toggleArea: 1 (= row 左端 Pressable)
 * - kebabButton: 1 (= row 右端 Pressable)
 * - expandedArea: 1 (= inline 展開時の View)
 *
 * 関連:
 * - .claude/recurrence-prevention/specialized.md R-76 (= 本 lint の起票元)
 * - docs/adr/ADR-0036-destructive-action-pattern.md §Notes Amended Sess91 PR-4
 * - src/features/manager-screen/managerScreenStyles.ts (= 3 画面共通 styles SoT)
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const TARGET_FILES = ['app/tags.tsx', 'app/custom-species.tsx', 'app/custom-styles.tsx'];

const ELEMENTS = [
  { name: 'rowWithToggle', pattern: 'styles.rowWithToggle' },
  { name: 'RowActionMenu', pattern: '<RowActionMenu' },
  { name: 'ConfirmDialog', pattern: '<ConfirmDialog' },
  { name: 'toggleArea', pattern: 'styles.toggleArea' },
  { name: 'kebabButton', pattern: 'styles.kebabButton' },
  { name: 'expandedArea', pattern: 'styles.expandedArea' },
];

function countOccurrences(content, pattern) {
  let count = 0;
  let index = 0;
  while ((index = content.indexOf(pattern, index)) !== -1) {
    count += 1;
    index += pattern.length;
  }
  return count;
}

function main() {
  const fileContents = {};
  for (const file of TARGET_FILES) {
    try {
      fileContents[file] = readFileSync(join(ROOT, file), 'utf8');
    } catch (e) {
      console.error(`[check-manager-screen-symmetry] file not found: ${file} (${e.message})`);
      process.exit(1);
    }
  }

  let warningCount = 0;
  const reports = [];

  for (const { name, pattern } of ELEMENTS) {
    const counts = TARGET_FILES.map((f) => ({
      file: f,
      count: countOccurrences(fileContents[f], pattern),
    }));
    const uniqueCounts = [...new Set(counts.map((c) => c.count))];
    if (uniqueCounts.length > 1) {
      warningCount += 1;
      const detail = counts.map((c) => `${c.file.replace('app/', '')}=${c.count}`).join(' / ');
      reports.push(`  ⚠️  ${name} (pattern '${pattern}'): ${detail} = R-76 違反候補`);
    }
  }

  if (warningCount === 0) {
    console.log(
      `[check-manager-screen-symmetry] OK — 3 画面 (${TARGET_FILES.join(' / ')}) の必須 element 出現回数が全て一致 (R-76 SoT 整合)`,
    );
  } else {
    console.log(
      `[check-manager-screen-symmetry] ⚠️  ${warningCount} 件の SoT 不整合 (R-76 違反候補):`,
    );
    for (const r of reports) {
      console.log(r);
    }
    console.log(`\n対策: .claude/recurrence-prevention/specialized.md R-76 の 5 軸 SoT に従う:`);
    console.log(`  (a) styles = managerScreenStyles SoT、 (b) row 横並び layout、`);
    console.log(`  (c) RowActionMenu + ConfirmDialog、 (d) inline 展開、 (e) addBtn JSX prefix`);
  }

  // Sess91 PR-4 段階導入: warning のみ、 exit 0。 Sess92+ で error 昇格検討。
  process.exit(0);
}

main();
