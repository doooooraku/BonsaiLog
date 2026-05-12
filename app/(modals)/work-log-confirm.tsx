/**
 * 作業記録 詳細 入力画面 (Phase G2 part 2、ADR-0024 Accepted)。
 *
 * `presentation: 'formSheet'` + `sheetAllowedDetents: [0.5, 1]` +
 * `contentStyle: { height: '100%' }` (Expo v54 既知バグ予防、Stack 共通設定)。
 *
 * caller は `router.push('/work-log-confirm?bonsaiName=...&type=...')`、
 * 結果は `usePickerStore.setWorkLogConfirmResult(payload)` + `router.back()` で返却。
 * caller 側 `useFocusEffect` で `consumeWorkLogConfirmResult()` 取得 → createEvent で書込。
 */
export { default } from '@/src/features/event/WorkLogConfirmScreen';
