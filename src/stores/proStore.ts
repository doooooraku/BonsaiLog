import { create } from 'zustand';

import type { PlanKind, ProState } from '@/src/types/models';
import { proService, type PlanType } from '@/src/services/proService';
import { nowUtc } from '@/src/core/datetime/clock';

type ProStore = {
  state: ProState | null;
  isPro: boolean;
  planType: PlanKind | null;
  expirationDate: string | null;
  managementURL: string | null;
  initialized: boolean;
  busy: boolean;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  purchase: (plan: PlanType) => Promise<ProState>;
  restore: () => Promise<{ state: ProState; hasActive: boolean }>;
  devSetPro: (on: boolean) => Promise<void>;
};

function spreadPlanFields(s: ProState) {
  return {
    isPro: s.isPro,
    planType: s.planType ?? null,
    expirationDate: s.expirationDate ?? null,
    managementURL: s.managementURL ?? null,
  };
}

export const useProStore = create<ProStore>((set, get) => ({
  state: null,
  isPro: false,
  planType: null,
  expirationDate: null,
  managementURL: null,
  initialized: false,
  busy: false,
  init: async () => {
    if (get().initialized) return;
    const local = await proService.loadLocalState();
    if (local) {
      set({ state: local, ...spreadPlanFields(local) });
    }
    set({ initialized: true });
  },
  refresh: async () => {
    set({ busy: true });
    try {
      const state = await proService.refreshCustomerInfo();
      if (state) {
        set({ state, ...spreadPlanFields(state), initialized: true });
      }
    } finally {
      set({ busy: false });
    }
  },
  purchase: async (plan) => {
    set({ busy: true });
    try {
      const state = await proService.purchase(plan);
      set({ state, ...spreadPlanFields(state), initialized: true });
      return state;
    } finally {
      set({ busy: false });
    }
  },
  restore: async () => {
    set({ busy: true });
    try {
      const result = await proService.restore();
      set({ state: result.state, ...spreadPlanFields(result.state), initialized: true });
      return result;
    } finally {
      set({ busy: false });
    }
  },
  // 開発専用 (__DEV__ 限定): 課金状態を手動で ON/OFF し、実機で Pro 限定機能の見え方を確認する。
  // 本番 build では呼び出し元 (設定画面の DEV セクション) ごと枝刈りされるが、二重防御で early return する。
  devSetPro: async (on) => {
    if (!__DEV__) return;
    const state: ProState = {
      isPro: on,
      anonUserId: 'dev-override',
      lastCheckAt: nowUtc() as string,
      planType: null,
      expirationDate: null,
      managementURL: null,
    };
    await proService.devSaveState(state);
    set({ state, ...spreadPlanFields(state), initialized: true });
  },
}));
