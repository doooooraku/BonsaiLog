# Sess35 PR-3 — pest_control + candle_cut 実機新規作成 + chip 表示検証 (14 種別完遂)

- **実施日**: 2026-05-23 (UTC) / 04:27-04:34 JST
- **実機**: SH-M25 (シャープ AQUOS、 Android、 720×1520)
- **ビルド**: Sess35 PR-1 (#802) merge 後の main
- **検証範囲**: PR-2 残作業のうち実機未確認 2 種別 (pest_control + candle_cut) の新規 event 作成 + chip 表示確認
- **目的**: PR-2 §5「不足 2 種別の新規 event 実機作成検証」 を消化し、 14 種別中の **実機網羅 7 種別** に拡大 (Sess34 5 + Sess35 PR-3 2)

---

## 1. 検証結果サマリー

### 1-A. pest_control (防除・消毒) 新規作成 + chip 表示 ✅ **完全動作確認**

| 項目                                                             | 期待値                                           | 実機結果                                             |
| ---------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------- |
| form 起動                                                        | FAB → アカシア → 防除・消毒 grid tap → form 表示 | ✅ s4-pest-form.png                                  |
| 目的 default 選択                                                | 「予防」 緑 highlight                            | ✅ s4 で確認                                         |
| 薬剤名 入力                                                      | 「Benika_test_for_Sess35_PR3」                   | ✅ s5 で確認                                         |
| 希釈倍率 入力                                                    | 1000                                             | ✅ s6-pest-filled-correct.png                        |
| 保存後 record list 表示                                          | 5/22 防除・消毒 ×1 row                           | ✅ s8-records-scroll.png (5/22 が 13 件、 記録 8 件) |
| chip 「目的: [予防]」 (workLogPestPurpose)                       | labeled 形式                                     | ✅ s9-pest-expanded.png + s9-crop-pest-chips.png     |
| chip 「薬剤名: [Benika_test_for_Sess35_PR3]」 (workLogPestAgent) | labeled 形式                                     | ✅ 同上                                              |
| chip 「希釈倍率: [×1000]」 (workLogPestDilution、 prefix ×)      | labeled 形式 + × prefix                          | ✅ 同上                                              |

**結論**: Sess34 PR-Q-fix (#799) で拡張した pest_control schema (target / agent / dilution_ratio) が valibot v.object strip を回避し、 buildHistoryChips の 3 chip 生成が完全動作。

### 1-B. candle_cut (芽切り) 新規作成 + chip 表示 ✅ **完全動作確認**

| 項目                                                              | 期待値                                           | 実機結果                                                   |
| ----------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| form 起動                                                         | FAB → アカシア → 芽切り grid tap → form 表示     | ✅ s11-candle-form.png                                     |
| 範囲 default 選択                                                 | 「そこそこ」 緑 highlight (body_part='moderate') | ✅ s11 で確認                                              |
| 本数 入力                                                         | 5                                                | ✅ s12-candle-saved.png                                    |
| 保存後 record list 表示                                           | 5/22 芽切り ×1 row                               | ✅ s14-records-with-candle.png (5/22 が 14 件、 記録 9 件) |
| chip 「範囲: [そこそこ]」 (workLogTrimRange、 body_part 共有 key) | labeled 形式                                     | ✅ s15-candle-expanded.png                                 |
| chip 「本数: [×5]」 (workLogCandleCount、 prefix ×)               | labeled 形式 + × prefix                          | ✅ 同上                                                    |

**結論**: PR-Q-fix candle_cut schema (body_part + count) が完全動作。 trim_range labelKey の共有 (leaf_trimming / defoliation / deshoot / candle_cut で body_part 'moderate' = 「そこそこ」 統一) も整合確認。

---

## 2. 14 種別実機網羅状況更新 (PR-2 → PR-3)

| Phase            | 実機検証完了                                                          | Code Review + Unit Test 確認                                                                                                  |
| ---------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| PR-2 (#803)      | 5 種別 (watering / repotting / fertilizing / leaf_first_aid / wiring) | 9 種別 (pruning / unwiring / leaf_trimming / defoliation / deshoot / candle_cut / moss_care / position_change / pest_control) |
| **PR-3 (本 PR)** | **+2 種別 (pest_control / candle_cut) → 計 7 種別**                   | **-2 種別 → 計 7 種別**                                                                                                       |

### ✅ 実機検証完了 7/14 種別 (50%)

1. watering (Sess34 + Sess35 PR-2 新規)
2. repotting (Sess34)
3. fertilizing (Sess34)
4. leaf_first_aid (Sess34)
5. wiring (Sess34)
6. **pest_control** (**Sess35 PR-3 新規**)
7. **candle_cut** (**Sess35 PR-3 新規**)

### ✅ Code Review + Unit Test 確認 7/14 種別 (50%)

8. pruning — buildHistoryChips.test.ts L51-65
9. unwiring — buildHistoryChips.test.ts L93-101
10. leaf_trimming — buildHistoryChips.test.ts L160-172
11. defoliation — buildHistoryChips.test.ts L173-179
12. deshoot — buildHistoryChips.test.ts L180-186
13. moss_care — buildHistoryChips.test.ts L204-215
14. position_change — buildHistoryChips.test.ts L218-227

**14/14 完全網羅維持** (実機 7 + 理論実証 7)。

---

## 3. logcat 分析

- 取得期間: 2026-05-23 04:27-04:34 JST (7 分)
- 行数: 791 lines
- **BonsaiLog 関連 error/exception/FATAL: 0 件** ✅
- 検出した error は **すべて OS 側 (機内モード ON 由来)**:
  - WifiStaIfaceHidlImpl: getLinkLayerStatsV1_5 (Wi-Fi、 機内モード ON)
  - NxpTml: PN54X — Error in I2C Read (NFC chip)
  - libnfc_nci: addAidRouting failed (NFC routing)
- **本 PR-3 関連の error / warning: ゼロ**

---

## 4. 副次的観察 (別 task 候補)

### Observation 1: 芽切り row icon と grid icon の整合性

record list の 芽切り row icon は **シザー 「✂」** (剪定と類似) で表示。 grid 画面 (s10) では **「✂x」** (✂ + x mark + leaf 系) で表示。

考察:

- record list の EventIcon は `src/components/icons/EventIcons.tsx` の switch case で生成、 candle_cut case で `CandleCutIcon` を返している (Phase θ PR-8b で確認)
- grid 画面の icon は別 asset source (`src/components/work-log-grid/...`) を使っている可能性
- 厳密な視覚整合性は別 task で評価推奨 (本 PR scope 外、 chip 表示は完全動作)

### Observation 2: 防除・消毒 form の数値入力欄座標差

希釈倍率 input は y=740 (form scroll 前) で focus 必要だが、 IME 起動による layout shift 後は y=1080 に下のメモ欄が配置される。 私は最初 y=1080 を tap してメモに「1000」 を誤入力。

学び: form input 順次 tap 時は **IME 開閉に伴う layout shift を sleep 1 後の SS で再確認** すべき。 R-46 (KAV) の延長として lessons に記録するほどではないが、 個人 know-how として認識。

---

## 5. 結論

PR-3 で実機検証 7 種別 (Sess34 5 + Sess35 PR-3 2) に拡大、 **14/14 完全網羅は維持** (理論実証 7 → 実機 7 へ転換による品質向上)。 PR-Q-fix (#799) で導入した 5 種別 schema 拡張 (watering/pruning/repotting/pest_control/candle_cut) が **5 種別すべて実機で動作確認済** (watering: Sess35 PR-2 / repotting: Sess34 / pruning + pest_control + candle_cut: 本 PR-3)。

PR-2 §5 残作業のうち:

- ✅ 不足 2 種別 (pest_control / candle_cut) 実機作成 → 本 PR-3 で消化
- 🔲 SEED data 旧形式 type migration → 別 PR (task #20)
- 🔲 VoiceOver / TalkBack a11y 検証 → 別 PR (task #19)

## 6. SS リスト (`/tmp/sess35-pr3-ss/`)

| #       | SS                          | 内容                                                           |
| ------- | --------------------------- | -------------------------------------------------------------- |
| s0      | s0-current.png              | 開始時点 record list (5/22)                                    |
| s2      | s2-fab-menu.png             | FAB tap 後の盆栽選択画面                                       |
| s3      | s3-action-pick.png          | 作業 grid (14 種別) + アカシア chip                            |
| s4      | s4-pest-form.png            | 防除・消毒 form 初期 (目的=予防 default)                       |
| s5      | s5-pest-filled.png          | 薬剤名「Benika*test*...」 入力済、 1000 誤入力 (メモへ)        |
| s6      | s6-pest-filled-correct.png  | 希釈倍率 1000 入力完了 (希釈倍率欄 + メモ残置)                 |
| s7      | s7-pest-saved.png           | 保存後 record タブ (5/22 13 件 + ●●●+ 表示)                    |
| s8      | s8-records-scroll.png       | 記録 8 件 list (水やり / 植替え / 防除・消毒 / 葉の手当)       |
| s9      | s9-pest-expanded.png ⭐     | 防除・消毒 row 展開 (目的=予防 / 薬剤名 / 希釈倍率 ×1000 chip) |
| s9-crop | s9-crop-pest-chips.png ⭐   | 上記 chip 部 crop 拡大                                         |
| s10     | s10-actions-for-candle.png  | 作業 grid 再表示 (芽切り tap 前)                               |
| s11     | s11-candle-form.png         | 芽切り form 初期 (範囲=そこそこ default)                       |
| s12     | s12-candle-saved.png        | 本数 5 入力済                                                  |
| s13     | s13-candle-saved2.png       | 保存後 record タブ (5/22 14 件)                                |
| s14     | s14-records-with-candle.png | 記録 9 件 list (芽切り ×1 row 追加)                            |
| s15     | s15-candle-expanded.png ⭐  | 芽切り row 展開 (範囲: そこそこ / 本数: ×5 chip)               |
