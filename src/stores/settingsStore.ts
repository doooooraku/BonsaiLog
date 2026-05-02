/**
 * アプリ全体の設定 store (Zustand + AsyncStorage 永続化)。
 *
 * Related:
 * - Issue #25 F-05 気遣い型ポップアップ ON/OFF (eventOverloadEnabled)
 * - ADR-0011 (F-05 再定義: 「今後表示しない」を選んだら永続的に OFF)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark' | 'system';

type SettingsState = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  /**
   * F-05 気遣い型ポップアップを表示するかどうか (ADR-0011、Issue #25)。
   * - デフォルト ON
   * - Settings → 通知設定 でユーザーが OFF にできる
   * - Alert の「今後表示しない」でも OFF になる
   */
  eventOverloadEnabled: boolean;
  setEventOverloadEnabled: (enabled: boolean) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      setThemeMode: (mode) => set({ themeMode: mode }),
      eventOverloadEnabled: true,
      setEventOverloadEnabled: (enabled) => set({ eventOverloadEnabled: enabled }),
    }),
    {
      name: 'myapp-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
