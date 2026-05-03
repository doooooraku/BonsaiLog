/**
 * F-09 検索履歴 zustand store + AsyncStorage 永続化 (Phase F、Issue #31 / ADR-0008 改訂)。
 *
 * AC7-1 AsyncStorage 最大 20 件 FIFO の本実装:
 * - Phase D で導入した純関数 (#102) を呼び出す薄いラッパー
 * - persist middleware で AsyncStorage に自動同期
 * - normalizeSearchQuery で push 時に正規化 (Y4 trim + Y5 case-insensitive)
 *
 * 既存 onboardingStore (#81) と同じパターン。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  clearSearchHistory,
  normalizeSearchQuery,
  pushSearchHistory,
  removeFromSearchHistory,
} from './queryHistory';

type SearchHistoryStore = {
  /** 検索履歴 (新しい順)。 */
  history: string[];
  /** 履歴に追加 (内部で normalize + 重複排除 + 20 件 FIFO)。空 query は no-op。 */
  push: (query: string) => void;
  /** 履歴を全クリア (AC7-3 「履歴を削除」)。 */
  clear: () => void;
  /** 個別削除 (拡張用、UI 個別削除ボタン)。 */
  remove: (query: string) => void;
};

export const useSearchHistoryStore = create<SearchHistoryStore>()(
  persist(
    (set) => ({
      history: [],
      push: (query) =>
        set((state) => {
          const normalized = normalizeSearchQuery(query);
          if (normalized.length === 0) return state;
          return { history: pushSearchHistory(state.history, normalized) };
        }),
      clear: () => set({ history: clearSearchHistory() }),
      remove: (query) =>
        set((state) => ({
          history: removeFromSearchHistory(state.history, normalizeSearchQuery(query)),
        })),
    }),
    {
      name: 'bonsailog-search-history',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
