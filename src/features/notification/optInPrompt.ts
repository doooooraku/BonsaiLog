/**
 * contextual soft-ask opt-in 判定 (ADR-0014 Amended)。
 *
 * 「初めて作業予定を登録した瞬間」 に「予定の通知を受け取りますか?」 の soft-ask モーダルを
 * 出すための、揮発フラグ store + 判定ヘルパー。
 *
 * 設計方針:
 * - `notificationOptInPrompted` (settingsStore、永続) で **生涯 1 回**に制限
 * - `showOptIn` は揮発 (永続しない) ので別 store に分離 (settingsStore は全 state 永続のため)
 * - 予定登録の各経路は登録成功後に `maybePromptNotificationOptIn()` を呼ぶだけでよい
 * - 実際の表示は `NotificationOptInHost` (app/_layout.tsx にマウント) が購読して行う
 */
import { create } from 'zustand';

import { useSettingsStore } from '@/src/stores/settingsStore';

type OptInUiState = {
  /** soft-ask モーダルを表示中か (揮発)。 */
  showOptIn: boolean;
  setShowOptIn: (show: boolean) => void;
};

export const useNotificationOptInStore = create<OptInUiState>((set) => ({
  showOptIn: false,
  setShowOptIn: (show) => set({ showOptIn: show }),
}));

/**
 * 予定登録成功後に呼ぶ。 条件を満たせば soft-ask モーダル表示フラグを立てる。
 *
 * 表示条件 (両方 true のときだけ表示):
 * - 通知がまだ OFF (`notificationDailySummaryEnabled === false`)
 * - soft-ask をまだ一度も出していない (`notificationOptInPrompted === false`)
 *
 * 表示すると同時に prompted を true に固定 → 2 回目以降は出さない (生涯 1 回)。
 */
export function maybePromptNotificationOptIn(): void {
  const s = useSettingsStore.getState();
  if (s.notificationDailySummaryEnabled) return;
  if (s.notificationOptInPrompted) return;
  s.setNotificationOptInPrompted(true);
  useNotificationOptInStore.getState().setShowOptIn(true);
}
