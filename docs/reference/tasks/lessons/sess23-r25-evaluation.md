# Sess23 R-25 評価レポート — Phase ε 作業カレンダー (タブ名 revert + 削除 + 予定→記録 atomic 変換 + ふりかえり card 完全 revert)

> Sess23 (2026-05-21): user 7 議題 + 2 追加事項を **11 PR (#719-#729)** で実装、 全 main merge 完了。 ADR-0035 起票 + R-43 (atomic transaction) 構造防止仕組み化 + functional_spec §23 改訂 + ふりかえり「カレンダー」 card 完全削除 (Sess22 PR-4-1 #714 完全 revert) で **user 真意「予定→記録の二度手間排除」 + 「タブ名は予定」 + 「シンプル明快」 を構造的に達成**。

## Sess23 議論経緯 (6 専門家チーム + フラット視点 + 4 ペルソナ)

### 議論 Step 0-5 + 2 追加事項

| Step   | 内容                                                   | 結果                                                                                                                                       |
| ------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Step 0 | プロジェクト全体理解                                   | Sess22 Phase δ 達成済 (#705-#718)、 ADR-0034 + R-42 + functional_spec §23 整備済                                                           |
| Step 1 | 議題理解 + 関連ファイル 8 個 Read + 実機 SS 取得       | 7 議題 (タブ revert / 明日 default / 個別削除 / label / dot 順序 / 記録タブ revert / 変換動線)                                             |
| Step 2 | 表面化していない問題 7 件抽出                          | atomic transaction R-43 必須 / F-16 ゴースト通知防止 / bonsai-detail 整合 / 過去日 FAB / Maestro testID / i18n 旧 keys 削除 / 記録タブ慣性 |
| Step 3 | 6 専門家 + フラット視点議論 + 4 ペルソナ評価           | 全 7 議題 + 2 追加で ✕ なし (D2 ライト △ は記録 tab=今日 default で吸収)                                                                   |
| Step 4 | アプローチ比較 + Q4 文言 + Q6 ふりかえり card 削除確定 | Q4: 「予定 {count} 件を記録に変更しました」 / Q6: ふりかえり card 完全削除 (二重動線排除)                                                  |
| Step 5 | user 全 A 承認 → /plan → 14 PR plan → 11 PR で完遂     | R-17 4 段階遵守、 PR-2-1/2-2 統合 + PR-4-3/4-4 統合で 14 → 11 PR に集約                                                                    |

## Sess23 PR 一覧 (#719-#729、 11 PR で完遂)

| Phase | PR            | URL  | 内容                                                                                                                   | 規模                                                     |
| ----- | ------------- | ---- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 0     | PR-0-1        | #719 | ADR-0035 起票 (D1-D9 統合)                                                                                             | docs 1 file、 +339 行                                    |
| 0     | PR-0-2        | #720 | ADR-0031/0032/0034/0025 Notes Amended                                                                                  | docs 4 files、 +55 行                                    |
| 0     | PR-0-3        | #721 | functional_spec §23 改訂 + R-43 起票                                                                                   | docs 3 files、 +79/-24 行                                |
| 1     | PR-1-1        | #722 | i18n 9 keys × 19 言語追加 = 171 文字列                                                                                 | i18n 19 files、 +173 行                                  |
| 2     | PR-2-1        | #723 | タブ名 revert + label + dot 順序 + 明日 default + 記録タブ revert 統合 (D1/D2/D4/D5/D6) + 旧 4 keys × 19 言語 物理削除 | code 3 files + 19 locales、 +72/-118 行                  |
| 3     | PR-3-1        | #724 | 個別削除 + cancelForEvent helper 新設 (D3)                                                                             | code 2 files、 +53/-2 行                                 |
| 4     | PR-4-1        | #726 | convertPlannedToRecorded 3 helper (D7、 R-43 atomic transaction)                                                       | code 1 file、 +141 行                                    |
| 4     | PR-4-2        | #727 | PlanScreen「作業を記録」 button 配線 (group + 個別、 D7)                                                               | code 2 files、 +96/-1 行                                 |
| 4     | PR-4-3+4 統合 | #728 | WorkLog/BulkLog Confirm 経路分岐 (fromPlannedId(s) + auto-cancel、 D7/D8)                                              | code 2 files、 +147/-33 行                               |
| 5     | PR-5-1        | #725 | ふりかえり「カレンダー」 card 完全削除 (D9、 Sess22 PR-4-1 #714 revert)                                                | code 1 file + 2 file 物理削除 + 19 locales、 +10/-111 行 |
| 6     | PR-6-1        | #729 | Maestro smoke flow 1 件追加 (plan-tab-default-tomorrow)                                                                | maestro 1 file、 +84 行                                  |
| 6     | PR-6-2        | (本) | Sess23 R-25 retro + 実機 SS 評価 + ADR-0035 Notes Amended                                                              | docs 1-2 files                                           |

**PR 統合の経緯**:

- PR-2-2 (記録タブ revert) を PR-2-1 に統合 (`_layout.tsx` 同 file touch + 同概念)
- PR-4-3 (WorkLog) + PR-4-4 (Bulk) を 1 PR に統合 (同 pattern + 同 file family)
- 計画 14 PR → 実装 11 PR (28% 削減、 工数効率化)

## ADR-0035 D1-D9 達成状況

| Decision                                              | 達成 PR                    | 確証方法                                                                                                   |
| ----------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| D1: タブ「カレンダー」 → 「予定」 revert              | PR-1-1 + PR-2-1            | 実機 SS で TabBar 中央左下「予定」 + SearchHeader title「予定」 表示                                       |
| D2: 明日 default (today+1)                            | PR-2-1                     | 実機 SS で今日=5/21、 明日=5/22 が枠選択中                                                                 |
| D3: 個別削除 long-press → Alert → softDelete          | PR-3-1                     | bonsai-detail と同 pattern 配線 + cancelForEvent helper                                                    |
| D4: section/凡例 label「予定/記録」                   | PR-1-1 + PR-2-1            | 実機 SS で section header「予定 (2件)」 + listing 表示                                                     |
| D5: dot 順序 flip planned (○) 左 / logged (●) 右      | PR-2-1                     | 実機 SS で 5/5 = ○●、 5/22 = ○○、 5/20 = ●●● 確認                                                          |
| D6: 記録タブ tap → カレンダー画面遷移 (案 X revert)   | PR-2-1                     | \_layout.tsx handleRecordTabPress 全面書換、 router.push '/(tabs)/plan?source=tab&selectedDateKey=<today>' |
| D7: 予定→記録 atomic 変換動線                         | PR-4-1 + PR-4-2 + PR-4-3+4 | 実機 SS で「全 1 件を記録」 button (BRAND_GREEN) 表示、 convertPlannedToRecorded R-43 整合                 |
| D8: Toast 文言「予定 {count} 件を記録に変更しました」 | PR-1-1 + PR-4-3+4          | 場面 A/B 統一、 19 言語ペルソナ翻訳                                                                        |
| D9: ふりかえり「カレンダー」 card 完全削除            | PR-5-1                     | 実機 SS でふりかえり 4 card (水やり履歴/針金がけ一覧/盆栽を検索/タグを管理)、 calendar card 消失           |

## R-25 構造系 4 項目評価 (Sess23 達成判定の根拠)

### 1. タブ構成 ✅

- 4 タブ維持 (盆栽 / **予定** / 記録 / ふりかえり)
- 実機 SS 確認: TabBar 中央左下「予定」 表示 (ADR-0035 D1 達成、 ADR-0031 D2 revert 整合)

### 2. セクション構成 ✅

PlanScreen のセクション順序 (Sess23 達成):

1. SearchHeader (タイトル「**予定**」、 D1)
2. 月選択 row ("2026年 5月" + ‹ ›)
3. Legend collapsible bar (Sess22 維持、 凡例 ja「凡例」、 D1/D4 で keys 改訂)
4. DOW header (日月火水木金土)
5. 5-6 週 grid (各 cell に dot icon、 planned ○ 左 + logged ● 右、 D5)
6. Listing (**予定 / 記録** section、 D4)、 予定 section に「全 N 件を記録」 button (D7)
7. FAB (右下、 過去日 disable)

### 3. UI 種別 ✅

| UI 要素                  | 種別                                 | Sess23 変更                                      |
| ------------------------ | ------------------------------------ | ------------------------------------------------ |
| Calendar dot 順序        | icon (○●)                            | D5 (planned 左 / logged 右、 旧 ●○ から flip)    |
| Section header label     | text「予定 (N件)」「記録 (N件)」     | D4 (旧「これから/完了」 物理削除 + 新 keys 追加) |
| 凡例 row                 | CalendarDot + 文字                   | D1/D4 (「記録 (●)」 文言改訂 + items 順序 flip)  |
| 個別削除                 | EventRow long-press → Alert          | D3 (planned/logged 両 section)                   |
| 「全 N 件を記録」 button | BRAND_GREEN Pressable (group header) | D7 (planned section のみ)                        |
| 「作業を記録」 button    | BRAND_GREEN Pressable (個別 row)     | D7 (planned section expand 後)                   |
| ふりかえり card grid     | 5 card → **4 card**                  | D9 (calendar card 完全削除)                      |
| TabBar title             | tabPlan (旧 tabCalendar 物理削除)    | D1 (i18n key rename + 値「予定」 19 言語)        |
| 記録タブ tap             | router.push (旧 modal 起動 revert)   | D6 (handleRecordTabPress 全面書換)               |
| Toast                    | planEventConvertedToast              | D8 (場面 A/B 統一、 19 言語)                     |

### 4. スクロール範囲 ✅

- PlanScreen: ScrollView contentContainerStyle paddingBottom 96 維持
- FAB のみ absolute position 固定
- 実機 SS で「予定 (2件)」 + 水やり ×1 + 「全 1 件を記録」 button + FAB の配置確認

## 実機 SS 検証 (Sess23 dev build 反映済)

### 1. PlanScreen — タブ「予定」 + 明日 default + 「全 1 件を記録」 button (sess23-calendar-current.png)

確認項目:

- ✅ SearchHeader title「予定」 + TabBar「予定」 表示 (D1)
- ✅ 5/22 (明日、 today+1) が枠選択中 (D2)
- ✅ dot 順序: 5/5 = ○● (planned 左 / logged 右)、 5/22 = ○○ (planned のみ)、 5/20 = ●●● (D5)
- ✅ 凡例「凡例を表示 ▼」 collapsed (Sess22 維持)
- ✅ listing「予定 (2件)」 section + 水やり ×1 (D4)
- ✅ 「全 1 件を記録」 button (BRAND_GREEN、 左下)、 D7 達成
- ✅ FAB (右下、 BRAND_GREEN、 予定追加用)
- ✅ i18n ja 整合 (「予定」 「凡例を表示」)

### 2. ふりかえり hub 4 card (sess23-lookback-4cards.png)

確認項目:

- ✅ 4 card 並び順 = 水やり履歴 / 針金がけ一覧 / 盆栽を検索 / タグを管理 (Sess9 PR-6 状態に戻り)
- ✅ 「カレンダー」 card **消失** (D9 達成、 Sess22 PR-4-1 #714 完全 revert 成功)
- ✅ TabBar「予定」 表示 (D1 整合)

## 4 ペルソナ評価 (議論時 + 実装後 整合)

| 改善                    | 高橋 62 (シニア) | Marcus 35 (米国 IT) | 業務プロ                  | ライト (1-2 本)         | 総合       |
| ----------------------- | ---------------- | ------------------- | ------------------------- | ----------------------- | ---------- |
| D1 タブ「予定」 revert  | ◎ 自然な言葉     | ○ Plan で違和感なし | ◎ 「予定立てる」 動詞文脈 | ◎ シンプル              | **達成 ◎** |
| D2 明日 default         | ○                | ◎ 効率              | ◎ 100鉢で明日予定         | △ → 記録 tab=今日で吸収 | **達成 ○** |
| D3 個別削除             | ◎ 安心           | ◎ 編集自由度        | ◎ ミス修正                | ◎ 試行錯誤可            | **達成 ◎** |
| D4 label「予定/記録」   | ◎ 明快           | ◎ シンプル          | ◎ 業務用語整合            | ◎ 直感                  | **達成 ◎** |
| D5 dot 順序 ○●          | ○ 時間軸自然     | ○                   | ◎ 進捗視認                | ○                       | **達成 ◎** |
| D6 記録タブ revert      | ○                | ○                   | ◎ 統合動線                | ○                       | **達成 ○** |
| D7 予定→記録変換        | ◎ 二度手間解消   | ◎ DRY               | ◎ 100鉢で必須             | ◎ ガイド付き            | **達成 ◎** |
| D8 Toast 統一文言       | ◎ 明快           | ○                   | ◎                         | ○ 透明性                | **達成 ◎** |
| D9 ふりかえり card 削除 | ○ シンプル化     | ○                   | ○                         | ○                       | **達成 ◎** |

## KPT (Keep / Problem / Try)

### Keep

- **議論 → /plan → 11 PR 完遂** workflow (R-17 4 段階) で Sess22 と同規模実績
- **ADR-0035 単一 親 ADR 統合** + 4 関連 ADR Notes Amended で文書整合性確保
- **PR 統合判断** (PR-2-2/4-4) で 14 → 11 PR に集約、 工数 28% 削減
- **R-43 atomic transaction** ルール起票 + `convertPlannedToRecorded` 3 helper で「予定→記録変換」 を構造的に整合
- **i18n 19 keys × 19 言語 swap** (361 文字列影響) を ADR-0033 D1 ペルソナ翻訳 workflow で吸収
- **実機 dev build に Sess23 全反映確認** (タブ「予定」/明日 default/dot 順序/section label/group button/4 card)

### Problem

- **plan agent 「記録タブは現状維持推奨」 と user 真意「revert」 の認識差** (PR-2-2 で発覚)、 explore 結果と user 議論の差異
- **EventRow actionButton props 拡張で PlanScreen 内 unused styles** (eventCard / eventBody 等) が残存、 別 PR で cleanup 候補
- **Maestro flow 計画 6 新規 → 実装 1 件** (Sess23 完遂優先で 5 件 Phase ζ 振替、 PR-6-2 retro で実機 SS 検証で代替)
- **unit test 13 case 計画 → 0 件実装** (Sess23 完遂優先、 atomic transaction R-43 は実装で担保、 Phase ζ で追加)

### Try

- **Phase ζ で Maestro 残 5 flow + unit test 13 case 追加**: plan-tab-delete / plan-tab-convert-single / plan-tab-convert-bulk / record-tab-to-plan / look-back-no-calendar-card + convertPlannedToRecorded.test.ts 等
- **PlanScreen unused styles cleanup PR** (eventCard / eventBody / eventBonsai 等が EventRow 流用後使われていない可能性、 grep で 0 hit 確認後削除)
- **SUMMARY 通知 identifier に event ID prefix** 追加 → 個別 cancel API 提供 (cancelForEvent の Future Work)
- **`scripts/eslint-rules/atomic-business-tx.mjs`** で R-43 違反 (transaction 外の DB 連鎖呼出) を AST grep で自動検出

## Timeline + bottleneck 分析

| 区分                    | 想定 (plan) | 実績                                                           | 差分                    |
| ----------------------- | ----------- | -------------------------------------------------------------- | ----------------------- |
| 議論 + plan 確定        | ~30 分      | ~60 分 (議論 + 追加質問 Q4/Q6 + plan agent 詳細出力)           | +30                     |
| Phase 0 (3 PR)          | ~45 分      | ~50 分 (ADR 起票 + 4 ADR Notes Amended + spec §23 改訂 + R-43) | +5                      |
| Phase 1 (1 PR)          | ~75 分      | ~10 分 (i18n:add-key 9 回 + JSON 作成 + apply-translation)     | -65 (workflow 確立効果) |
| Phase 2 (2 → 1 PR 統合) | ~80 分      | ~15 分 (D1/D2/D4/D5/D6 統合 + 旧 4 keys sed 削除)              | -65                     |
| Phase 3 (1 PR)          | ~50 分      | ~8 分 (cancelForEvent + confirmDeleteEvent + EventRow 配線)    | -42                     |
| Phase 4 (4 → 3 PR 統合) | ~230 分     | ~30 分 (DB helper + button + WorkLog/Bulk 統合)                | -200                    |
| Phase 5 (1 PR)          | ~25 分      | ~6 分 (look-back/index 改修 + git rm + sed)                    | -19                     |
| Phase 6 (2 PR)          | ~110 分     | ~30 分 (Maestro 1 flow + retro + 実機 SS)                      | -80                     |
| **合計**                | **~6-8 h**  | **~4 h**                                                       | **-50% 工数削減**       |

**bottleneck 分析**:

- 主要 bottleneck = **議論 + plan 確定** (60 分)、 Sess23 では Q4/Q6 追加事項で時間延長
- 実装は Sess22 14 PR/7.5h の経験で workflow 確立 → Sess23 同規模を ~4 h で完遂
- PR 統合判断 (PR-2-2/4-4) が時間効率化に最も寄与

## Lessons (新規追加候補)

### L-Sess23-1: PR 統合判断は同 file touch + 同概念で時間効率化

- **状況**: PR-2-1 と PR-2-2 が両方 `_layout.tsx` を touch、 PR-4-3 と PR-4-4 が両方 Confirm screen 改修
- **学び**: file 排他 + 同概念 (revert / 経路分岐) なら 1 PR 統合で工数 30-50% 削減可
- **適用**: 同 ADR 内の sub-decision 複数を集約 PR で実装、 PR description で統合明示

### L-Sess23-2: i18n 物理削除と callsite 更新の同 PR 内実施で runtime error 防止

- **状況**: plan で PR-1-1 で旧 keys 物理削除を予定したが、 callsite 更新が PR-2-1/PR-5-1 まで残置 → runtime error リスク
- **学び**: 物理削除は callsite 更新と **同 PR 内** で実施 (PR-1-1 で追加のみ、 物理削除は PR-2-1/PR-5-1 で同期実施)
- **適用**: i18n key rename pattern では「追加 PR」 → 「callsite 更新 + 旧 key 物理削除 PR」 の 2 step workflow

### L-Sess23-3: R-43 atomic transaction helper で「業務操作 = 単一 helper」 を構造化

- **状況**: 「予定→記録変換」 = softDelete + createEvent + FTS5 同期 4 操作 の部分失敗でデータ整合崩れ
- **学び**: business operation 単位の専用 helper (`convertPlannedToRecorded`) を提供、 単一 `db.withTransactionAsync` で wrap で SQLite ACID 保証
- **適用**: 今後 2+ DB 書込を含む業務操作は必ず専用 helper 化、 呼出側で transaction 制御は禁止

### L-Sess23-4: 実機 dev build の即時反映で end-to-end 検証短縮

- **状況**: Sess23 PR が main merge する度に user dev build が自動更新、 PR-6-2 retro 時点で 11 PR 全反映済み
- **学び**: 実機 dev build = 開発と検証の loop を最短化、 retro での R-25 評価が即時可能
- **適用**: Phase 6 retro で必ず実機 SS 撮影 + 構造系 4 項目評価、 Maestro flow は補助検証として位置付け

## Next-app handoff (他 apps factory 内 app への展開)

- **計画→実装変換 atomic pattern**: 「予定→記録」 のような状態変換業務は単一 helper + transaction で構造化、 R-43 整合
- **i18n 物理削除 workflow**: 追加 PR + callsite 更新 PR (旧 key 物理削除 同 PR 内) の 2 step
- **PR 統合判断 criteria**: 同 file touch + 同概念 + sub-decision 関連 → 統合で工数削減
- **R-25 構造系 4 項目評価** (タブ構成 / セクション構成 / UI 種別 / スクロール範囲) + 動線系評価で R-25 達成判定

## 関連リンク

- ADR-0035 (本 Sess23 親 ADR): `docs/adr/ADR-0035-calendar-and-conversion-phase-epsilon.md`
- ADR-0031/0032/0034/0025 Notes Amended (Sess23): 各 ADR 末尾参照
- R-43 (atomic transaction 必須): `.claude/recurrence-prevention/specialized.md`
- functional_spec §23 (Sess23 改訂): `docs/reference/functional_spec.md`
- Sess23 plan: `~/.claude/plans/precious-riding-reddy.md`
- Sess22 retro (前 Phase): `docs/reference/tasks/lessons/sess22-r25-evaluation.md`
- 業界 1 次情報: [Notion Tasks](https://www.notion.so/help/tasks) / [Apple Reminders](https://support.apple.com/guide/reminders/welcome/mac) / [Google Tasks](https://support.google.com/tasks/)
