/**
 * 作業選択画面 (Phase G2 part 1、ADR-0024 Accepted)。
 *
 * `presentation: 'modal'` (ADR-0024 Notes Amended 2026-05-15 で formSheet → modal 一本化、
 * `(modals)/_layout.tsx` の screenOptions で適用)。Sess16 PR-A1 で nav title を mode URL param
 * で動的化 (log → 「作業を記録」 / schedule → 「予定を追加」)。
 *
 * caller は `router.push('/work-picker?bonsaiName=...&isPine=...&mode=log|schedule')`、
 * 結果は `usePickerStore.setWorkPickerResult({ type, mode })` + `router.back()` で返却。
 * caller 側 `useFocusEffect` で `consumeWorkPickerResult()` 取得。
 */
export { default } from '@/src/features/event/WorkPickerScreen';
