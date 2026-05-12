/**
 * Picker 戻り値受け渡し store (Phase G1-G2、ADR-0024 Accepted)。
 *
 * Picker 画面で `set{Species,Style,Work,WorkLogConfirm}PickerResult(value)` → `router.back()`
 * → caller で `useFocusEffect` 内で `consume{...}Result()` を呼んで結果取得 + state クリア。
 *
 * 'CONSUMED' sentinel で「未設定」 と「null 選択 (= 未選択)」 を区別。
 *
 * Phase G3-G4 で bulk-* も追加予定。
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

/**
 * 作業記録 詳細 入力の戻り値 (Phase G2 part 2、ADR-0024 Accepted)。
 * 循環依存回避のため WorkLogConfirmScreen ではなく本 store 側で型定義し、Screen 側 import する。
 */
export type WorkLogPayload = {
  type: EventType;
  note: string;
  payload: Record<string, unknown>;
};
type WorkLogConfirmResult = WorkLogPayload | 'CONSUMED';

/** 一括操作の context (selectedBonsais を Screen 間で共有、Phase G3a)。 */
export type BulkBonsaiRef = { id: string; name: string };
export type BulkContext = { selectedBonsais: readonly BulkBonsaiRef[] };

type BulkWorkPickerValue = { type: EventType; mode: 'log' | 'schedule' };
type BulkWorkPickerResult = BulkWorkPickerValue | 'CONSUMED';

export type BulkLogConfirmInput = { note: string | null };
type BulkLogConfirmResult = BulkLogConfirmInput | 'CONSUMED';

export type BulkScheduleDateInput = { occurredAtUtc: string };
type BulkScheduleDateResult = BulkScheduleDateInput | 'CONSUMED';

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

  // 作業記録 詳細 (work-log-confirm、Phase G2 part 2)
  workLogConfirmResult: WorkLogConfirmResult;
  setWorkLogConfirmResult: (payload: WorkLogPayload) => void;
  consumeWorkLogConfirmResult: () => WorkLogPayload | undefined;

  // 一括操作 context (selectedBonsais を Screen 間共有、Phase G3a)
  bulkContext: BulkContext | null;
  setBulkContext: (ctx: BulkContext | null) => void;

  // 一括作業選択 (bulk-work-picker、Phase G3a)
  bulkWorkPickerResult: BulkWorkPickerResult;
  setBulkWorkPickerResult: (result: BulkWorkPickerValue) => void;
  consumeBulkWorkPickerResult: () => BulkWorkPickerValue | undefined;

  // 一括記録 詳細 (bulk-log-confirm、Phase G3a)
  bulkLogConfirmResult: BulkLogConfirmResult;
  setBulkLogConfirmResult: (input: BulkLogConfirmInput) => void;
  consumeBulkLogConfirmResult: () => BulkLogConfirmInput | undefined;

  // 一括予定追加 日付選択 (bulk-schedule-date、Phase G3b)
  bulkScheduleDateResult: BulkScheduleDateResult;
  setBulkScheduleDateResult: (input: BulkScheduleDateInput) => void;
  consumeBulkScheduleDateResult: () => BulkScheduleDateInput | undefined;
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

  workLogConfirmResult: 'CONSUMED',
  setWorkLogConfirmResult: (payload) => set({ workLogConfirmResult: payload }),
  consumeWorkLogConfirmResult: () => {
    const result = get().workLogConfirmResult;
    if (result === 'CONSUMED') return undefined;
    set({ workLogConfirmResult: 'CONSUMED' });
    return result;
  },

  bulkContext: null,
  setBulkContext: (ctx) => set({ bulkContext: ctx }),

  bulkWorkPickerResult: 'CONSUMED',
  setBulkWorkPickerResult: (result) => set({ bulkWorkPickerResult: result }),
  consumeBulkWorkPickerResult: () => {
    const result = get().bulkWorkPickerResult;
    if (result === 'CONSUMED') return undefined;
    set({ bulkWorkPickerResult: 'CONSUMED' });
    return result;
  },

  bulkLogConfirmResult: 'CONSUMED',
  setBulkLogConfirmResult: (input) => set({ bulkLogConfirmResult: input }),
  consumeBulkLogConfirmResult: () => {
    const result = get().bulkLogConfirmResult;
    if (result === 'CONSUMED') return undefined;
    set({ bulkLogConfirmResult: 'CONSUMED' });
    return result;
  },

  bulkScheduleDateResult: 'CONSUMED',
  setBulkScheduleDateResult: (input) => set({ bulkScheduleDateResult: input }),
  consumeBulkScheduleDateResult: () => {
    const result = get().bulkScheduleDateResult;
    if (result === 'CONSUMED') return undefined;
    set({ bulkScheduleDateResult: 'CONSUMED' });
    return result;
  },
}));
