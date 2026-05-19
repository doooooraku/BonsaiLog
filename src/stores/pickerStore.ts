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

import type { BonsaiWithSpecies } from '@/src/db/bonsaiRepository';
import type { BonsaiStyle, Event, EventType } from '@/src/db/schema';

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

/** 横断水やり日付詳細 (Phase G4 part 1) — caller から Screen への重 data 受け渡し。 */
export type WateringDayDetailContext = {
  dateKey: string;
  events: readonly Event[];
  bonsaiById: ReadonlyMap<string, BonsaiWithSpecies>;
};
type WateringDayDetailEntry = string | 'CONSUMED';

/** 盆栽 新規登録結果 (bonsai-new modal、Phase G4 part 2) — 作成された bonsaiId を返却。 */
type BonsaiCreateResult = string | 'CONSUMED';

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
  // Sess12 PR-B+C 後: bulkWorkPickerResult / bulkLogConfirmResult は dead code 化により削除済
  // (BulkWorkPickerScreen / BulkLogConfirmScreen が直接 DB 書き込み + Toast + dismissAll に統一)
  bulkContext: BulkContext | null;
  setBulkContext: (ctx: BulkContext | null) => void;

  // Sess12 PR-H: PlanScreen selectedDateKey 保持 (router.replace で PlanScreen 再 mount 時に
  // user が選択していた日付を restore、 today reset を回避)
  planSelectedDateKey: string | null;
  setPlanSelectedDateKey: (dateKey: string) => void;

  // 横断水やり日付詳細 (watering-day-detail、Phase G4 part 1)
  wateringDayDetailContext: WateringDayDetailContext | null;
  setWateringDayDetailContext: (ctx: WateringDayDetailContext | null) => void;
  wateringDayDetailEntry: WateringDayDetailEntry;
  setWateringDayDetailEntry: (bonsaiId: string) => void;
  consumeWateringDayDetailEntry: () => string | undefined;

  // 盆栽 新規登録結果 (bonsai-new modal、Phase G4 part 2)
  bonsaiCreateResult: BonsaiCreateResult;
  setBonsaiCreateResult: (bonsaiId: string) => void;
  consumeBonsaiCreateResult: () => string | undefined;
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

  // Sess12 PR-H: PlanScreen selectedDateKey 永続化
  planSelectedDateKey: null,
  setPlanSelectedDateKey: (dateKey) => set({ planSelectedDateKey: dateKey }),

  wateringDayDetailContext: null,
  setWateringDayDetailContext: (ctx) => set({ wateringDayDetailContext: ctx }),
  wateringDayDetailEntry: 'CONSUMED',
  setWateringDayDetailEntry: (bonsaiId) => set({ wateringDayDetailEntry: bonsaiId }),
  consumeWateringDayDetailEntry: () => {
    const result = get().wateringDayDetailEntry;
    if (result === 'CONSUMED') return undefined;
    set({ wateringDayDetailEntry: 'CONSUMED' });
    return result;
  },

  bonsaiCreateResult: 'CONSUMED',
  setBonsaiCreateResult: (bonsaiId) => set({ bonsaiCreateResult: bonsaiId }),
  consumeBonsaiCreateResult: () => {
    const result = get().bonsaiCreateResult;
    if (result === 'CONSUMED') return undefined;
    set({ bonsaiCreateResult: 'CONSUMED' });
    return result;
  },
}));
