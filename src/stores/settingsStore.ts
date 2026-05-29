/**
 * アプリ全体の設定 store (Zustand + AsyncStorage 永続化)。
 *
 * Related:
 * - Issue #30 F-16 ローカル通知 (notificationDailySummary*、ADR-0014 Amended)
 * - ADR-0014 Amended: 通知は当日まとめの 1 系統に集約 (②水やり通知廃止)、トグル 1 つ、デフォルト OFF
 *
 * Sess19-3 (user 真意「F-05 不要」): eventOverloadEnabled 削除済。
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { PotUnit } from '@/src/types/units';

type ThemeMode = 'light' | 'dark' | 'system';

/** 鉢サイズ単位。型の正は src/types/units.ts (Phase 6 F1b/c で FSD 最下層へ移設)。後方互換で re-export。 */
export type { PotUnit } from '@/src/types/units';

/** F-16 通知時刻の永続化フォーマット ("HH:MM" 24 時間制、Issue #30 / ADR-0014)。 */
export type NotificationTimeString = string;

type SettingsState = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  // ADR-0015 Notes Amended (2026-05-10、PR #312): outdoor mode 削除済 (E4 PR、本セッション)
  /**
   * F-16 通知の有効/無効 (ADR-0014 Amended: 当日まとめ通知の 1 系統に集約。
   * かつての notificationMasterEnabled + notificationDailySummaryEnabled の 2 段は本フラグ 1 つに統合)。
   * - **デフォルト OFF** (起動時に requestNotificationPermission を呼ばない = OS 許可ダイアログ暴発防止)
   * - ON は「初回予定登録時の soft-ask で受け取る」または「設定で手動 ON」のユーザー明示操作時のみ
   * - ON 時のみ `notificationDailySummaryTime` の時刻で当日まとめ通知が発火
   */
  notificationDailySummaryEnabled: boolean;
  setNotificationDailySummaryEnabled: (enabled: boolean) => void;
  /**
   * F-16 当日まとめ通知時刻 ("HH:MM" 24 時間制、デフォルト '07:00'、ADR-0014 §H6)。
   */
  notificationDailySummaryTime: NotificationTimeString;
  setNotificationDailySummaryTime: (time: NotificationTimeString) => void;
  /**
   * F-16 contextual soft-ask モーダルを既に提示したか (ADR-0014 Amended、生涯 1 回制御)。
   * - デフォルト false、初回予定登録時に soft-ask を出したら true に固定 (再表示しない)
   */
  notificationOptInPrompted: boolean;
  setNotificationOptInPrompted: (prompted: boolean) => void;
  /**
   * Sess13 PR-I: 鉢サイズ単位 (cm / mm / inch、 user preference)。
   * - 内部 DB 保存は常に cm 数値、 表示・入力時に単位変換
   * - デフォルト 'cm' (日本人向け、 海外ユーザーは設定で inch に切替可能)
   */
  potUnit: PotUnit;
  setPotUnit: (unit: PotUnit) => void;
  /**
   * Sess22 ADR-0034 D1: カレンダー画面の凡例 collapsible bar の折りたたみ状態。
   * - デフォルト false = 初回展開、 user が toggle した結果を AsyncStorage 永続化
   * - PlanScreen の `<CalendarLegend collapsed={...} onToggle={...} />` で参照
   */
  calendarLegendCollapsed: boolean;
  setCalendarLegendCollapsed: (collapsed: boolean) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // default を 'light' に変更 (2026-05-13): Maestro 検証 + 動作確認を light で統一。
      // 既存 install (zustand persist で themeMode 永続化済) は維持、新規 install / clearState 後は light スタート。
      // ユーザーは設定タブで auto / light / dark に切替可能。
      themeMode: 'light',
      setThemeMode: (mode) => set({ themeMode: mode }),
      // ADR-0014 Amended: 通知は当日まとめ 1 系統に集約、デフォルト OFF (起動時 OS 許可暴発防止)
      notificationDailySummaryEnabled: false,
      setNotificationDailySummaryEnabled: (enabled) =>
        set({ notificationDailySummaryEnabled: enabled }),
      notificationDailySummaryTime: '07:00',
      setNotificationDailySummaryTime: (time) => set({ notificationDailySummaryTime: time }),
      notificationOptInPrompted: false,
      setNotificationOptInPrompted: (prompted) => set({ notificationOptInPrompted: prompted }),
      // Sess13 PR-I: 鉢サイズ単位 default cm
      // Sess15 PR-KK: 実際は起動時に lang-defaults.ts から lang 別 default で強制上書きされる
      // (ADR-0026 案 α: 過去 user なし前提で AsyncStorage persist 値を reset、 src/core/i18n/lang-defaults.ts 参照)。
      potUnit: 'cm' as PotUnit,
      setPotUnit: (unit) => set({ potUnit: unit }),
      // Sess22 ADR-0034 D1: 凡例は初回展開、 user toggle で永続化
      calendarLegendCollapsed: false,
      setCalendarLegendCollapsed: (collapsed) => set({ calendarLegendCollapsed: collapsed }),
    }),
    {
      name: 'myapp-settings',
      storage: createJSONStorage(() => AsyncStorage),
      // Sess15 PR-KK: version 2 に bump + migrate で過去 persist 値を破棄。
      // ADR-0026 案 α (過去 user なし前提) で inch 設定 user の potUnit を強制 reset、
      // 起動時 useSettingsBootstrap hook で lang-default に再設定される。
      version: 2,
      migrate: (persistedState: unknown, fromVersion) => {
        if (fromVersion < 2 && persistedState && typeof persistedState === 'object') {
          // potUnit を一度削除 (rehydrate 後の useSettingsBootstrap hook で lang-default を設定)
          const next = { ...(persistedState as Record<string, unknown>) };
          delete next.potUnit;
          return next as SettingsState;
        }
        return persistedState as SettingsState;
      },
    },
  ),
);
