// P0 (盆栽新規登録時 ULIDError 対策): React Native には Web Crypto API が標準搭載
// されていないため、ulid v3 系が `crypto.getRandomValues` を取得できず
// `ULIDError: Failed to get cryptographically secure random number` で
// 起動 / 保存直後にクラッシュする。react-native-get-random-values polyfill を
// 「他の import より先」に評価して global crypto を提供する。
// 過去 lesson: docs/reference/tasks/lessons/runtime.md に記録。
import 'react-native-get-random-values';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { resolveEffectiveScheme } from '@/src/core/theme/themeResolver';
import { isOnboardingFinished } from '@/src/features/onboarding/onboardingFlow';
import { ensureNotificationChannels } from '@/src/features/notification/scheduler';
import { initializeAds } from '@/src/services/adService';
import { useOnboardingStore } from '@/src/stores/onboardingStore';
import { useProStore } from '@/src/stores/proStore';
import { useSettingsStore } from '@/src/stores/settingsStore';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  // F-15 Phase E (Issue #32, ADR-0015): resolveEffectiveScheme 純関数で
  // themeMode + systemScheme + outdoorMode から実効スキームを決定。
  // インライン式 (PR #66 / #80) を純関数に置換し、ロジックを単一の真実点に集約。
  const systemScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const outdoorMode = useSettingsStore((s) => s.outdoorMode);
  // useColorScheme は 'light' | 'dark' | null | 'unspecified' を返す。
  // resolveEffectiveScheme は 'light' | 'dark' | null/undefined のみ受理するため、
  // 'unspecified' は null に正規化 → light フォールバックさせる。
  const normalizedSystemScheme =
    systemScheme === 'light' || systemScheme === 'dark' ? systemScheme : null;
  const effectiveScheme = resolveEffectiveScheme(themeMode, normalizedSystemScheme, outdoorMode);
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

  // F-26 Phase E (Issue #26, ADR-0018): オンボ未完了 → /onboarding/welcome へリダイレクト
  // isOnboardingFinished 純関数 (#105) で「completed フラグ」または「全 step dismissed」
  // のいずれかで完了扱いに統一 (4 パターン完了判定の真実点を 1 つに集約)。
  const onboardingCompleted = useOnboardingStore((s) => s.completed);
  const onboardingDismissed = useOnboardingStore((s) => s.dismissed);
  const router = useRouter();
  const segments = useSegments() as string[];
  useEffect(() => {
    if (isOnboardingFinished(onboardingCompleted, onboardingDismissed)) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (inOnboarding) return;
    router.replace('/onboarding/welcome' as Href);
  }, [onboardingCompleted, onboardingDismissed, segments, router]);

  return (
    // F-04 Phase E (Issue #29): @gorhom/bottom-sheet に必要な GestureHandlerRootView を root に配置
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
