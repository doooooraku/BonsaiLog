/**
 * G0 PoC X 案: 完全画面 push (Stack 通常 push、`presentation: 'card'` default)。
 *
 * `router.push('/bonsai/species-picker-x?initial=...')` で開く。
 * iOS / Android 両方で標準の左→右画面遷移アニメーション。
 *
 * ADR-0024 / Issue #475 Phase G0。
 */
export { default } from '@/src/features/bonsai/SpeciesPickerScreen';
