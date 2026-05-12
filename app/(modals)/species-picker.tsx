/**
 * 樹種ピッカー画面 (Phase G1、ADR-0024 Provisionally Accepted)。
 *
 * `presentation: 'formSheet'` + `sheetAllowedDetents: [0.5, 1]` +
 * `contentStyle: { height: '100%' }` (Expo v54 既知バグ予防)。
 *
 * caller は `router.push({ pathname: '/(modals)/species-picker', params: { initial } })`、
 * 結果は `usePickerStore.setSpeciesPickerResult(id) + router.back()` で返却。
 * caller 側 `useFocusEffect` で `consumeSpeciesPickerResult()` 取得。
 *
 * Phase G2-G4 完了後に実機 5/5 検証で本採用確定 (現状暫定採用)。
 */
export { default } from '@/src/features/bonsai/SpeciesPickerScreen';
