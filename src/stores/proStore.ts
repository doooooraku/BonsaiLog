import { create } from 'zustand';

import type { PlanKind, ProState } from '@/src/types/models';
import { proService, type PlanType } from '@/src/services/proService';

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
}));
