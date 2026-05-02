import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ensureNotificationChannels } from '@/src/features/notification/scheduler';
import { initializeAds } from '@/src/services/adService';
import { useProStore } from '@/src/stores/proStore';
import { useSettingsStore } from '@/src/stores/settingsStore';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  // F-15 Phase A: themeMode が 'system' なら OS 連動、それ以外はユーザー選択を強制 (ADR-0015)。
  // 'outdoor' は Phase B で Tamagui themes 全面再設計とともに導入予定 (本 PR では Light fallback)。
  const systemScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const effectiveScheme = themeMode === 'system' ? systemScheme : themeMode;
  const isDark = effectiveScheme === 'dark';

  // F-LEGAL-001 Phase A (Issue #37, ADR-0017): Pro 状態を初期化し、Free 時のみ ATT/UMP + AdMob 初期化。
  // Pro 加入者は ATT/UMP を発火させない (ADR-0010 / Repolog 教訓)。実機検証は Phase B + 人間タスク。
  const initPro = useProStore((s) => s.init);
  const isPro = useProStore((s) => s.isPro);
  const proInitialized = useProStore((s) => s.initialized);

  useEffect(() => {
    initPro();
  }, [initPro]);

  // F-16 Phase A (Issue #30, ADR-0014): Android 通知チャネル (WATERING / DAILY_SUMMARY) を起動時に確保。
  // permission リクエストと reschedule は Settings 操作時 (Phase B) に呼ぶ。
  useEffect(() => {
    ensureNotificationChannels().catch(() => {
      // チャネル作成失敗は致命的ではない (iOS は no-op)
    });
  }, []);

  useEffect(() => {
    if (!proInitialized) return;
    if (isPro) return;
    initializeAds().catch(() => {
      // 同意取得失敗時は no-op (adService 内で fallback 済)
    });
  }, [proInitialized, isPro]);

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
