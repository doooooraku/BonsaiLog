/**
 * アプリ全体の設定 store (Zustand + AsyncStorage 永続化)。
 *
 * Related:
 * - Issue #25 F-05 気遣い型ポップアップ ON/OFF (eventOverloadEnabled)
 * - Issue #30 F-16 ローカル通知 (notificationDailySummary* / notificationWateringRepeat*、ADR-0014)
 * - ADR-0011 (F-05 再定義: 「今後表示しない」を選んだら永続的に OFF)
 * - ADR-0014 §通知設定の既定値 (デフォルト 1 回 / 朝 07:00、当日まとめ 07:00、K1 = OFF 初期化)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark' | 'system';

/** F-16 通知時刻の永続化フォーマット ("HH:MM" 24 時間制、Issue #30 / ADR-0014)。 */
export type NotificationTimeString = string;

type SettingsState = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  /**
   * F-15 Phase B (Issue #32, ADR-0015): outdoor mode 独立トグル。
   * - true: 屋外モード ON (純白+純黒+緑単色、Phase C で本実装、本 PR は Light fallback)
   * - false: themeMode を尊重 (system/light/dark)
   * - デフォルト false
   */
  outdoorMode: boolean;
  setOutdoorMode: (enabled: boolean) => void;
  /**
   * F-05 気遣い型ポップアップを表示するかどうか (ADR-0011、Issue #25)。
   * - デフォルト ON
   * - Settings → 通知設定 でユーザーが OFF にできる
   * - Alert の「今後表示しない」でも OFF になる
   */
  eventOverloadEnabled: boolean;
  setEventOverloadEnabled: (enabled: boolean) => void;
  /**
   * F-16 当日まとめ通知の有効/無効 (ADR-0014 §30 / §K1、Issue #30)。
   * - デフォルト OFF (チュートリアル「あとで」/スキップ時の K1 既定)
   * - ON 時のみ `notificationDailySummaryTime` の時刻で発火
   */
  notificationDailySummaryEnabled: boolean;
  setNotificationDailySummaryEnabled: (enabled: boolean) => void;
  /**
   * F-16 当日まとめ通知時刻 ("HH:MM" 24 時間制、デフォルト '07:00'、ADR-0014 §H6)。
   */
  notificationDailySummaryTime: NotificationTimeString;
  setNotificationDailySummaryTime: (time: NotificationTimeString) => void;
  /**
   * F-16 水やり繰り返し通知の有効/無効 (ADR-0014 §水やり通知の最大数、Issue #30)。
   */
  notificationWateringRepeatEnabled: boolean;
  setNotificationWateringRepeatEnabled: (enabled: boolean) => void;
  /**
   * F-16 水やり繰り返し通知時刻リスト (ADR-0014 §H3、最大 5 件、デフォルト ['07:00'])。
   */
  notificationWateringRepeatTimes: NotificationTimeString[];
  setNotificationWateringRepeatTimes: (times: NotificationTimeString[]) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      setThemeMode: (mode) => set({ themeMode: mode }),
      outdoorMode: false,
      setOutdoorMode: (enabled) => set({ outdoorMode: enabled }),
      eventOverloadEnabled: true,
      setEventOverloadEnabled: (enabled) => set({ eventOverloadEnabled: enabled }),
      notificationDailySummaryEnabled: false,
      setNotificationDailySummaryEnabled: (enabled) =>
        set({ notificationDailySummaryEnabled: enabled }),
      notificationDailySummaryTime: '07:00',
      setNotificationDailySummaryTime: (time) => set({ notificationDailySummaryTime: time }),
      notificationWateringRepeatEnabled: false,
      setNotificationWateringRepeatEnabled: (enabled) =>
        set({ notificationWateringRepeatEnabled: enabled }),
      notificationWateringRepeatTimes: ['07:00'],
      setNotificationWateringRepeatTimes: (times) =>
        set({ notificationWateringRepeatTimes: times }),
    }),
    {
      name: 'myapp-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
