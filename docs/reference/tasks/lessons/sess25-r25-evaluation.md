# Sess25 Phase ζ-2 — R-25 構造系 + 動線系 評価 retro

- Date: 2026-05-21
- Phase: Sess25 ζ-2 (10 PR #734-#743)
- ADR: ADR-0036 (破壊的操作 UX 統一 pattern)
- 前 retro: `docs/reference/tasks/lessons/sess23-r25-evaluation.md` (Phase ε)

---

## R-25 構造系 4 項目 (機械判定 + Claude Read 主導)

ADR-0036 D1-D9 達成の **構造的** 確認 (実装 → spec 整合):

### ① ConfirmDialog 種別 (Alert.alert → カスタム Modal 移行、 ADR-0036 D1)

- ✅ `src/components/ConfirmDialog.tsx` 新規 (~150 行)
- ✅ react-native Modal + transparent + animationType="fade" + onRequestClose
- ✅ accessibilityViewIsModal + accessibilityRole="alert" (WAI-ARIA Dialog Pattern)
- ✅ Haptics.notificationAsync(NotificationFeedbackType.Warning) を onConfirm 直前
- ✅ description optional (D4 即削除前提、 desc 行 削除)
- ✅ destructive=true で DANGER 赤 button
- ✅ PlanScreen + bonsai-detail 共有 (2 callsite)
- ✅ Alert.alert callsite 0 (削除動線では完全置換)

**評価**: 構造系 ✅ PASS (アプリ世界観統一達成、 旧 Material 2 Alert 完全撤廃)

### ② kebab menu (RowActionMenu) items 動的構築 (ADR-0036 D7)

- ✅ `src/components/RowActionMenu.tsx` 新規 (~100 行、 bottom sheet 風)
- ✅ planned section group: 2 items「削除」 + 「全 {count} 件を記録」
- ✅ logged section group: 1 item「削除」
- ✅ MoreVerticalIcon (`src/components/icons/NavIcons.tsx` 既存 export 再利用) を group 行右端配置
- ✅ 旧 ADR-0035 D7 緑 button `e2e_plan_group_record_button_*` を kebab menu item `e2e_plan_kebab_record_all_*` に統合

**評価**: 構造系 ✅ PASS (発見性 ↑ + 旧緑 button UI ノイズ削減)

### ③ planned/logged 文言整合 (ADR-0036 D3)

- ✅ i18n keys 4 件追加 × 19 言語 = 76 文字列 (PR-②):
  - planEventDeleteConfirmPlannedSingleTitle
  - planEventDeleteConfirmLoggedSingleTitle
  - planEventDeleteConfirmPlannedGroupTitle
  - planEventDeleteConfirmLoggedGroupTitle
- ✅ wiring cascade 補足 keys: planEventDeleteConfirmWiringCascadeNote
- ✅ PlanScreen + bonsai-detail で status 別文言分岐
- ✅ 旧 keys 4 件 × 19 言語 = 76 文字列 物理削除 (PR-⑧)
- ✅ pnpm i18n:check PASS (0 missing、 unused 旧 keys ゼロ)

**評価**: 構造系 ✅ PASS (user 認知不整合「記録なのに予定」 解消)

### ④ UndoSnackbar 表示構造 (Toast 拡張、 ADR-0036 D5 / R-44)

- ✅ 既存 `src/components/Toast.tsx` を **拡張** で実現 (独立 component 不採用、 z-index/position/animation 衝突回避)
- ✅ ToastAction type + ToastShowOptions type 新規 (後方互換維持)
- ✅ showUndoToast(message, actionLabel, undoFn) helper (4s 固定、 Material 3 Snackbar default)
- ✅ pointerEvents 動的切替 (action あり=box-none / なし=none で 旧挙動維持)
- ✅ undoSnackbarPlannedDeleteN / undoSnackbarLoggedDeleteN で文言分離

**評価**: 構造系 ✅ PASS (R6 100 鉢誤削除リスク v1.0 blocker 解消)

---

## R-25 動線系 4 項目 (実機 SS 検証推奨)

1. **個別 EventRow long-press → ConfirmDialog → 削除 → Undo**: Haptics impact (Medium) → 文言分離 dialog → Haptics notification (Warning) → bulkSoftDeleteEvents + cancelForEvents + reload → 4s UndoSnackbar
2. **group 行 long-press / kebab「削除」 → ConfirmDialog (group まとめ削除)**: wiring 含む場合 cascade note 補足
3. **kebab「全 {count} 件を記録」 → bulk 変換 (ADR-0035 D7 統合)**: 旧緑 button を menu item に統合
4. **UndoSnackbar [元に戻す] tap → restoreEvents 復元**: 4 秒以内 tap で R-43 atomic 復元

testID 一覧: ConfirmDialog `e2e_plan_confirm_delete{,_cancel,_confirm}` / kebab `e2e_plan_group_kebab_{planned,logged}_<type>` / menu item `e2e_plan_kebab_{delete,record_all}_<type>` / Toast `e2e_toast` + `e2e_toast_action`

bonsai-detail history: ConfirmDialog `e2e_bonsai_detail_confirm_delete`、 文言「この記録を削除しますか?」、 cancelForEvents (Sess23 PR-3-1 漏れ補完)。

---

## 改善 ② 動線 (ADR-0036 D9): EventRow showBonsaiName=true 時 重複削除

- ✅ PlanScreen 展開後カード: 1 行目 = bonsaiName 単独 (旧 3 行 → 2 行、 作業名 + 日付 行 物理削除)
- ✅ bonsai-detail history タブ: 1 行目 = eventLabel + date (Fragment、 regression なし)
- ✅ accessibilityLabel 維持 (`${bonsaiName}, ${eventType}` で VoiceOver 整合)

---

## wiring cascade 動線 (ADR-0036 D8)

- ✅ wiring planned 削除 → 対応 unwiring scheduled 通知 自動 cancel
- ✅ 実装シンプル化判明 (Phase 1 explore): unwiring event 不在 (wiring payload 内 scheduled_unwire_at のみ) → 別 cascade helper 不要、 cancelForEvents bulk wrapper で自動カバー
- ✅ ConfirmDialog title に補足「(関連する取り外し予定も削除されます)」 (wiring 含む group のみ)

---

## 恒久策の起票確認 (PR-①)

- ✅ R-44 (破壊的操作 = ConfirmDialog + UndoSnackbar 必須)
- ✅ R-45 (長押し UX 標準 = Haptics + delayLongPress 500ms)
- ✅ design_system.md §18「長押し UX 標準」 新規
- ✅ ADR テンプレ「粒度 × 4 ペルソナ matrix」 必須化
- ⏸️ Future Work: `scripts/eslint-rules/destructive-undo.mjs` AST grep (R-44 自動検出、 Phase ζ-3 or v1.x)

---

## 10 PR 実績

| PR  | Title                                                                                                    | merged |
| --- | -------------------------------------------------------------------------------------------------------- | ------ |
| 1   | ADR-0036 起票 + R-44/R-45 + design_system §18 + ADR matrix                                               | #734   |
| 2   | i18n 10 keys × 19 lang = 190 文字列追加 + .gitignore に out/                                             | #735   |
| 3   | ConfirmDialog component 新設 + 7 case unit test                                                          | #736   |
| 4   | Toast.tsx 拡張 (UndoSnackbar 代替) + showUndoToast helper + 7 case test                                  | #737   |
| 5   | RowActionMenu (kebab) component 新設 + 7 case unit test                                                  | #738   |
| 6   | bulkSoftDeleteEvents + restoreEvents + cancelForEvents bulk wrapper + 10 case test                       | #739   |
| 7   | PlanScreen 配線 (group onLongPress + ConfirmDialog + 文言分離 + Haptics + Undo + kebab + wiring cascade) | #740   |
| 8   | bonsai-detail 配線 + 旧 i18n keys 4 件 × 19 lang 物理削除                                                | #741   |
| 9   | EventRow 改善 ② (作業名 + 日付 重複削除) + 6 case test                                                   | #742   |
| 10  | Maestro 4 flow 新規 + 本 retro doc                                                                       | #743   |

合計: **10 PR / 0 revert / 全 main merge / 4 ペルソナ ✕ なし**

---

## 学び (Sess26+ 反映候補)

1. **i18n multi-line value 残骸 sed 削除事故**: PR-⑧ で旧 keys 4 件 sed -d 削除時、 multi-line value (key + 改行 + value) の value 行が orphan 残存し 8 言語 (nl/pl/ru/fr/it/id/de/es) で syntax error。 教訓: i18n key 削除は **専用 script 推奨** (`scripts/i18n-remove-key.mjs` 新設候補)、 sed 1 行マッチでは multi-line value 検出不可
2. **NotificationFeedbackStyle vs NotificationFeedbackType typo**: ADR-0036 起票時に Style と書いてしまったが expo-haptics API は **Type**。 PR-③ 実装時に発覚 → 4 file 修正 (PR-③ にて hot fix)
3. **既存 Toast 拡張で UndoSnackbar 実現**: 独立 component 新規より既存拡張で z-index / animation 衝突回避 ◎ (Phase 1 explore agent 判断が成功例)
4. **wiring cascade 実装シンプル化**: unwiring event 不在 (Phase 1 判明) → 別 cascade helper 不要、 既存 cancelForEvents で自動カバー (R12 リスク下方修正成功)
5. **group + 個別 + kebab の 3 動線共存**: Material 3 標準 (long-press = power user / kebab = discoverable) で UI 整理達成、 ADR-0035 D7 緑 button 統合で 1 行 UI スッキリ
