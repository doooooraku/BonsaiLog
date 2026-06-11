/**
 * レビュー依頼の試行履歴 store (Zustand + AsyncStorage 永続化、ADR-0006 Sess98 Amendment + 追補 2)。
 *
 * - D5: 表示/キャンセル/送信の別は検知不可 (OS 仕様) のため「requestReview() を呼んだ = 試行」として記録
 * - 自前の年間/生涯 cap は持たない (頻度制御は OS quota に任せる)。 持つのは
 *   cooldown 起点 (lastRequestAtUtc) + 増分判定の起点 (countAtLastRequest) のみ
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { nowUtc } from '@/src/core/datetime';

type ReviewState = {
  /** D4: 初回起動 UTC ISO (3 日保護の起点)。 bootstrapReviewFirstLaunch が起動時に刻む。 */
  firstLaunchAtUtc: string | null;
  /** 試行回数 (閾値チューニング用の参考値。 判定には未使用)。 */
  requestCount: number;
  /** 直近試行の UTC ISO (cooldown の起点)。 */
  lastRequestAtUtc: string | null;
  /** 直近試行時点の累計 logged 数 (ループ条件「+10 件」の起点、 null = 未試行)。 */
  countAtLastRequest: number | null;
  ensureFirstLaunch: () => void;
  markRequested: (totalLoggedCount: number) => void;
};

export const useReviewStore = create<ReviewState>()(
  persist(
    (set, get) => ({
      firstLaunchAtUtc: null,
      requestCount: 0,
      lastRequestAtUtc: null,
      countAtLastRequest: null,
      ensureFirstLaunch: () => {
        if (get().firstLaunchAtUtc == null) set({ firstLaunchAtUtc: nowUtc() as string });
      },
      markRequested: (totalLoggedCount) =>
        set((s) => ({
          requestCount: s.requestCount + 1,
          lastRequestAtUtc: nowUtc() as string,
          countAtLastRequest: totalLoggedCount,
        })),
    }),
    {
      name: 'bonsailog-review',
      storage: createJSONStorage(() => AsyncStorage),
      // Sess98 追補 2: lastMilestone → countAtLastRequest へ shape 変更。 旧 shape を含む
      // 配布ビルドは存在しない (versionCode 14 未ビルド) ため migrate 不要、 version のみ刻む。
      version: 2,
    },
  ),
);

/**
 * 初回起動時刻の bootstrap (app/_layout.tsx の useEffect から 1 回呼ぶ)。
 *
 * AsyncStorage の rehydration は非同期のため、 hydration 完了前に ensureFirstLaunch すると
 * 「初期値 null を見て now を書く → 後から永続値で上書き → storage に now が残る」 race で
 * 既存ユーザーの起点が起動ごとに前進し、 D4 の 3 日保護を永遠に超えられなくなる。
 * 必ず hydration 完了後に刻む。
 */
export function bootstrapReviewFirstLaunch(): void {
  if (useReviewStore.persist.hasHydrated()) {
    useReviewStore.getState().ensureFirstLaunch();
    return;
  }
  useReviewStore.persist.onFinishHydration(() => {
    useReviewStore.getState().ensureFirstLaunch();
  });
}
