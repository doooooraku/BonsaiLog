/**
 * G0 PoC Z 案: presentation: 'formSheet' + sheetAllowedDetents:[0.5, 1] +
 * contentStyle:{height:'100%'} (Expo v54 既知バグ予防、ADR-0024)。
 *
 * iOS: native Sheet (detents 50% / 100% で 2 段階の高さ調整可能)。
 * Android: 通常の Modal 表示 (formSheet 互換)。
 *
 * @gorhom/bottom-sheet の最有力代替候補 (functional_spec.md §7.2 / §9.3.4 整合)。
 *
 * ADR-0024 / Issue #475 Phase G0。
 */
export { default } from '@/src/features/bonsai/SpeciesPickerScreen';
