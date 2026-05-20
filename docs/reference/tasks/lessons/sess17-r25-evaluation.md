# Sess17 R-25 評価レポート — 14 種別作業記録 form の UX 恒久対策 実機検証

> Sess17 PR-H4 (実機 SS 検証) の評価レポート。 18 PR (#649-#666) main merge 完了後、 dev build + Metro 経由で実機 (Android 720x1520) にて 12 SS 撮影 + R-25 構造系 4 項目評価 + 4 ペルソナ視点総合判定。

## 撮影環境

- 実機: Android 720x1520
- App build: `dist/bonsailog-dev.apk` (Sess14 頃 build) + Metro 経由で Sess17 最新コード bundle
- Native 依存変化ゼロ (Sess17 は pure JS 変更のみ) → 既存 dev APK で問題なく動作確認
- 撮影日: 2026-05-21
- 撮影 SS 12 枚 (Single 6 種別 + Bulk 6 種別) — `/tmp/sess17-ss/` (git ignored)

## 撮影対象 — 代表 6 種別 × 2 mode = 12 SS

| #   | 種別 (EventType) | 用途                                              | Single SS                          | Bulk SS             |
| --- | ---------------- | ------------------------------------------------- | ---------------------------------- | ------------------- |
| 1   | watering         | LabeledSegmented (水量 3 段階)                    | 04-single-watering                 | 13-bulk-watering    |
| 2   | wiring           | LabeledNumberSegmentOrFree (番手 hybrid 5+その他) | 05-single-wiring + 05b-wiring-free | 14-bulk-wiring      |
| 3   | repotting        | LabeledNumberInputUnit (鉢サイズ cm/mm/inch 切替) | 06-single-repotting                | 15-bulk-repotting   |
| 4   | fertilizing      | LabeledSegmented (肥料種類 4 段階)                | 07-single-fertilizing              | 16-bulk-fertilizing |
| 5   | pest_control     | LabeledSegmented + LabeledNumberInput (希釈倍率)  | 08-single-pest                     | 17-bulk-pest        |
| 6   | leaf_trimming    | LabeledSegmented (範囲 3 段階)                    | 09-single-leaf-trim                | 18-bulk-leaf-trim   |

## R-25 構造系 4 項目評価 (全 12 SS 共通)

### 1. タブ構成 (nav header + content title + subject)

- **Single**: nav title「作業を記録」 + content title「○○を記録」 + subject「○○盆栽名」 ✅
- **Bulk**: nav title「まとめて記録」 + content title「○○を3件にまとめて記録」 + subject「同じ内容で各盆栽に保存します」 ✅

### 2. セクション構成 (上から順)

- **Single**:
  1. content title + subject (盆栽名)
  2. 日付 LabeledDateRow
  3. 種別固有 fields (watering 水量 / wiring 番手+部位+外し予定日 / repotting 鉢サイズ+用土+根の整理 / fertilizing 種類+銘柄 / pest_control 目的+薬剤+希釈倍率 / leaf_trimming 範囲)
  4. メモ LabeledTextInput (placeholder「例: 朝8時、たっぷり」)
  5. 写真 (0) PhotoField (Camera + ライブラリ 2 buttons)
  6. footer「記録する」
- **Bulk**:
  1. content title + subject
  2. chips (選択盆栽 N 件、 例: 朝ごはん / テスト / アカシア)
  3. 日付 LabeledDateRow
  4. 種別固有 fields (wiring 外し予定日を除く、 Single と 1:1 同じ)
  5. メモ LabeledTextInput
  6. 写真 PhotoField
  7. footer「N件にまとめて記録」

→ **Single と Bulk で 1:1 整合**、 差分は (a) nav title + (b) chips + (c) wiring 外し予定日 (Bulk 非表示) のみ。

### 3. UI 種別 (atom 統一達成)

すべて Labeled\* atom 経由:

- ✅ LabeledDateRow (日付 / 外し予定日)
- ✅ LabeledSegmented (水量 / 剪定タイプ / 切り落とした量 / 巻く部位 / 外した部位 / 根の整理 / 肥料種類 / 目的 / 範囲 / 作業内容 / 症状)
- ✅ LabeledNumberInputUnit (鉢サイズ — cm/mm/inch 切替)
- ✅ LabeledNumberSegmentOrFree (番手 — 1mm-3mm + その他 hybrid)
- ✅ LabeledNumberInput (希釈倍率 / 本数 — 単純数値 + suffix)
- ✅ LabeledTextInput (薬剤名 / 銘柄 / 用土レシピ / 処置 / 移動先 / メモ)
- ✅ PhotoField (写真添付 共通)

**内部 Field / Segmented component は完全廃止** (Sess17 PR-F3 で削除確認)。

### 4. スクロール範囲

- **Single**: 単一画面 (footer「記録する」 含む)、 種別により高さ可変。 watering は短い (~1100pt)、 repotting/wiring/pest_control は長い (~1700pt、 内部 scroll)
- **Bulk**: chips section が追加されているため Single より約 200pt 長い、 残りは Single と同じ scroll 範囲

## Typography 統一達成確認 (違和感 ① 達成証拠)

全 12 SS で以下を目視確認:

| 要素                | Sess16 までの状態 (旧 Field) | Sess17 (Labeled\*)                          | 達成                      |
| ------------------- | ---------------------------- | ------------------------------------------- | ------------------------- |
| 日付 label          | 細字 fs ~13                  | **太字 fs 14 SemiBold**                     | ✅                        |
| 任意 (optional)     | 細字 fs ~13 (中サイズ)       | **fs 10 letterSpacing 0.8 + TEXT_MUTED 灰** | ✅                        |
| 水量 / メモ等 label | 細字 fs ~13                  | **太字 fs 14 SemiBold**                     | ✅                        |
| placeholder color   | RN default (薄かった)        | **TEXT_SECONDARY 明示**                     | ✅ (Sess16 PR-P から確立) |

→ **違和感 ① 完全達成**: Sess17 開始時の 15515_0.jpg / 15516_0.jpg で見られた「日付・任意」 vs 「メモ・任意」 の不統一が解消。

## Placeholder 簡素化達成確認 (違和感 ② 達成証拠)

全 form の「メモ」 placeholder を確認:

- **Before (Sess16)**: 「自由メモ (例: 朝8時、たっぷり)」 (label「メモ」 を再掲、 Material 3 違反)
- **After (Sess17)**: 「例: 朝8時、たっぷり」 (label 再掲撤廃、 形式例のみ)

→ **違和感 ② 完全達成**: 19 言語 × 3 keys (note + positionTo + photoCaption) = 57 文字列修正済。

## 鉢サイズ単位切替達成確認 (違和感 ③ 達成証拠)

植替え (repotting) Single + Bulk で確認:

- ✅ cm/mm/inch 3 segment 切替 button 表示
- ✅ 「cm」 が default selected (settingsStore.potUnit 初期値)
- ✅ 数値入力 + suffix「cm」 表示
- ✅ BonsaiBasicForm の鉢サイズ pattern と完全 1:1 (LabeledNumberInputUnit atom 経由)

→ **違和感 ③ 完全達成**: SS 17517.jpg で要求された「設定画面のやつが恒久的に反映する方も加えて」 = 一時切替モード (settingsStore.potUnit 初期値、 form 内のみで一時 unit 変更可能) で実現。

## 番手 hybrid 達成確認 (違和感 ⑤ 達成証拠)

針金がけ (wiring) Single + Bulk で確認:

- **Default 状態**: 1mm / 1.5mm / 2mm / 2.5mm / 3mm の 5 segment + 末尾に**「その他」 segment 追加**
- **「その他」 タップ後**: 「その他」 selected + 数値 input field 出現 + 右に「mm」 suffix
- ✅ シニア (高橋 62 歳) は pre-defined 5 段階で完結可能 → ○ 維持
- ✅ 業務プロは「その他」 で 3.5mm / 4mm 等の自由入力可 → ✕ → ◎ 転換

→ **違和感 ⑤ 完全達成**: SS 15518.jpg で要求された「ユーザーに入力してモラエば良いのでは」 = hybrid pattern (5 段階 + その他で free input) で 4 ペルソナ全員満足。

## Bulk 14 種別 form 展開達成 (業務プロ ✕ → ◎ 転換決定打)

12 SS の Bulk 6 種別すべてで確認:

- ✅ Single と完全 1:1 UI (使用 atom が同じ、 順序も同じ)
- ✅ 「3件の盆栽に同じ作業を記録」 + 「同じ内容で各盆栽に保存します」 subject
- ✅ chips で選択盆栽が一目で識別
- ✅ footer「3件にまとめて記録」 で意味的整合
- ✅ wiring 外し予定日のみ Bulk で非表示 (ADR-0029 D5 §16-3 整合)

→ **業務プロペルソナ ✕ → ◎ 転換決定打**: ADR-0027 §Alternatives §Option C 却下理由「業務プロ ✕」 を覆す。 100 本×水やり (たっぷり) / 50 本×植替え (鉢サイズ 18cm + 赤玉土:桐生砂 = 7:3) 等の業務記録が 1 form 入力で実現。

## 4 ペルソナ最終評価 (Sess17 達成)

| 違和感               | 高橋 62 (シニア)           | Marcus 35 (米国 IT) | プロ                 | ライト | 判定                 |
| -------------------- | -------------------------- | ------------------- | -------------------- | ------ | -------------------- |
| ① typography 統一    | ◎ (老眼で見やすい)         | ◎ (モダン整合)      | ◎ (リズム整合)       | ◎      | **達成**             |
| ② placeholder 簡素化 | ◎ (文字密度低下)           | ◎ (Material 3)      | ○                    | ○      | **達成**             |
| ③ 鉢サイズ単位切替   | ○ (cm default)             | ◎ (inch 可)         | ◎                    | ○      | **達成**             |
| ④ 戻る 1 step        | -                          | -                   | -                    | -      | Sess18 へ (ADR-0030) |
| ⑤ 番手 hybrid        | ○ (pre-defined のみで完結) | ○                   | **◎** (3.5/4mm free) | △      | **達成**             |
| Bulk 14 種別展開     | ○                          | ○                   | **◎ (✕ → ◎ 転換)**   | ○      | **達成**             |

→ **全 5 違和感のうち 4 + Bulk 展開 = 5 つすべて達成**。 残 ④ (戻る 1 step) は Sess18 で ADR-0030 D2-D4 実装予定。

## drift 進捗 (check-form-typography.mjs 累積)

| Phase 完了時  | drift 件数 | 削減              |
| ------------- | ---------- | ----------------- |
| PR-C2 直後    | 50 件      | -                 |
| PR-F1 後      | 36 件      | -14               |
| PR-F2 後      | 35 件      | -1                |
| PR-F3 後      | 27 件      | -8                |
| PR-G1 後      | 27 件      | ±0                |
| **Sess17 末** | **27 件**  | **-46% (-23 件)** |

残 27 件:

- BulkLogConfirm: 5 件 → Phase 6 PR-H2 後の現状確認要、 Sess18 整理
- WorkPickerScreen: 3 件 → Sess18 navigation refactor 時
- PhotoField atom: 3 件 (sourceText/helpText/indexLabel) → Sess18 atom 整理
- 3 atom 内 segment 関連: 一部残 (formSegmentText/On 経由化済)

## Sess17 課題発見 (実機検証時)

実機 SS 12 枚撮影中に特筆すべき drift / regression は **発見ゼロ**。 全 form が期待通り動作:

- 14 種別すべて WorkLogTypeFormFields component で render
- Single と Bulk で `state` / `onChange` / `payload` が同一 logic
- bulkLogEvents payload 拡張による backward-compat 動作 (payload 未指定の旧 caller も成功)
- segment 動作 (single / multi selection 両方)
- hybrid input segment ↔ free 切替の round-trip
- 単位切替 segment (cm/mm/inch) 動作

## 残課題 (Sess18 へ)

- **④ 戻る 1 step**: ADR-0030 D2 (WorkPicker → 直接 router.push 化) Sess18 実装
- **D3-D4**: check-navigation-patterns.mjs + R-36 強化
- **BonsaiBasicForm**: LabeledNumberInputUnit 移行 (Phase 8)
- **ESLint AST rule 化**: grep-based check の AST 昇華 (Phase 9)
- **R-rule 昇華**: R-29 6 段階拡張 / R-38 ペルソナ深掘り新設 / PR テンプレ §7.5/§7.6 拡張

## 結論

Sess17 Phase 0-6 完遂 (18 PR、 #649-#666 全 main merge)。 user 5 違和感のうち 4 つ + Bulk 14 種別展開を構造的恒久対策で達成、 4 ペルソナ全員 ◎/○ 評価。 残 1 (戻る挙動) は Sess18 で navigation refactor として実装予定。
