/**
 * 作業選択画面 (Phase G2 part 1、ADR-0024 Accepted)。
 *
 * `presentation: 'modal'` (ADR-0024 Notes Amended 2026-05-15 で formSheet → modal 一本化、
 * `(modals)/_layout.tsx` の screenOptions で適用)。Sess16 PR-A1 で nav title を mode URL param
 * で動的化 (log → 「作業を記録」 / schedule → 「予定を追加」)。
 *
 * caller は `router.push('/work-picker?bonsaiName=...&mode=log')` (記録) または
 * `?mode=schedule&editingPlannedId=...` (planned 種別編集、カレンダー kebab 経由)。
 * Sess99 #1127: 旧 schedule store-callback (setWorkPickerResult / consumeWorkPickerResult、
 * ADR-0030 Case A) は撤去 — 予定追加は BulkLogConfirmScreen 確認画面動線に統一。
 */
export { default } from '@/src/features/event/WorkPickerScreen';
