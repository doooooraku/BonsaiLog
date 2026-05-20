# ADR-0027: 作業記録 form 統合 + 写真/日付 共通基盤 (Phase α-β)

- Status: Accepted
- Date: 2026-05-20
- Deciders: @doooooraku
- Related: Issue #14 (F-02) / ADR-0008 (events STI + Valibot payload) / ADR-0011 (記録のみ哲学) / ADR-0020 (Claude Design) / ADR-0024 (modal 一本化) / ADR-0025 (Phase 2 案 X 記録タブ) / Sess16 議論 (Q1-Q8 全 user 判断) / `docs/reference/functional_spec.md` §7 / `docs/mockups/v1.0/screenshots/` (user 提供 SS 10 枚)

---

## Context（背景：いま何に困っている？）

- **現状**: ADR-0024 + ADR-0025 で work-picker / work-log-confirm / bulk-work-picker / bulk-log-confirm の動線整備が完了。 ただし **form 内容は格差**:
  - WorkLogConfirm: 3 種別 (watering / pruning / wiring) のみ詳細 form、 残 10 種別は note のみ
  - BulkLogConfirm: 全種別 note のみ
  - 日付 / 写真 field は未実装
- **困りごと**:
  - mockup user 提供 SS 10 枚で全 14 種別固有 form (segment / text / number / picker) + 共通項目 (日付 + 写真) が定義済、 実装と乖離大
  - 業務プロ ペルソナで「note のみだと業務記録に成らない」 (Sess16 議論で 1 ペルソナ ✕ → 案 X 採用必須)
- **制約/前提**:
  - `docs/reference/constraints.md` §1-4 (記録のみ哲学) → mockup の各 form は記録専用、 AI 提案なし
  - schema v15 で `events.payload_json` (Valibot DU) + `events.occurredAtUtc` + `photos.eventId` 完備、 schema 変更不要 (Phase γ の leaf_first_aid 追加時のみ v16 bump)
  - Sess14 確立の Form atom (LabeledDateRow / LabeledNumberInput / LabeledTextInput / LabeledPickerRow) を流用、 新規は PhotoField のみ

---

## Decision（決めたこと：結論）

- **決定**:
  1. **WorkLogConfirm + BulkLogConfirm に 14 種別共通の「日付」 + 「写真」 field を統合** (LabeledDateRow 既存流用 + PhotoField 新規)
  2. **14 種別固有 form を WorkLogConfirm に実装** (Phase α 既存 3 種別 brush up + Phase β 残 10 種別)
  3. **`bonsai-detail` の FORM_TYPES を全 14 種別に拡張** (旧「3 種別 form + 10 種別即書込」 → 「14 種別すべて form 経由」)
  4. **wiring「目安期間」 → 「外し予定日 (date)」 に置換** (mockup 整合 + payload `scheduled_unwire_at` schema 整合)
  5. **複数作業機能を全廃** (Sess12 PR-G 導入を撤回、 user 真意「単一作業のみ」 反映)
- **適用範囲**: v1.x、 Free / Pro 両方、 iOS / Android (Web 利用なし、 影響なし)
- **Phase 分割**:
  - Phase α (PR-A1〜A5、 PR #623-#627): work-picker nav title + LabeledDateRow 統合 + PhotoField atom 新規 + pruning/wiring i18n 整合 + wiring date 化
  - Phase α' (PR-B1, B2、 PR #628-#629): 複数作業機能削除 + BulkLogConfirm 日付/写真統合
  - Phase α'' (PR-C、 PR #630): bonsai-detail FORM_TYPES 全 14 種別拡張
  - Phase β (PR-D1〜D6、 PR #631-#636): 残 10 種別 form mockup 整合
  - Phase γ (PR-E1〜E4、 別 ADR-0028): 葉の手当 (leaf_first_aid) 追加 + schema v16

---

## Decision Drivers（判断の軸：何を大事にした？）

- **Driver 1 (最重要)**: mockup 14 種別固有 form 整合 (業務プロ ◎ + Marcus ◎)
- **Driver 2**: ADR-0024 (modal 一本化) + ADR-0008 (Valibot payload) 整合維持
- **Driver 3**: 既存 Form atom (Sess14 確立) + photos.eventId (既存) 流用で実装コスト最小化
- **Driver 4**: user 真意「単一作業のみ」 反映で Sess12 PR-G 複数作業 logic を全廃 (簡略化)
- **Driver 5**: schema 変更を Phase γ のみに集約 (Phase α-β は schema 変更ゼロ、 リスク低減)

---

## Alternatives considered（他の案と却下理由）

### Option A: 段階的フル実装 (Phase α-γ、 案 X) ★採用

- 概要: 上記 Decision の通り
- 良い点: 4 ペルソナ全員 ○ 以上 (プロ ◎)、 mockup 完全整合、 PDF 出力 (F-10) との将来連携 ◎
- 悪い点: 25-40 PR、 2-3 ヶ月の大型工事
- 採用理由: 業務プロ × は致命的 (Sess16 議論 Q3 で確定)、 段階分割で工数管理可能

### Option B: 共通 form + 写真 + 日付のみ (案 Y)

- 概要: 14 種別共通 UI、 種別固有は payload optional 扱い
- 良い点: 5-8 PR、 1 ヶ月で完了、 シンプル
- 悪い点: プロ △ (数値項目欲しい)、 ペルソナ 1 名 △ で再検討必須
- 却下理由: Sess16 議論 Q3 で却下

### Option C: 現状維持 + watering 強化のみ (案 Z)

- 概要: BulkLogConfirm note のみ維持、 watering 量 segment のみ追加
- 良い点: 3-5 PR、 2 週で完了
- 悪い点: 業務プロ ✕ (業務記録に成らない)
- 却下理由: 1 ペルソナ ✕ で却下、 PDF 出力 (F-10) 詳細項目反映不可

---

## Consequences（結果：何が変わる？）

### Pro

- mockup 整合 (R-25 構造系 4 項目 全 ✅)、 業務プロ ◎ (100 本 / 日 詳細記録)
- PDF 出力 (F-10) との将来連携で詳細項目反映 (Pro 課金訴求、 ADR-0010 整合)
- Form atom 拡張で他 form (BonsaiBasic、 新規盆栽 modal 等) との pattern 統一強化
- Sess12 PR-G 複数作業 logic 撤回で codebase シンプル化 (net -287 行 in PR-B1)

### Con

- i18n keys 急増 (Phase α-β で 19 lang × 約 50 keys、 unused 612 → 655)
- 旧 logged events の payload は不変 (forward-only migration)、 表示時に互換性吸収必要 (wiring-list 等)
- Phase γ (leaf_first_aid) で schema v16 bump 必要、 DB migration リスクあり (idempotent 設計で吸収)

---

## Implementation（実装メモ）

### Form atom

- 新規: `src/components/form/PhotoField.tsx` (Sess16 PR-A3、 ~210 行、 controlled pattern、 ImagePicker + ↑↓ + ×削除 + caption 100 文字 + 「+ 追加」 max 10 枚)
- 再利用: `LabeledDateRow` (Sess14 PR-O)、 `LabeledNumberInput` / `LabeledTextInput` (Sess14)

### payload schema (ADR-0008 Valibot DU 整合)

| EventType                                    | mockup 固有入力                           | payload field                                                          |
| -------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------- |
| watering                                     | 量 segment                                | amount (string)                                                        |
| pruning                                      | 剪定タイプ multi + 切り落とした量 segment | parts (string[]) + amount (string)                                     |
| wiring                                       | 番手 + 巻く部位 + 外し予定日              | wire_size_mm (number) + body_part (string) + scheduled_unwire_at (ISO) |
| unwiring                                     | 外した部位                                | body_part (string)                                                     |
| repotting                                    | 鉢サイズ + 用土レシピ + 根の整理          | pot_size_cm (number) + soil_mix (string) + root_pruning (string)       |
| fertilizing                                  | 肥料の種類 + 銘柄・配合                   | kind (string) + amount (string)                                        |
| pest_control                                 | 目的 + 薬剤名 + 希釈倍率                  | target (string) + agent (string) + dilution_ratio (number)             |
| leaf_trimming/defoliation/deshoot/candle_cut | 範囲 segment                              | body_part (string、 共通 fallback)                                     |
| candle_cut                                   | + 本数                                    | count (number)                                                         |
| moss_care                                    | 作業内容                                  | action (string)                                                        |
| position_change                              | 移動先                                    | to (string)                                                            |

注: payloadValidator.ts の Valibot schema は v.object で **strict ではない** ため、 追加 prop は warning なく通過 (型保証は手動)。 厳格化は別 PR で。

### testID 命名規約

- `e2e_work_log_<field>` (例: `e2e_work_log_date` / `e2e_work_log_repot_pot_size`)
- `e2e_bulk_log_<field>` (BulkLogConfirm 側)
- `e2e_photo_field_<index>` / `e2e_photo_field_add` (PhotoField atom 内)

---

## Notes Amended (随時更新)

### 2026-05-20 Phase β 完遂時 update

Sess16 で Phase α + α' + α'' + β を 14 PR (#623-#636) で全 main merge 完遂。 残: Phase γ (PR-E1〜E4) + 実機 SS R-25 評価 + 文書化追加。
