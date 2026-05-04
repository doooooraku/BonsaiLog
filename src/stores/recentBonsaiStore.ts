/**
 * 最近見た盆栽 ID リスト store (F-04 Phase H-1, Issue #29 / ADR-0013 §AC6-3)。
 *
 * - 用途: stats タブの BonsaiFilterSheet で「最近見た 3 本」セクションを表示するため
 * - 容量: 最大 3 件 (ADR-0013 §AC6-3、`maxRecent` で外部から変更可能)
 * - 順序: 新しい順 (push されたものが先頭)
 * - 永続化: AsyncStorage (アプリ再起動後も保持)
 *
 * 呼出例:
 * - 盆栽詳細画面 focus 時に `pushRecent(bonsaiId)` を呼ぶ
 * - BonsaiFilterSheet で `recentIds` を取得し `sortBonsaiWithRecent` (純関数) に渡す
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const RECENT_MAX = 3;

type RecentBonsaiState = {
  recentIds: string[];
  /**
   * bonsaiId を先頭に push する。
   * - 既に存在する ID は削除して先頭に再追加 (重複なし)
   * - 最大 RECENT_MAX (= 3) 件まで、超えたら末尾から削除
   */
  pushRecent: (bonsaiId: string) => void;
  /** 全クリア (テスト / リセット用) */
  clear: () => void;
};

export const useRecentBonsaiStore = create<RecentBonsaiState>()(
  persist(
    (set, get) => ({
      recentIds: [],
      pushRecent: (bonsaiId) => {
        if (typeof bonsaiId !== 'string' || bonsaiId.length === 0) return;
        const current = get().recentIds;
        const filtered = current.filter((id) => id !== bonsaiId);
        const next = [bonsaiId, ...filtered].slice(0, RECENT_MAX);
        set({ recentIds: next });
      },
      clear: () => set({ recentIds: [] }),
    }),
    {
      name: 'bonsailog_recent_bonsai_v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
