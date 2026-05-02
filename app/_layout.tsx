import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ensureNotificationChannels } from '@/src/features/notification/scheduler';
import { initializeAds } from '@/src/services/adService';
import { useOnboardingStore } from '@/src/stores/onboardingStore';
import { useProStore } from '@/src/stores/proStore';
import { useSettingsStore } from '@/src/stores/settingsStore';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  // F-15 Phase A: themeMode が 'system' なら OS 連動、それ以外はユーザー選択を強制 (ADR-0015)。
  // F-15 Phase B (Issue #32): outdoorMode が true のときは Light fallback で動作 (Phase C で
  // Tamagui themes 全面再設計時に純白+純黒+緑単色パレットを適用)。
  const systemScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const outdoorMode = useSettingsStore((s) => s.outdoorMode);
  const effectiveScheme = outdoorMode ? 'light' : themeMode === 'system' ? systemScheme : themeMode;
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

  // F-26 Phase B (Issue #26, ADR-0018): オンボ未完了 → /onboarding/welcome へリダイレクト
  const onboardingCompleted = useOnboardingStore((s) => s.completed);
  const router = useRouter();
  const segments = useSegments() as string[];
  useEffect(() => {
    if (onboardingCompleted) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (inOnboarding) return;
    router.replace('/onboarding/welcome' as Href);
  }, [onboardingCompleted, segments, router]);

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
