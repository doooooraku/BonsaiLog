/**
 * 文脈内ガイド (#1178 / ADR-0058) — seen フラグ永続 store。
 *
 * 設計方針 (ADR-0058 原則):
 * - 各ガイドは一度表示が完了 (= dismiss または目的操作) したら seen 固定、自動では二度と出ない (生涯 1 回)
 * - resetAll は設定 > 使い方「画面のガイドをもう一度見る」(#1179) 専用
 * - onboardingStore (初回起動の 1 本フロー) とはライフサイクルが異なるため分離
 *   (ガイドは各画面の初遭遇時に個別発火し、発火条件もデータ状態に依存する)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * ガイド ID (ADR-0058 §ガイド一覧)。
 * - g1: 盆栽 1 本目登録直後、タブバー「記録」への誘導 (Home)
 * - g2: 記録タブ初回 open、「作業を記録」ボタン強調
 * - g3: 予定タブ初回 open、「予定を追加」ボタン強調
 * - g5: 作業記録の総件数 0→1 の保存直後のお祝い (Toast 流用)
 * - g6: 盆栽詳細初回 open、タブ列 (作業履歴/作業予定) の案内
 * - g4 は欠番 (予定 1 件目バナーは optInPrompt と同瞬間衝突のため不採用 = ADR-0058)
 */
export type GuideId =
  | 'g1RecordTabNudge'
  | 'g2RecordCta'
  | 'g3PlanCta'
  | 'g5FirstRecordCelebrated'
  | 'g6DetailTabs'
  // g7-g10 (#1203): pull 専用 (使い方からの遷移時のみ表示、自動発火 trigger なし — ADR-0058 原則 5)
  | 'g7RegisterCta'
  | 'g8RecurringCreate'
  | 'g9NotificationSettings'
  | 'g10BackupExport';

export const GUIDE_IDS: readonly GuideId[] = [
  'g1RecordTabNudge',
  'g2RecordCta',
  'g3PlanCta',
  'g5FirstRecordCelebrated',
  'g6DetailTabs',
  'g7RegisterCta',
  'g8RecurringCreate',
  'g9NotificationSettings',
  'g10BackupExport',
] as const;

type GuidesState = {
  /** 表示済みガイド (永続)。true = 自動では二度と出さない。 */
  seen: Partial<Record<GuideId, boolean>>;
  markSeen: (id: GuideId) => void;
  /** 設定 > 使い方「画面のガイドをもう一度見る」(#1179) 専用。全ガイドを未視聴に戻す。 */
  resetAll: () => void;
};

export const useGuidesStore = create<GuidesState>()(
  persist(
    (set) => ({
      seen: {},
      markSeen: (id) => set((s) => ({ seen: { ...s.seen, [id]: true } })),
      resetAll: () => set({ seen: {} }),
    }),
    {
      name: 'bonsailog-guides',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
