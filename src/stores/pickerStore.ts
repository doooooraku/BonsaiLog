/**
 * G0 PoC 用 Picker 戻り値受け渡し (ADR-0024 / Issue #475 Phase G0)。
 *
 * Picker 画面で `setSpeciesPickerResult(id)` → `router.back()` → caller で
 * `consumeSpeciesPickerResult()` を呼んで結果取得 + state クリア。
 *
 * 'CONSUMED' sentinel で「未設定」 と「null 選択 (= 樹種なし)」 を区別。
 *
 * Phase G0 PoC 専用、勝者案確定後の Phase G1 では React Navigation 8.0 の
 * `pushParams` API or `useLocalSearchParams` 経由に置換候補。
 */
import { create } from 'zustand';

type SpeciesResult = string | null | 'CONSUMED';

type PickerStore = {
  speciesPickerResult: SpeciesResult;
  setSpeciesPickerResult: (id: string | null) => void;
  /** 結果を取り出して state を 'CONSUMED' (= 未設定) にリセット。未設定なら undefined を返す。 */
  consumeSpeciesPickerResult: () => string | null | undefined;
};

export const usePickerStore = create<PickerStore>((set, get) => ({
  speciesPickerResult: 'CONSUMED',
  setSpeciesPickerResult: (id) => set({ speciesPickerResult: id }),
  consumeSpeciesPickerResult: () => {
    const result = get().speciesPickerResult;
    if (result === 'CONSUMED') return undefined;
    set({ speciesPickerResult: 'CONSUMED' });
    return result;
  },
}));
