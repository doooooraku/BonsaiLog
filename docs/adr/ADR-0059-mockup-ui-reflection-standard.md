# ADR-0059: mockup→実装 UI 反映の標準 = 写経駆動 + 実機 SS 目視 (ui-diff pipeline 退役)

- Status: Accepted
- Date: 2026-06-12
- Deciders: @doooooraku
- Related: ADR-0020 (ClaudeDesign 全面採用 = UI の正) / ADR-0021 (ui-diff pipeline — 本 ADR が Supersede) / ADR-0046 (退役ポリシー D-1/D-2 準拠) / R-25 (構造系 4 項目) / R-29 (写経駆動開発 5 段階) / `docs/reference/integration-criteria.md` (整合性レベル定義) / `/device-verify` skill (`scripts/dev/take-ss.sh`)

---

## Context（背景：いま何に困っている？）

mockup (OpenDesign / ClaudeDesign で作る UI のお手本) を動くアプリ UI に反映する方法は 3 世代変遷した:

1. **第 1 世代 (〜2026-05 初)**: mockup の UI 構成ファイル (HTML/JSX) を Claude が参照して実装 → **mockup 通りにならない** (JSX をざっと読んで雰囲気で実装していた)
2. **第 2 世代 (ADR-0021、2026-05-06〜)**: 救済策として「mockup を画像化 + 実機を Maestro で自動撮影 + 比較して寄せる」 ui-diff pipeline を構築 (skip-list / pairing-report / 自動改善ループ)。1 画面 20-30 分
3. **第 3 世代 (Sess89〜94、2026-06)**: 運用が事実上 **写経駆動 (R-29) + 実機 SS 目視 (/device-verify)** に移行。pipeline は 2026-05-13 を最後に停止し、対応表 (ui-diff-flow-mapping) が陳腐化

第 1 世代の失敗が第 3 世代で再発しない理由 (Sess101 検証):

- **R-29 が 5 段階を強制**: ①mockup JSX/HTML **全文** Read ②mockup **スクショ** Read ③既存 RN 実装 Read ④実装後に実機 SS 撮影 ⑤**並べて Read 目視比較** — 「読むだけ」を構造的に禁止
- **design token の機械強制**: `useColors()` + 直 hex 禁止 ESLint (ADR-0052) で色・タイポグラフィがズレようがない
- **実機 SS が数十秒**: `take-ss.sh` (/device-verify) で Maestro flow 作成なしに視覚検証できる
- **合格基準が明文**: `integration-criteria.md` レベル 2 (見た目 80% 一致)

→ Sess89〜94 で mockup 整合 PR 多数が実機検証 GO。pipeline の維持費 (docs 6 本 + scripts 17 file + flow 31 本の陳腐化) だけが残った。

---

## Decision（決めたこと：結論）

### D1: mockup→UI 反映の標準フロー (正式宣言)

1. mockup の構成ファイル (`docs/mockups/` の HTML/JSX、または新規 ClaudeDesign mock) を **R-29 の 5 段階**で写経実装
2. 色・余白・タイポグラフィは `design_system.md` の token 経由 (直 hex 禁止、機械強制済)
3. 検証 = `/device-verify` (`take-ss.sh` で実機 SS → Claude Read 目視 → mockup スクショと並列比較)
4. 合格基準 = `integration-criteria.md` **レベル 2** (構造系チェックは PR テンプレ付録 §7.6 が強制)

### D2: ui-diff pipeline (ADR-0021) の退役

- **削除** (git 履歴で復元可): `scripts/ui-diff/` 全部 (skip-list.json 含む) / `maestro/flows/ui-diff/` 31 flow / `docs/how-to/ui-diff/` 4 手順書 / prompt 雛形 (screen-integration-prompt.md, P-09, P-12) / `.claude/rules/ui-diff-loop.md` / `check-structure-eval-before-skiplist-update.mjs` hook / `verify:maestro` gate (`maestro-flow-lint.mjs` は ui-diff flows 専用設計のため対象消滅) / `ui-diff:pairing-report` script
- **archive** (記録性あり): `ui-diff-flow-mapping.md` → `docs/archive/ui-diff-2026-05/` (41 画面の対応関係スナップショット)
- **存続**: `integration-criteria.md` (D1 の合格基準) / R-25・R-29 (D1 の中核) / lessons/auto-improve-loop.md (教訓) / `check-maestro-flow-creation.mjs` (R-31、ui-diff 非依存) / `verify:iteration` (maestro/flows 全域対象)
- ADR-0021 は ADR-0046 D-1 に従い **Status: Superseded (番号・ファイル保持)**

### D3: mockup 側を design token に直結 (次の mockup から)

- 次回以降 ClaudeDesign で mockup を作る際、mock の CSS 変数名を `design_system.md` の token 名と一致させる (例: `--brand-green` ↔ `BRAND_GREEN`)
- 効果: 写経時の「色・サイズの翻訳誤差」を排除し、mockup がそのまま仕様になる
- OpenDesign 製の既存 mockup (v1.0) は対象外 (凍結保管のまま)

### D4: 復活条件

- 大規模 UI 改修で「直した画面の一括 regression 検査」が必要になったら、本 ADR を Amendment し git 履歴から pipeline を復元して判断する (先回りでは維持しない = ADR-0046 Driver 3)

---

## Decision Drivers（判断の軸）

- **Driver 1**: 実績 — 第 3 世代 (写経 + 実機 SS) で Sess89〜94 の mockup 整合 PR が実機検証 GO 連発、pipeline は 1 ヶ月不使用
- **Driver 2**: 維持費 — 使われない docs/scripts は drift し続ける (flow-mapping 陳腐化が実例)。Doc-Truth Audit 教訓「乖離は発生源を断つ」
- **Driver 3**: 可逆性 — 全資産が git 履歴から復元可能 (ADR-0046 準拠)

---

## Alternatives considered（他の案と却下理由）

### Option A: 写経 + 実機 SS 目視を標準化、pipeline 退役 ★採用

- 良い点: 手間最小 (flow 作成・skip-list・pairing-report 不要)、既に事実上の標準
- 悪い点: regression の自動検出なし → /device-verify の対象画面選定で都度カバー (D4 で復活余地)

### Option B: 写経 + pipeline 併存 (現状維持)

- 良い点: 大規模 UI 改修時の一括 regression 撮影が即使える
- 却下理由: 1 ヶ月不使用の設備の維持費 (docs/skip-list が嘘をつき続ける)。必要になってから D4 で復元すれば足りる

### Option C: Visual regression SaaS (Chromatic / Percy)

- 却下理由: RN 実機 UI の web 化が前提で過剰。個人開発の経済性に合わない (integration-criteria レベル 3 の将来オプションとして言及だけ残す)

---

## Consequences（結果：何が変わる？）

- Pro: UI 実装の標準が 1 本化され、新画面は「写経 5 段階 + 実機 SS 1 枚」で完結。doc/scripts の陳腐化源が消える
- Pro: D3 で mockup 自体が仕様に近づき、翻訳誤差がさらに減る
- Con: 全画面一括の整合度測定はできなくなる (必要時は D4)
- verify chain: `verify:maestro` gate が減る (対象 flow 消滅のため空回りしていた)

---

## Links

- 標準の構成要素: R-29 (`.claude/recurrence-prevention/specialized.md`) / `docs/reference/integration-criteria.md` / `/device-verify` skill / `docs/reference/design_system.md`
- 退役元: [ADR-0021](./ADR-0021-ui-diff-pipeline.md) (Superseded)
- 退役ポリシー: [ADR-0046](./ADR-0046-harness-inventory-and-retirement-policy.md) D-1/D-2
- 経緯詳細: Sess101 議論 (user 提示「OpenDesign 参照で作れるなら手間が省ける」→ 検証の結果 R-29 条件付きで成立と確認)
