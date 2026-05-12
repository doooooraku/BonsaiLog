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

import type { BonsaiStyle, EventType } from '@/src/db/schema';

type SpeciesResult = string | null | 'CONSUMED';
type StyleResult = BonsaiStyle | null | 'CONSUMED';

/** 作業選択モード: 'log' = 即時記録、'schedule' = 予定追加 (Issue #298 Phase 2)。 */
export type WorkPickerMode = 'log' | 'schedule';
type WorkPickerValue = { type: EventType; mode: WorkPickerMode };
type WorkPickerResult = WorkPickerValue | 'CONSUMED';

type PickerStore = {
  // 樹種 (species)
  speciesPickerResult: SpeciesResult;
  setSpeciesPickerResult: (id: string | null) => void;
  consumeSpeciesPickerResult: () => string | null | undefined;

  // 樹形 (style)
  stylePickerResult: StyleResult;
  setStylePickerResult: (s: BonsaiStyle | null) => void;
  consumeStylePickerResult: () => BonsaiStyle | null | undefined;

  // 作業選択 (work、Phase G2 part 1)
  workPickerResult: WorkPickerResult;
  setWorkPickerResult: (result: WorkPickerValue) => void;
  consumeWorkPickerResult: () => WorkPickerValue | undefined;
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

  workPickerResult: 'CONSUMED',
  setWorkPickerResult: (result) => set({ workPickerResult: result }),
  consumeWorkPickerResult: () => {
    const result = get().workPickerResult;
    if (result === 'CONSUMED') return undefined;
    set({ workPickerResult: 'CONSUMED' });
    return result;
  },
}));
