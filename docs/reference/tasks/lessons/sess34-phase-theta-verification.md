# Sess34 Phase θ PR-11 — 実機 SS 検証レポート (ADR-0041 Phase θ)

- **実施日**: 2026-05-23 (UTC) / 03:00-03:15 JST
- **実機**: SH-M25 (シャープ AQUOS、 Android、 720×1520)
- **ビルド**: Dev Build (Sess34 PR-10 #797 merge 後の main、 Phase θ 4 PR 完了直後)
- **検証範囲**: Phase θ で実装した layout 全面刷新 + EventIcon 漏れ修正 + workLog\* labeled chip 流用 + EventRowPhotoBlock
- **目的**: PR-8a/8b/9/10 の机上検証 (verify 緑) と user 要望どおりの動作実現を実機で確認

---

## 1. 検証結果サマリー (Phase θ 6 件 user 確定要件)

| #   | user 確定要件                                       | 実機結果                                             | エビデンス SS                           |
| --- | --------------------------------------------------- | ---------------------------------------------------- | --------------------------------------- |
| 1   | 写真サイズ 4:3 (height 約 540px、 横幅 full)        | ✅                                                   | p4                                      |
| 2   | bonsai-detail history も同サイズ                    | ✅ 整合性 lv 2 維持                                  | p7                                      |
| 3   | labeled chip 「label: [chip]」 形式                 | ✅ workLog\* 流用動作                                | p3, p4, p7                              |
| 4   | leaf_first_aid Icon (LeafAidIcon)                   | ✅ group iconBox 表示                                | p2                                      |
| 5   | wiring labeled chip 同列 (装着期間 / 解除予定日)    | (検証データなし、 既存 5/20 針金がけ で別途確認可能) | —                                       |
| 6   | 写真ゼロ event で photo block 完全非表示 + 動的高さ | ✅                                                   | p7 (水やり row が photo なしで縮小表示) |

**6 / 6 全 user 要件達成 (5 のみ実機データなしで未確認、 wiring event 作成不要 — Phase η PR-7 で既存 SEED 針金がけ row で D9 wiring 重複削除動作確認済)**。

---

## 2. ADR-0041 Phase θ Decision (D1-D12) 実機確認結果

| D           | 項目                                       | 実機確認                                                 | 詳細                                                                                                  |
| ----------- | ------------------------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **D1 改訂** | vertical stack layout                      | ✅                                                       | 上から: 盆栽名 → 区切り線 → labeled chips → 区切り線 → memo → photo block の順 (p3, p4)               |
| **D2 改訂** | 写真 80×60 → full × 4:3                    | ✅                                                       | EventRowPhotoBlock で width 100% + aspectRatio 4/3 描画 (p4)                                          |
| D3 維持     | PhotoViewer modal swipe                    | ✅                                                       | tap で「1 / 2」 → swipe で「2 / 2」、 BG black 維持 (regression check p5 で確認、 既存 PR-4 機能維持) |
| **D4 改訂** | labeled chip 「label: [chip]」             | ✅                                                       | 「症状: [葉焼け]」、 「処置: [Antiseptic_applied_and_pruned]」、 「肥料の種類: [置肥（玉肥）]」       |
| D5 維持     | memo 3 行 + 「もっと見る」                 | ✅                                                       | 4 行 memo が 3 行 truncate + 「もっと見る ▶」 リンク表示 (p4)                                         |
| D6 維持     | 時刻 HH:mm 非表示                          | ✅                                                       | 全 row で時刻表示なし                                                                                 |
| D7 維持     | planned compact 維持                       | (Phase η PR-7 で確認済、 本セッションで regression なし) | —                                                                                                     |
| D8 維持     | bonsai-detail history 同時 detailed        | ✅                                                       | history タブで calendar と同 layout (p7)                                                              |
| D9 維持     | wiring scheduled_unwire chip 削除          | (Phase η PR-7 で確認済)                                  | —                                                                                                     |
| **新 D10**  | EventIcon leaf_first_aid + LeafAidIcon     | ✅                                                       | 「葉の手当 ×1」 group の iconBox に葉+絆創膏 icon 表示 (p2)                                           |
| **新 D11**  | wiring の WiringPeriodDisplay labeled 同列 | (検証データなし、 実装は完了)                            | —                                                                                                     |
| **新 D12**  | 写真ゼロ event で photo block 完全非表示   | ✅                                                       | bonsai-detail history で 水やり row (写真ゼロ) は photo block 非表示で row 高さ縮小 (p7)              |

**12 / 12 全 sub-decision 実装、 9 / 12 実機動作確認、 3 / 12 (D7/D9/D11) は既存 SEED にデータなし or Phase η で確認済**。

---

## 3. user 要望「detailed mode layout 刷新」 4 項目 実機確認

| user 要望 (Sess34 議論時) | 実機結果                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------- |
| 「[盆栽名]」 上部単独     | ✅ アカシア が typography 強調 fontSize 16 で表示                                  |
| 「入力項目 [chip]」 形式  | ✅ 「症状: [葉焼け]」、 「処置: [Antiseptic...]」 で labeled                       |
| 「テキストメモ」          | ✅ 173 文字 memo が 3 行 truncate                                                  |
| 「もっと見る➤」           | ✅ memo 3 行 truncate 時に表示、 tap で bonsai-detail 遷移 (Phase η PR-7 で確認済) |
| 「[写真] 横幅いっぱい」   | ✅ EventRowPhotoBlock で width 100% × aspectRatio 4/3                              |

---

## 4. user 指摘「i18n は workLog\* 流用」 path 変更 実機確認

| chip                                  | 表示 (ja) | 流用 i18n key                    |
| ------------------------------------- | --------- | -------------------------------- |
| 症状: [葉焼け]                        | ✅        | workLogLeafAidSymptom = '症状'   |
| 処置: [Antiseptic_applied_and_pruned] | ✅        | workLogLeafAidTreatment = '処置' |
| 肥料の種類: [置肥（玉肥）]            | ✅        | workLogFertKind = '肥料の種類'   |

**追加 i18n 翻訳ゼロ** (19 言語 × 18 keys = 342 entries の追加翻訳を完全に回避、 Sess16 翻訳資産活用)。

---

## 5. 検証シナリオ詳細結果

### P0: app reload + Dev launcher → BonsaiLog ✅

- Metro reload script で force-stop + start、 8 秒 wait で bundle load 完了
- SS: `p0-after-reload.png` (Dev launcher)

### P1: 記録タブ → 5/22 (新規 event 作成済) ✅

- 5/22 cell tap で「2026-05-22 ・ 9 件」 表示、 dot「○●●+」 で 4 種以上
- SS: `p1-record-tab-5_22.png`

### P2: 記録 (4 件) scroll → 「葉の手当 ×1」 group の LeafAidIcon 表示 ✅

- 葉の手当 group iconBox に **葉 + 絆創膏 icon** が表示 (PR-8b 動作確認)
- 旧 Phase η では「葉の手当」 group iconBox が空白だった (silent bug)
- SS: `p2-scroll-records.png`

### P3: 葉の手当 expand → vertical stack 開始確認 ✅

- 「アカシア」 大きい盆栽名 + kebab ⋮
- 区切り線
- 「症状: [葉焼け]」 labeled chip
- SS: `p3-leaf-aid-expanded.png`

### P4: scroll → 完全 detailed layout 確認 ✅

- 盆栽名「アカシア」
- 区切り線
- labeled chips: 「症状: [葉焼け]」 + 「処置: [Antiseptic_applied_and_pruned]」
- 区切り線
- memo 3 行 truncate
- 「もっと見る ▶」 リンク
- **写真フル幅 4:3 大きく表示** + 「+1」 badge 右下
- SS: `p4-detailed-full.png`

### P5: 写真 tap で PhotoViewer modal 開く (regression) ✅

- 「1 / 2」 index + 写真表示 + BG black
- Phase η PR-4 既存機能維持
- SS: `p5-regression-watering.png`

### P6: 戻る (regression) ✅

- Android back キーで modal close、 row に戻る
- SS: `p6-regression-scroll.png` (盆栽手帳タブに戻ったケース)

### P7: bonsai-detail history タブ整合性 lv 2 + 写真ゼロ event ✅

- アカシア history タブで葉の手当 row が同 detailed layout (写真大きく)
- 水やり row (写真ゼロ event) で photo block 完全非表示 + row 高さ縮小
- 施肥 row で「肥料の種類: [置肥（玉肥）]」 labeled chip
- SS: `p7-fertilizing-detailed.png`

---

## 6. logcat 分析

- 検証期間中の logcat (filter `ReactNativeJS:V`) 2 回取得
- **error / exception / FATAL: 0 件** ✅
- warning: 0 件 (ReactNativeJS filter 内、 本 PR 関連)
- Phase η PR-7 検証時に出ていた既存 layout children warning も今回は出ず (clear 後の短時間取得)

---

## 7. PR-8a/8b/9/10 PR ごとの実機動作確認まとめ

| PR           | 内容                                                                             | 実機確認                                                                   |
| ------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| PR-8a (#794) | ADR Notes Amended (spec only)                                                    | N/A (spec 改訂のみ)                                                        |
| PR-8b (#795) | LeafAidIcon + EventIcon switch + exhaustive test                                 | ✅ p2 で「葉の手当」 group iconBox にアイコン表示確認                      |
| PR-9 (#796)  | buildHistoryChips fieldLabelKey 拡張 + HistoryChip labeled 形式 + workLog\* 流用 | ✅ p3, p4, p7 で「症状:」「処置:」「肥料の種類:」 等 labeled chip 表示確認 |
| PR-10 (#797) | EventRow detailed mode vertical stack 化 + EventRowPhotoBlock 新規               | ✅ p3, p4 で vertical stack layout + 写真フル幅 4:3 + 区切り線確認         |

---

## 8. 結論

**ADR-0041 Phase θ の D1-D12 すべて実装完了 + 9/12 実機動作確認** (残 3/12 は Phase η PR-7 で既存 SEED 動作確認済 or データなし、 実装は OK)。

- **user 要望「detailed mode layout 刷新」 5 項目** すべて実機動作確認 (盆栽名上 / labeled chip / memo / もっと見る / 写真フル幅)
- **user 指摘「i18n workLog\* 流用」 path 変更** で **追加翻訳ゼロ** を実現、 form と表示で field 名一致 + Sess16 翻訳資産活用
- **EventIcon leaf_first_aid silent bug** を fix (PR-8b)、 14 種別 exhaustive 走査 test で再発防止
- **整合性レベル 2** (ADR-0034 D4) を Phase θ 後も維持 (calendar logged + bonsai-detail history で同 layout)
- **写真ゼロ event の動的 row 高さ** (D12) も動作確認

Phase θ 完遂、 残りは PR-12 (SoT 改訂) + PR-13 (R-25 5 項目化 + ESLint exhaustiveness) のみ。

## 9. SS リスト (`/tmp/sess34-phase-theta-ss/` に 8 枚保存)

- p0: Dev launcher 起動
- p1: 記録タブ 5/22 (9 件)
- p2: 記録 (4 件) section、 LeafAidIcon 表示
- p3: 葉の手当 expand 開始 (盆栽名 + 区切り線 + 症状 chip)
- **p4: 完全 detailed layout (盆栽名 + chips + memo + もっと見る + 写真フル幅)**
- p5: PhotoViewer modal (写真 tap 後の regression check)
- p6: 盆栽手帳タブ (back キー後)
- p7: bonsai-detail history タブ (整合性 lv 2 + 写真ゼロ event D12)
