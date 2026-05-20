# ADR-0029: Form UX 恒久化 (Phase γ) — Form atom contract / Placeholder 規約 / 数値+単位 atom / Hybrid input / Single-Bulk 動線整合

- Status: Accepted
- Date: 2026-05-21
- Deciders: @doooooraku
- Related: ADR-0027 (作業記録 form 統合 + 写真/日付 共通基盤 Phase α-β) / ADR-0028 (EventType 拡張 leaf_first_aid) / ADR-0026 (樹種・樹形マスタ 5 種化) / ADR-0024 (modal 一本化) / ADR-0011 (記録のみ哲学) / Sess17 議論 (5 つの違和感 + 6 つの恒久対策セット、 user 真意「対処療法でなく恒久対策」 + 「Bulk に 14 種別 form 全展開」) / `docs/reference/design_system.md` §12 (Form Atom Components Sess14 PR-O 確立) / `docs/reference/functional_spec.md` §7.3.2.1 (14 種別 form 正規仕様)

---

## Context（背景：いま何に困っている？）

### Sess16 完遂後に判明した 5 つの違和感

Sess16 (2026-05-20、 26 PR #623-#648 全 main merge) で 14 種別作業記録 form の mockup 整合実装が完了。 しかし user が実機で操作した結果、 以下の違和感が判明:

1. **typography 不統一**: `src/features/event/WorkLogConfirmScreen.tsx` 内で「内部 Field component」 (label fontSize 13、 任意 fontSize 13) と「Labeled\* atom 群」 (label SemiBold、 任意 fontSize 10) の 2 系統が混在
2. **placeholder 冗長**: `workLogNotePlaceholder: '自由メモ (例: 朝8時、たっぷり)'` 等が label を再掲、 Material Design 3「Placeholder text should not repeat the label」 違反
3. **鉢サイズ単位切替なし**: WorkLog repotting form が cm 固定。 `src/features/bonsai/BonsaiBasicForm.tsx` L915-L937 に存在する cm/mm/inch segmented control が未流用
4. **戻るボタン skip**: WorkPicker → cell tap → store-callback で WorkLogConfirm から ← 戻ると WorkPicker を skip (本 ADR の scope 外、 ADR-0030 で別途対応)
5. **番手 5 段階固定**: `WIRE_GAUGES = ['1mm', '1.5mm', '2mm', '2.5mm', '3mm']` hardcode、 業務プロが 3.5mm/4mm 等を入れる free input 不可

### 一括記録 (Bulk) の認識訂正

Sess16 PR-B1 で BulkLogConfirm を「単一 type + 日付 + 写真 + メモのみ」 に簡素化したが、 user の真意は「**14 種別 form の中身を Bulk 側にも展開、 内容全部一緒で OK**」。 業務プロペルソナ評価が ✕ → ◎ に転換する重要 scope。

### なぜなぜ 5 段階分析の結論 (根本原因)

5 つの違和感を 5 段階深掘りした結果、 共通の根本原因は **「Form atom contract が docs にも自動チェックにも構造化されておらず、 ad-hoc 実装が静かに繰り返される構造」**。 個別 Quick fix では数セッション後に必ず再発する。

### 制約 / 前提

- `docs/reference/design_system.md` §12 「Form Atom Components」 は Sess14 PR-O で確立、 既存 atom 5 種 (LabeledTextInput / LabeledNumberInput / LabeledDateRow / LabeledPickerRow / PhotoField) を内包。 本 ADR は **§12 拡張 + §13-§16 新設** で恒久化
- `events.payload` は JSON、 `events.type` に CHECK 制約なし (ADR-0028 §Decision)。 schema 変更不要
- Valibot `v.object` strict ではない (ADR-0028 §Constraints)。 追加 prop は warning なく通過
- `src/db/eventRepository.ts` の `bulkLogEvents()` (Sess12 PR-B 確立) は signature 拡張で payload 引数追加可能、 schema 互換維持

---

## Decision（決めたこと：結論）

### 5 sub-decision を 1 ADR に統合

#### D1: Form atom typography contract の明文化と token 化

- **決定**:
  1. `src/core/theme/typography.ts` 新規作成し、 Form 系で使用する 4 token を constants 化:
     - `formLabel` (fontFamily / fontSize 14 / fontWeight '600' = SemiBold)
     - `formOptional` (fontSize 10 / letterSpacing 0.8 / color TEXT_MUTED)
     - `formPlaceholder` (color TEXT_SECONDARY、 RN default 信頼しない)
     - `formSuffix` (fontSize 14 / color TEXT_MUTED)
  2. 既存 atom 5 種 (LabeledTextInput / LabeledNumberInput / LabeledDateRow / LabeledPickerRow / PhotoField) を token 経由に refactor、 hardcoded fontSize/fontWeight を撤廃
  3. `WorkLogConfirmScreen.tsx` 内の「内部 Field component」 を新 atom `LabeledSegmented` に置換 (D3 参照)、 2 系統混在を解消
- **自動検出**: `scripts/check-form-typography.mjs` 新規 — `src/components/form/**` と `src/features/**/[Ww]ork*Screen.tsx` 等で hardcoded `fontSize:` / `fontWeight:` を grep 検出して warning 出力。 Sess17 では warning のみ、 ESLint AST rule 化は Sess18 以降 (false positive リスク回避、 段階導入)

#### D2: Placeholder 規約の明文化と audit 仕組み

- **決定** (Material Design 3 整合):
  - **OK**: 「形式の見本」 (例: `例: 18`、 `2026-05-20`、 `例: 赤玉土:桐生砂 = 7:3`) — データ形式や具体的な記入例を示す
  - **NG**: label を再掲する placeholder (例: `自由メモ (例: 朝8時、たっぷり)` の `自由メモ` 部分)、 命令形 placeholder (例: `選択してください`)、 「○○を入力」 等の汎用文言
- **修正対象 i18n keys** (Phase 3a で対応):
  - `workLogNotePlaceholder` — `自由メモ` 削除、 形式例のみに
  - `workLogPositionToPlaceholder` — `選択してください` (命令形) を撤廃、 具体的位置例に
  - `workLogPhotoCaptionPlaceholder` — `キャプション` (label 再掲) 削除、 具体的キャプション例に
- **自動検出**: `scripts/i18n-placeholder-audit.mjs` 新規 — i18n locales 全 19 言語を walk、 label 再掲と命令形 placeholder を grep で検出してレポート出力
- **CI 統合**: `pnpm i18n:check` の延長で実行、 NG keys 0 を CI 緑条件に追加

#### D3: 数値 + 単位を扱う field の atom 化 (LabeledNumberInputUnit) + Segmented atom (LabeledSegmented)

- **決定**:
  1. `src/components/form/LabeledNumberInputUnit.tsx` 新規 — 数値入力 + 単位切替 segmented + util 連携を 1 atom に統合
     - props: `{ label, value, unit, units, onChangeValue, onChangeUnit, defaultUnit, settingsStorePath?, suffix?, optional?, required? }`
     - 内部で `LabeledNumberInput` + 単位 segmented + util (`unitToCanonical` / `canonicalToUnit`) を組み合わせ
     - `settingsStorePath?` 省略時は一時切替モード (settings は touch しない)、 明示時は永続化モード
  2. `src/core/util/unitConvert.ts` 新規 — 既存 `potUnitConvert.ts` を generic 化、 長さ系単位 (cm/mm/inch) + 太さ系 (mm/inch) + 将来拡張可能な domain 別 enum
  3. `src/components/form/LabeledSegmented.tsx` 新規 — Segmented (横並び選択ボタン) を共通化、 WorkLogConfirm の内部 `Field` + `Segmented` inline 実装を吸収
     - props: `{ label, items, value, onChange, multi?, optional?, required? }`
- **流用範囲**:
  - BonsaiBasicForm 鉢情報 (Sess18 で移行)
  - WorkLog repotting 鉢サイズ (Sess17 Phase 4 PR-F2 で移行)
  - 将来の数値+単位 field (例: 樹齢 segment + その他 free input)

#### D4: Hybrid input pattern の atom 化 (LabeledNumberSegmentOrFree)

- **決定**:
  1. `src/components/form/LabeledNumberSegmentOrFree.tsx` 新規 — pre-defined segments + 「その他」 segment で free input が出現する hybrid atom
     - props: `{ label, segments, value, onChangeValue, freeLabel, freeUnit, min?, max?, optional?, required? }`
     - 「その他」 tap で `LabeledNumberInput` (任意で `LabeledNumberInputUnit`) 出現
  2. シニアペルソナ (高橋 62 歳) は pre-defined のみで完結、 業務プロは「その他」 で自由入力、 4 ペルソナすべて満足
- **流用範囲**: WorkLog wiring 番手 (Sess17 Phase 4 PR-F2 で適用)、 将来の数値選択 field

#### D5: Single/Bulk 動線 UI 整合 (WorkLogTypeFormFields component 化)

- **決定**:
  1. `src/features/event/WorkLogTypeFormFields.tsx` 新規 — 14 種別 form の入力 fields のみを担当する controlled component
     - props: `{ type, payload, onChange }` (state hoisting、 ref/forwardRef 禁止)
     - `WorkLogConfirmScreen.tsx` (Single) と `BulkLogConfirmScreen.tsx` (Bulk) が両方この component を呼ぶ、 1:1 UI 整合
  2. `src/db/eventRepository.ts` の `bulkLogEvents()` signature 拡張 — `payload?: Record<string, unknown>` 引数追加、 全選択盆栽に同 payload を適用 (user 真意「内容全部一緒」)
  3. Sess12 PR-B1 で「Bulk は単純化のみ」 とした方針は撤回、 user 真意「Bulk にも 14 種別 form 全展開」 反映
- **適用範囲**: v1.x、 Free / Pro 両方、 iOS / Android
- **業務プロペルソナ評価**: Bulk で 14 種別固有 form 入力可能、 ✕ → ◎ に転換

### 既存 ADR との整合

- **ADR-0027** (Phase α-β): 本 ADR-0029 と並存、 Phase γ (D5 Bulk 展開) を追記する形で改訂 (Sess17 PR-A3)
- **ADR-0028** (leaf_first_aid 追加): 影響なし、 14 種別 form の atom 化対象に leaf_first_aid も含む
- **ADR-0024** (modal 一本化): navigation patterns は本 ADR scope 外、 ADR-0030 で別途対応

---

## Decision Drivers（判断の軸：何を大事にした？）

- **Driver 1 (最重要)**: user 真意「対処療法でなく恒久対策」 (CLAUDE.md §3 + §9) — 個別 Quick fix でなく仕組み化で再発防止
- **Driver 2**: 業務プロペルソナ ✕ → ◎ 転換 (Bulk 14 種別 form 展開、 D5)
- **Driver 3**: 4 ペルソナ全員 ◎/○ 以上 (typography 統一・placeholder 簡素化は全員 ○ 以上、 hybrid input でシニア ○ 維持)
- **Driver 4**: Sess14 確立の Form atom + Sess15 案 P 統一徹底の延長線、 design_system.md §12 拡張で既存資源最大活用
- **Driver 5**: schema 変更ゼロ (events.payload JSON + Valibot strict=false で柔軟)、 backward-compat 担保

---

## Alternatives considered（他の案と却下理由）

### Option A: 統合 1 ADR + 5 sub-decision ★採用

- 概要: 上記 D1-D5 を ADR-0029 に統合、 navigation のみ ADR-0030 切り出し
- 良い点: ADR 数 2 個で集約、 過去 ADR との関係性追跡が爆発しない (現状 28 ADR + 2 = 30 で抑制)
- 悪い点: 1 ADR が約 200-300 行と大型化
- 採用理由: 5 sub-decision は「Form UX 恒久化」 という共通 theme で同時実施が前提、 単一 ADR の方が決定の文脈保持に有利

### Option B: 5 ADR 個別起票

- 概要: typography / placeholder / 数値+単位 / hybrid input / Single-Bulk 動線 を ADR-0029〜ADR-0033 として個別起票
- 良い点: 各 ADR が短く焦点明確
- 悪い点: 5 ADR + ADR-0030 (navigation) = 6 ADR、 ADR 番号管理 + 過去 ADR からの参照爆発、 sub-decision 間の依存関係が分かりにくい
- 却下理由: Plan agent critical review で「過剰分割」 と指摘、 ADR は「決定の単位」 であり「PR の単位」 ではない

### Option C: 部分的恒久化 + Quick fix mix

- 概要: typography token 化のみ ADR、 残り placeholder/atom/Bulk は Quick fix PR
- 良い点: Sess17 工数最小
- 悪い点: user 真意「恒久対策」 に反する、 数セッション後に再発リスク大
- 却下理由: user 明示却下 (「暫定的でなく恒久対策」 真意)

---

## Consequences（結果：何が変わる？）

### Pro

- **構造的再発防止**: design_system.md §12-§16 + theme tokens + audit scripts で「適当な部品を選ぶ → drift」 を仕組みで防ぐ
- **業務プロペルソナ ✕ → ◎ 転換**: Bulk で 14 種別固有 form 入力可能、 100 本/日 詳細記録が現実化 (D5)
- **シニアペルソナ ○ 維持**: hybrid input atom で pre-defined のみで完結する経路を保持 (D4)
- **将来 form 追加の容易化**: 3 つの新規 atom (LabeledSegmented + LabeledNumberInputUnit + LabeledNumberSegmentOrFree) で Lego ブロック式構築
- **i18n 品質ベースライン**: placeholder audit script で全 19 言語で OK/NG 検出可能、 継続的品質保証

### Con

- **PR 数増加** (Sess17 で 14-17 PR + Sess18 で 10-12 PR = 計 24-29 PR): Sess16 26 PR 実績ありで吸収可能
- **WorkLogConfirmScreen.tsx の大幅 refactor リスク**: Phase 4 で 3 PR grouping (種別別分割) + Phase 5 で WorkLogTypeFormFields 切り出し、 同ファイル 4 回 PR 通過で merge conflict 注意 → 順次 rebase で対応
- **i18n 19 言語 × 3 placeholder keys = 57 文字列の手動翻訳**: 機械的 replace 不可 (言語別括弧形式異なる)、 各言語の括弧形式 (ja「例:」 / en「e.g.」 / fr「p.ex.」 / de「z.B.」) に整合する手動翻訳必要

### スコープ外 (Sess18 で別途実施)

- **Navigation patterns 統一** — ADR-0030 で別途対応 (高リスク refactor で単独セッション集中)
- **ESLint AST rule 化** — Phase 2 の grep check の AST 化、 false positive リスクのため Sess18 以降
- **BonsaiBasicForm 鉢情報移行** — LabeledNumberInputUnit 適用、 inline 実装からの移行
- **R-rule 昇華** (R-29 6 段階拡張 / R-36 強化 / R-38 ペルソナ深掘り新設)

---

## Implementation（実装メモ）

### Phase 構成 (Sess17、 計画書 `/home/doooo/.claude/plans/jaunty-nibbling-llama.md` 参照)

- Phase 0 (3 PR): ADR 起票 (本 ADR + ADR-0030 + ADR-0027 改訂)
- Phase 1 (1 PR): design_system.md §12 拡張 + §13-§16 新設
- Phase 2 (2 PR): theme tokens (typography.ts) + check-form-typography.mjs
- Phase 3a (2 PR): i18n-placeholder-audit.mjs 新規 + NG keys 修正
- Phase 3b (3 PR): LabeledSegmented + LabeledNumberInputUnit + LabeledNumberSegmentOrFree
- Phase 4 (3 PR): WorkLogConfirm 14 種別 atom 化 (種別 grouping)
- Phase 5 (1 PR): WorkLogTypeFormFields 切り出し
- Phase 6 (3-4 PR): bulkLogEvents payload 拡張 + BulkLogConfirm 統合 + functional_spec 改訂 + 実機 SS

### testID 命名規約 (継承)

- `e2e_work_log_<field>` (Single)
- `e2e_bulk_log_<field>` (Bulk)
- 新規 atom: `e2e_labeled_segmented_<item>` / `e2e_labeled_number_input_unit_<unit>` / `e2e_labeled_number_segment_or_free_<segment>`

### testing 戦略

- 各 atom に snapshot test 必須 (LabeledNumberInputUnit 単位 round-trip / LabeledNumberSegmentOrFree segment ↔ free 切替 / LabeledSegmented multi/single)
- WorkLogTypeFormFields は props 型整合性 test
- Bulk 動線: 新規 Maestro flow 3 本 (`bulk-log-confirm-wiring.yaml` 等、 代表 type のみ)
- 実機 SS: 代表 6 種別 × Single + Bulk = 12 SS、 R-25 構造系 4 項目評価

---

## Notes Amended (随時更新)

(初版 2026-05-21、 Sess17 進行中に更新予定)
