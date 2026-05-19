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

/** Sess13 PR-I: 鉢サイズ単位 (cm / mm / inch、 user preference、 Q-7 b 採用)。 */
export type PotUnit = 'cm' | 'mm' | 'inch';

/** F-16 通知時刻の永続化フォーマット ("HH:MM" 24 時間制、Issue #30 / ADR-0014)。 */
export type NotificationTimeString = string;

type SettingsState = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  // ADR-0015 Notes Amended (2026-05-10、PR #312): outdoor mode 削除済 (E4 PR、本セッション)
  /**
   * F-16 通知マスタートグル (ADR-0014 §30、Issue #423 / Issue #330 A2b)。
   * - デフォルト true (有効)、AsyncStorage キー 'myapp-settings.notificationMasterEnabled'
   * - OFF 時、scheduler.ts は通知予約を全停止 (個別 toggle の状態に関わらず)
   * - OFF → ON 復帰時、個別 toggle (summary / watering / event overload) は永続化された
   *   前回値で復元 (本 state は独立)
   */
  notificationMasterEnabled: boolean;
  setNotificationMasterEnabled: (enabled: boolean) => void;
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
  /**
   * Sess13 PR-I: 鉢サイズ単位 (cm / mm / inch、 user preference)。
   * - 内部 DB 保存は常に cm 数値、 表示・入力時に単位変換
   * - デフォルト 'cm' (日本人向け、 海外ユーザーは設定で inch に切替可能)
   */
  potUnit: PotUnit;
  setPotUnit: (unit: PotUnit) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // default を 'light' に変更 (2026-05-13): Maestro 検証 + 動作確認を light で統一。
      // 既存 install (zustand persist で themeMode 永続化済) は維持、新規 install / clearState 後は light スタート。
      // ユーザーは設定タブで auto / light / dark に切替可能。
      themeMode: 'light',
      setThemeMode: (mode) => set({ themeMode: mode }),
      // ADR-0014 §30 / §32: master = ON 既定、AsyncStorage 永続化 ('myapp-settings')
      notificationMasterEnabled: true,
      setNotificationMasterEnabled: (enabled) => set({ notificationMasterEnabled: enabled }),
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
      // Sess13 PR-I: 鉢サイズ単位 default cm
      potUnit: 'cm' as PotUnit,
      setPotUnit: (unit) => set({ potUnit: unit }),
    }),
    {
      name: 'myapp-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
