/**
 * Picker 戻り値受け渡し store (Phase G1、ADR-0024 Provisionally Accepted)。
 *
 * Picker 画面で `set{Species,Style}PickerResult(value)` → `router.back()` → caller で
 * `useFocusEffect` 内で `consume{Species,Style}PickerResult()` を呼んで結果取得 + state クリア。
 *
 * 'CONSUMED' sentinel で「未設定」 と「null 選択 (= 未選択)」 を区別。
 *
 * Phase G2-G4 で work-picker / work-log-confirm / bulk-* も追加予定。
 * 将来 React Navigation 8.0 の `pushParams` API or `useLocalSearchParams` 経由に置換候補。
 */
import { create } from 'zustand';

import type { BonsaiStyle } from '@/src/db/schema';

type SpeciesResult = string | null | 'CONSUMED';
type StyleResult = BonsaiStyle | null | 'CONSUMED';

type PickerStore = {
  // 樹種 (species)
  speciesPickerResult: SpeciesResult;
  setSpeciesPickerResult: (id: string | null) => void;
  consumeSpeciesPickerResult: () => string | null | undefined;

  // 樹形 (style)
  stylePickerResult: StyleResult;
  setStylePickerResult: (s: BonsaiStyle | null) => void;
  consumeStylePickerResult: () => BonsaiStyle | null | undefined;
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

  stylePickerResult: 'CONSUMED',
  setStylePickerResult: (s) => set({ stylePickerResult: s }),
  consumeStylePickerResult: () => {
    const result = get().stylePickerResult;
    if (result === 'CONSUMED') return undefined;
    set({ stylePickerResult: 'CONSUMED' });
    return result;
  },
}));
