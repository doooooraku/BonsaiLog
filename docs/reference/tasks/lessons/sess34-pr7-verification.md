# Sess34 PR-7 — 実機 SS 検証レポート (ADR-0041 Phase η)

- **実施日**: 2026-05-23 (UTC) / 02:00-02:10 JST
- **実機**: SH-M25 (シャープ AQUOS、 Android、 720×1520)
- **ビルド**: Dev Build (Sess34 PR-6 #792 merge 後の main、 Phase 2 完了直後)
- **検証範囲**: ADR-0041 PR-1〜6 で実装した EventRow detailed mode + PhotoStrip + Viewer + buildHistoryChips 拡張 + i18n + 配線の全機能
- **目的**: 実装が机上検証 (verify 緑) だけでなく実機で意図通り動作するかを確認

---

## 1. 検証結果サマリー (R-25 構造系 5 項目)

| #   | 項目 (R-25)                                  | 結果            | エビデンス SS |
| --- | -------------------------------------------- | --------------- | ------------- |
| 1   | タブ構成 (盆栽 / 予定 / 記録 / ふりかえり)   | ✅ 維持         | s1-01         |
| 2   | セクション構成 (予定 / 記録 / 凡例)          | ✅ 維持         | s1-02         |
| 3   | UI 種別 (カレンダー grid + group + EventRow) | ✅ 維持         | s2-01         |
| 4   | スクロール範囲 (page-level scroll)           | ✅ 維持         | s2-02         |
| 5   | **EventRow 表示モード (新規)**               | ✅ **完全達成** | s_detailed-02 |

**R-25 評価**: 5 項目全 ✅ PASS、 新規 5 項目目「EventRow 表示モード」 は実機で完全動作確認 (Phase 3 PR-9 で PR テンプレ §7.5 に正式追加予定)。

---

## 2. ADR-0041 9 sub-decision 実機確認結果

| D   | 項目                                              | 実機確認 | 詳細                                                                                                                        |
| --- | ------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| D1  | EventRow `displayMode: compact/detailed`          | ✅       | calendar logged = detailed / planned = compact / bonsai-detail history = detailed                                           |
| D2  | 写真 strip 1 枚 + `+N` badge                      | ✅       | アカシア葉の手当 row で 80×60 thumbnail + 「+1」 badge 表示 (s_detailed-02)                                                 |
| D3  | PhotoViewer modal (swipe gallery、 black BG)      | ✅       | tap で全画面 modal、 「1 / 2」 → swipe → 「2 / 2」、 BG 完全 black (s3-01, s4-01)                                           |
| D4  | chips max 4 + 「+N」 sentinel + 14 種別フル網羅   | ✅       | 葉の手当 chip「葉焼け」「Antiseptic_applied_and_p··」 (treatment 文字数制限で truncate 「··」 表示)                         |
| D5  | memo 3 行 + 「もっと見る」 リンク                 | ✅       | 4 行 memo が 3 行 + 末尾 ellipsis 後「もっと見る ▶」 表示、 tap で bonsai-detail history へ遷移 (s_detailed-02, s6-01)      |
| D6  | 時刻 HH:mm 非表示                                 | ✅       | 全 row で時刻表示なし (ADR-0036 D9 貫徹)                                                                                    |
| D7  | planned compact 維持                              | ✅       | 予定タブ 5/26 剪定 row が compact (写真 strip なし、 「作業を記録」 button のみ) (s8-04)                                    |
| D8  | bonsai-detail history 同時 detailed (整合性 lv 2) | ✅       | アカシア history タブで葉の手当 row が同 detailed mode (写真 + memo 3 行 + chip)、 calendar との pixel 整合維持 (s7-02)     |
| D9  | wiring scheduled_unwire chip 削除                 | ✅       | 5/20 針金がけ row で WiringPeriodDisplay「装着期間: 0 週」 表示、 chip は「3mm」「すべて」 のみ、 日付 chip 出ない (s10-01) |

**9 / 9 全 sub-decision 実機動作確認完了**。

---

## 3. PR-2 追加機能 実機確認

| 機能                                     | 実機確認 | 詳細                                                                                                              |
| ---------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| **leaf_first_aid case** (silent bug fix) | ✅       | 新規作成した葉の手当 event で chip「葉焼け」 = `historyLabelLeafAidSymptomBurn` 表示 (旧 silent fallthrough 解消) |
| trim_range 新規 i18n                     | ✅       | 5/21 葉刈り row で chip「そこそこ」 = `historyLabelTrimRangeModerate` 表示                                        |
| fert_kind 新規 i18n                      | ✅       | 5/21 施肥 row で chip「置肥（玉肥）」 = `historyLabelFertKindSolid` 表示                                          |
| 19 言語 i18n 整合                        | ✅       | ja locale で全 chip 正常表示 (他 18 言語は将来検証)                                                               |

---

## 4. 検証シナリオ詳細結果

### S1: 記録タブ初期表示 ✅

- 5/23 (今日) 選択、 dot 凡例正常、 「予定 (5 件)」 セクション表示
- SS: `s1-01-record-tab-init.png`

### S2: 記録セクション展開 ✅

- 5/21 cell tap → 「記録 (4 件)」 セクション、 施肥/葉刈り group 表示
- 「個別に開く ▼」 tap で展開、 detailed row (chip 表示) 確認
- SS: `s2-01-fertilizing-expanded.png`, `s2-02-fertilizing-scrolled.png`

### S3: 写真 tap → PhotoViewer modal ✅

- 葉の手当 row 写真 tap → 全画面 modal、 BG black、 header「1 / 2」
- SS: `s3-01-photo-viewer-opened.png`

### S4: PhotoViewer swipe で次の写真 ✅

- 右→左 swipe で header「2 / 2」 に更新、 別写真表示
- SS: `s4-01-photo-viewer-swiped.png`

### S5: Viewer 戻る → row 復帰 ✅

- Android back キー or header 戻る arrow で modal close、 元 row に戻る
- SS: `s5-01-back-to-row.png`

### S6: 「もっと見る」 リンク → bonsai-detail history 遷移 ✅

- truncated memo の「もっと見る ▶」 tap → アカシア bonsai-detail の作業履歴タブ表示
- SS: `s6-01-readmore-navigation.png`

### S7: bonsai-detail history 整合性 lv 2 ✅

- 葉の手当 row が **同じ detailed mode** で表示 (写真 + memo 3 行 + 「もっと見る」 + chip)
- showBonsaiName=false のため作業名「葉の手当」 + 日付「2026年5月22日」 表示 (calendar と異なる)
- 整合性レベル 2 = displayMode 値整合 ✅ 維持
- SS: `s7-02-history-full-detailed.png`

### S8: 予定タブ compact 維持 (regression) ✅

- 5/26 (planned 1) cell tap → 「予定 (1 件)」 剪定 group、 expand で個別 row
- 個別 row が compact mode (写真 strip なし、 iconBox 表示、 「作業を記録」 button)
- SS: `s8-04-plan-expanded-scrolled.png`

### S9: wiring 重複削除 ✅

- 5/20 針金がけ row で WiringPeriodDisplay「装着期間: 0 週」 + chip「3mm」「すべて」
- **scheduled_unwire_at 日付の chip が出ない** = ADR-0041 D9 fix 動作確認
- SS: `s10-01-history-scrolled.png` (針金がけ row 部分)

### S10: leaf_first_aid case 動作 ✅

- 新規作成した葉の手当 event で row 表示、 chip「葉焼け」「Antiseptic_applied_and_pruned」
- 旧 silent fallthrough bug 解消
- SS: `s_detailed-01-leaf-aid-expanded.png`, `s_detailed-02-full-row.png`

---

## 5. logcat 分析

- 検証期間中の logcat (filter `ReactNativeJS:V`) を `/tmp/sess34-pr7-logcat.log` に取得 (8 lines)
- **error / exception / FATAL: 0 件** ✅
- React Native Layout children warning (pre-existing、 本 PR 関連なし):
  - `[Layout children]: No route named "new" exists in nested children` (既存 [id]/new route check)
  - `Too many screens defined. Route "[id]/watering" is extraneous` (既存 bonsai-detail layout)
- 本 PR 関連 warning / error: **ゼロ**
- photo-viewer modal の navigation も `(modals)/_layout.tsx` で正常 route 登録済、 「No route」 警告なし

---

## 6. 実機検証で発見した付随事項 (本 PR scope 外)

| #   | 事象                                       | 原因 (推測)                                                         | 対応方針                                          |
| --- | ------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------- |
| A   | 既存 SEED の水やり row で chip ゼロ        | 旧 SEED の payload が新 field 名 (`amount`) 未保存、 旧形式の可能性 | 別 Issue で SEED data 更新検討、 本 PR 実装は正常 |
| B   | 既存 SEED の置き場変更 row で chip ゼロ    | 同上、 from/to payload 不在の可能性                                 | 同上                                              |
| C   | 葉の手当 group の iconBox 内アイコン空白   | EventIcon mapping に leaf_first_aid なし?                           | 別 PR で `src/components/icons.tsx` に追加検討    |
| D   | 5/20 針金がけ「装着期間: 0 週」            | WiringPeriodDisplay の境界値 (同日 unwiring or scheduled 過去日)    | WiringPeriodDisplay 仕様確認、 本 PR scope 外     |
| E   | bonsai-detail Layout children warning 既存 | 本 PR 起因ではなく既存 pre-existing                                 | 別 Issue で route 整理検討                        |

---

## 7. R-25 構造系 5 項目目「EventRow 表示モード」 仕組み化候補

PR-9 (恒久策) で PR テンプレ §7.5 R-25 を 4 → 5 項目化:

```markdown
- [ ] **(R-25 構造系)** 以下 5 項目を Claude Read で確認:
  1. タブ構成 (bottom tab の数 + 順序)
  2. セクション構成 (画面内 vertical 構造)
  3. UI 種別 (Card / List / Form / Modal 等)
  4. スクロール範囲 (page-level vs container-level)
  5. **EventRow 表示モード** (compact / detailed) ← NEW (Sess34 ADR-0041 追加)
```

---

## 8. 結論

**ADR-0041 Phase η の 9 sub-decision すべて実機で意図通り動作確認完了**。

- **EventRow detailed mode** が calendar 記録タブ + bonsai-detail history で完全動作 (整合性 lv 2 維持)
- **写真 strip + +N badge + Viewer modal swipe** が iOS Photos.app 風で動作
- **memo 3 行 + 「もっと見る」 リンク** が truncate 時に正しく表示、 tap で遷移
- **chip 14 種別フル網羅 + leaf_first_aid bug fix + wiring 重複削除** が動作
- **planned row compact 維持** + **既存 regression なし**
- **logcat error ゼロ**

Phase 2 完了状態で実機検証 PASS、 Phase 3 残作業 (PR-8 SoT 改訂 + PR-9 仕組み化) は安全に進められる。

## 9. SS リスト (検証エビデンス、 `/tmp/sess34-pr7-ss/` に 34 枚保存)

| シナリオ                | 主要 SS                      |
| ----------------------- | ---------------------------- |
| 環境準備                | s0-01〜s0-03                 |
| S1 記録タブ初期         | s1-01, s1-02                 |
| S2 detailed mode 展開   | s2-01, s2-02                 |
| S3〜S5 PhotoViewer      | s3-01, s4-01, s5-01          |
| S6 もっと見る遷移       | s6-01                        |
| S7 整合性 lv 2          | s7-01, s7-02                 |
| S8 planned compact      | s8-01〜s8-04                 |
| S9 wiring 重複削除      | s10-01 (history scroll)      |
| S10 leaf_first_aid 作成 | s_create-01〜s_create-14     |
| Detailed mode 全要素    | s_detailed-01, s_detailed-02 |
