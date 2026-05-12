/**
 * 樹形ピッカー画面 (Phase G1、ADR-0024 Provisionally Accepted)。
 *
 * `presentation: 'formSheet'` + `sheetAllowedDetents: [0.5, 1]` +
 * `contentStyle: { height: '100%' }`。
 *
 * BONSAI_STYLES (10 種、chokkan/moyogi/... 他) を chip 表示。
 * 結果は `usePickerStore.setStylePickerResult(style)` + `router.back()`。
 */
export { default } from '@/src/features/bonsai/StylePickerScreen';
