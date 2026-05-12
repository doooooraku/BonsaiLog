/**
 * 作業選択画面 (Phase G2 part 1、ADR-0024 Provisionally Accepted)。
 *
 * `presentation: 'formSheet'` + `sheetAllowedDetents: [0.5, 1]` +
 * `contentStyle: { height: '100%' }` (Expo v54 既知バグ予防)。
 *
 * caller は `router.push('/work-picker?bonsaiName=...&isPine=...&mode=log|schedule')`、
 * 結果は `usePickerStore.setWorkPickerResult({ type, mode })` + `router.back()` で返却。
 * caller 側 `useFocusEffect` で `consumeWorkPickerResult()` 取得。
 */
export { default } from '@/src/features/event/WorkPickerScreen';
