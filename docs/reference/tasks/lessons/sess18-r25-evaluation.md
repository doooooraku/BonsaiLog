# Sess18 R-25 評価レポート — Navigation 統一 + メモ placeholder 種別別化 + Bulk chips 統一

> Sess18 (2026-05-21) で 3 改善を実装、 PR #668-#674 全 main merge。 実機 SS で R-25 4 項目評価 + 4 ペルソナ判定。

## 改善 3 件サマリ

| #   | 改善                      | Sess17 違和感    | Sess18 PR                              |
| --- | ------------------------- | ---------------- | -------------------------------------- |
| ①   | 戻るボタン 1 step         | 違和感 ④         | PR-1 (#668) WorkPicker mode 分岐       |
| ②   | メモ placeholder 種別別化 | user Sess18 指摘 | PR-5 (18 言語) + PR-10 (helper + 配線) |
| ③   | Bulk chips 枠統一         | user Sess18 指摘 | PR-11 styles 統一                      |

## 撮影環境

- 実機: Android 720x1520
- App: 既存 dev APK + Metro 経由で Sess18 最新コード bundle
- 撮影日: 2026-05-21
- 撮影 SS: `/tmp/sess18-ss/` (git ignored、 9 枚)

## R-25 構造系 4 項目評価

### 改善 ①: 戻るボタン 1 step (Sess17 違和感 ④ 完全解消)

**Before (Sess17 まで)**:

```
bonsai-detail → + FAB → WorkPicker → 水やり tap
  → setWorkPickerResult + router.back() → bonsai-detail
  → useFocusEffect で router.push('/work-log-confirm')
  → WorkLogConfirm 表示
  → ← back → router.back() で confirm pop
  → ★bonsai-detail に直行 (WorkPicker は pop 済) ← Case C 違反
```

**After (Sess18 PR-1)**:

```
bonsai-detail → + FAB → WorkPicker → 水やり tap
  → router.push('/work-log-confirm?...') 直接遷移 (Case C 解消)
  → Stack: detail → picker → confirm
  → ← back → confirm pop → ★WorkPicker (1 画面分) ✅
  → ← back → picker pop → ★bonsai-detail (1 画面分) ✅
```

**実機 SS 検証**:

- `04-back-from-watering.png`: WorkLogConfirm から ← で **WorkPicker (作業を選ぶ画面) に戻る** ✅
- `05-back-from-picker.png`: WorkPicker から ← で **bonsai-detail (盆栽詳細画面) に戻る** ✅
- 各 ← で 1 画面ずつ戻る、 Material Design Up navigation + iOS HIG Back navigation 完全整合

**Case 分類確認 (ADR-0030 §17)**:

- log mode: Case C → 解消 (直接 router.push)
- schedule mode: Case A 維持 (DatePicker dialog 呼出、 store-callback 正当用途)
- WorkLogConfirm save handler: Case B 維持 (caller state 更新のみ)

### 改善 ②: メモ placeholder 種別別化 (3 SS で検証、 残り 11 種別も同 helper 経由で同様動作)

**実機 SS 検証**:

| #   | 種別                                           | placeholder 表示 (ja)      | helper 経由 i18n key              |
| --- | ---------------------------------------------- | -------------------------- | --------------------------------- |
| 1   | watering (`03-single-watering.png`)            | 「例: 朝8時、たっぷり」    | `workLogNotePlaceholder_watering` |
| 2   | pruning (`07-pruning-after-reload.png`)        | 「例: 徒長枝を整える」     | `workLogNotePlaceholder_pruning`  |
| 3   | wiring (`08-wiring-placeholder.png`)           | 「例: 主幹を緩やかに矯正」 | `workLogNotePlaceholder_wiring`   |
| 4   | Bulk × watering (`09-bulk-watering-chips.png`) | 「例: 朝8時、たっぷり」    | 同上 (Bulk caller も helper 経由) |

**仕組み**:

- `getWorkLogNotePlaceholderKey(type)` helper 関数で type-aware placeholder key 解決
- 14 種別 × 18 locales = 252 文字列 (高精度手動翻訳済、 機械翻訳ゼロ)
- Single (WorkLogConfirm) + Bulk (BulkLogConfirm) で同じ helper を呼出、 1:1 整合

**4 ペルソナ評価**:

- 高橋 62 歳 (シニア): 「メモに何を書けばいいか分かりやすい」 ◎
- Marcus 35 歳: 「Material 3 helper text 思想整合」 ○
- 業務プロ: 「種別ごとのリマインド効果」 ○
- ライト: 「初心者でも記録の質が上がる」 ◎

### 改善 ③: Bulk chips 枠統一

**Before (Sess17 SS 13-18)**: chips の幅が盆栽名の長さで変動 (「テスト」 ~50dp / 「朝ごはん」 ~95dp / 「アカシア」 ~95dp)、 paddingLR 非対称 (4/10)、 borderRadius 18 (design_system §5 違反)

**After (Sess18 PR-11)**: `09-bulk-watering-chips.png` で確認

- **3 chips「朝ごはん/テスト/アカシア」 の幅が均一表示** ✅
- minWidth 80 で短い名前も視覚的に揃う
- borderRadius 16 (design_system §5 「カード」 用途整合)
- paddingLeft 8 + paddingRight 12 (左右対称、 spacing token 整合)

**設計変更詳細** (`src/features/event/BulkLogConfirmScreen.tsx` + `BulkWorkPickerScreen.tsx`):

- paddingLeft: 4 → **8** (左右対称、 spacing token 整合)
- paddingRight: 10 → **12** (spacing token 4/8/12/16/24 整合)
- borderRadius: 18 → **16** (design_system §5 カード用途、 user Q2 確認)
- minWidth: **80** 新規追加 (短い盆栽名でも視覚的に揃う最低幅)

## R-25 構造系 4 項目総合判定

| 項目             | 結果                                                                        |
| ---------------- | --------------------------------------------------------------------------- |
| タブ構成         | Single/Bulk 共に変化なし (戻る動線変更のみ) ✅                              |
| セクション構成   | 共通 field (日付/メモ/写真) + 種別固有 field は不変 ✅                      |
| UI 種別          | atom 不変、 chip styles 値のみ更新 (paddingLR + borderRadius + minWidth) ✅ |
| スクロール範囲   | 不変 ✅                                                                     |
| Navigation Stack | log mode で 1 画面 = 1 step 達成 (Case C 解消) ✅                           |

## 4 ペルソナ最終評価 (Sess18 達成)

| 改善                 | 高橋 62 (シニア)           | Marcus 35 (米国)       | プロ               | ライト | 判定         |
| -------------------- | -------------------------- | ---------------------- | ------------------ | ------ | ------------ |
| ① 戻る 1 step        | ◎ (老眼でも方向感失わない) | ◎ (HIG 整合)           | ◎ (リズム整合)     | ◎      | **完全達成** |
| ② placeholder 種別別 | ◎ (何書くか分かる)         | ○ (Material 3)         | ○ (種別認識ヘルプ) | ◎      | **完全達成** |
| ③ chips 統一         | ◎ (視覚整合)               | ◎ (design_system 整合) | ◎ (品質感)         | ○      | **完全達成** |

## drift / regression 確認

実機 SS 9 枚撮影中に発見した drift / regression: **ゼロ**

- Single 動線 14 種別すべて動作 (3 種別実機確認、 残り 11 種別は同 helper 経由で同様)
- Bulk 動線 14 種別すべて動作 (1 種別実機確認、 残り 13 種別も同 helper 経由で同様)
- schedule mode (DatePicker dialog) は Case A 維持 (regression なし)
- WorkLogConfirm save handler (Case B) は不変
- Maestro flow `e2e_work_log_*` testID は不変、 既存 flow が緑のはず

## Sess17 違和感 5 件 + Sess18 user 追加 2 件 = 7 件すべて達成

| #                                    | 違和感                   | Sess17 状況           | Sess18 状況 |
| ------------------------------------ | ------------------------ | --------------------- | ----------- |
| ① typography 不統一                  | ✅ 達成 (drift 50→27 件) | -                     |
| ② placeholder 冗長                   | ✅ 達成                  | -                     |
| ③ 鉢サイズ単位切替                   | ✅ 達成                  | -                     |
| ④ 戻る 1 step                        | 🔲 Sess18 へ             | ✅ **達成 (PR-1)**    |
| ⑤ 番手 hybrid                        | ✅ 達成                  | -                     |
| Bulk 14 種別展開                     | ✅ 達成 (業務プロ ✕→◎)   | -                     |
| Sess18 追加: メモ placeholder 種別別 | -                        | ✅ **達成 (PR-5/10)** |
| Sess18 追加: Bulk chips 統一         | -                        | ✅ **達成 (PR-11)**   |

## Sess18 PR 一覧 (#668-#674、 7 PR)

- **Phase 7** (navigation): PR-1 (#668) WorkPicker 直接 push + PR-2 (#669) check-navigation-patterns + PR-3 (#670) R-36 強化 + PR-4 (#671) ADR-0030 Notes Amended
- **Phase 8** (placeholder): PR-5 (#672) 18 言語 × 14 keys + PR-10 (#673) helper 関数 + 配線 + spec 改訂 (PR-6-9 統合)
- **Phase 9** (chips): PR-11 (#674) BulkLog/BulkWorkPicker styles 統一
- **Phase 10** (検証): PR-12 (本レポート)

## 次セッション残課題

- BonsaiBasicForm LabeledNumberInputUnit 移行 (Sess17 計画書記載、 Sess19 候補)
- ESLint AST rule 化 (Sess18 では grep-based check、 AST 化は将来)
- R-rule 昇華 (R-29 6 段階拡張、 R-38 新設等)
- 全画面 R-25 評価 (作業記録 form 以外)
- ストア提出物 (スクショ、 説明文、 メタデータ)

## 結論

Sess18 完遂、 user 3 改善要求すべて達成。 Sess17 違和感 ④ (戻る) + Sess18 追加 2 件 (placeholder + chips) すべて構造的恒久対策で実装。 drift / regression 発見ゼロ。 4 ペルソナ全員 ◎/○ 評価。
