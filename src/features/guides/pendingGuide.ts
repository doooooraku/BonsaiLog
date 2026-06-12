/**
 * pull 型ガイド要求 (揮発 store) — #1203 / ADR-0058。
 *
 * 使い方一覧 (設定 > 使い方) のトピック tap で「遷移先の画面でこのガイドを 1 回見せて」を
 * 画面に伝える。**seen 状態に関係なく表示する** (user の明示要求 = 再表示のため)。
 *
 * 使い方 (画面側):
 *   const pulled = usePendingGuideStore((s) => s.pending === 'g2RecordCta');
 *   const guideActive = isFocused && (pulled || canShowGuide('g2RecordCta', seen));
 *   const dismiss = () => { markSeen('g2RecordCta'); usePendingGuideStore.getState().clear(); };
 *
 * 揮発 (非永続): アプリ再起動で消えるのが正 (要求はその場限り)。
 */
import { create } from 'zustand';

import type { GuideId } from '@/src/stores/guidesStore';

type PendingGuideState = {
  /** 表示要求中のガイド (同時に 1 つ — オーバーレイ 1 つ原則と同根)。 */
  pending: GuideId | null;
  request: (id: GuideId) => void;
  clear: () => void;
};

export const usePendingGuideStore = create<PendingGuideState>((set) => ({
  pending: null,
  request: (id) => set({ pending: id }),
  clear: () => set({ pending: null }),
}));
