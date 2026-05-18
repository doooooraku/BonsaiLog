// P0 (盆栽新規登録時 ULIDError 対策): React Native には Web Crypto API が標準搭載
// されていないため、ulid v3 系が `crypto.getRandomValues` を取得できず
// `ULIDError: Failed to get cryptographically secure random number` で
// 起動 / 保存直後にクラッシュする。react-native-get-random-values polyfill を
// 「他の import より先」に評価して global crypto を提供する。
// 過去 lesson: docs/reference/tasks/lessons/runtime.md に記録。
import 'react-native-get-random-values';

import { Inter_400Regular, useFonts as useInterFonts } from '@expo-google-fonts/inter';
import { NotoSansJP_400Regular, NotoSansJP_600SemiBold } from '@expo-google-fonts/noto-sans-jp';
import { NotoSerifJP_500Medium } from '@expo-google-fonts/noto-serif-jp';
import { ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { buildNavigationTheme } from '@/src/core/theme/buildNavigationTheme';
import { resolveEffectiveScheme } from '@/src/core/theme/themeResolver';
import { isOnboardingFinished } from '@/src/features/onboarding/onboardingFlow';
import { ensureNotificationChannels } from '@/src/features/notification/scheduler';
import { initializeAds } from '@/src/services/adService';
import { useOnboardingStore } from '@/src/stores/onboardingStore';
import { useProStore } from '@/src/stores/proStore';
import { useSettingsStore } from '@/src/stores/settingsStore';

// design_system.md §3-1 のフォントを Splash 中にロードして FOUT を防ぐ。
SplashScreen.preventAutoHideAsync().catch(() => {
  /* 既に hide 済 / 二重呼び出しは無視 */
});

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  // design_system.md §3-1 のフォントを @expo-google-fonts でロード。
  // 全フォントが ready になるまで Splash を維持し、ready 後に hide。
  const [fontsLoaded] = useInterFonts({
    Inter_400Regular,
    NotoSansJP_400Regular,
    NotoSansJP_600SemiBold,
    NotoSerifJP_500Medium,
  });
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {
        /* 既に hide 済は無視 */
      });
    }
  }, [fontsLoaded]);

  // F-15 Phase E (Issue #32, ADR-0015 + Notes Amended 2026-05-10): resolveEffectiveScheme
  // 純関数で themeMode + systemScheme から実効スキームを決定 (3 mode: system/light/dark)。
  // outdoor mode は ADR-0015 Notes Amended で v1.0 不採用 (PR #312、E4 PR で削除済)。
  const systemScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  // useColorScheme は 'light' | 'dark' | null | 'unspecified' を返す。
  // resolveEffectiveScheme は 'light' | 'dark' | null/undefined のみ受理するため、
  // 'unspecified' は null に正規化 → light フォールバックさせる。
  const normalizedSystemScheme =
    systemScheme === 'light' || systemScheme === 'dark' ? systemScheme : null;
  const effectiveScheme = resolveEffectiveScheme(themeMode, normalizedSystemScheme);
  // Phase B-1b: 旧 DarkTheme/DefaultTheme を捨て、design_system.md §2 整合の
  // buildNavigationTheme で background/text/primary/card/border を再構築。
  const navigationTheme = buildNavigationTheme(effectiveScheme);
  const headerColors = Colors[effectiveScheme];

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

  // フォント未ロード時は何もレンダリングしない (Splash が見える)。
  if (!fontsLoaded) {
    return null;
  }

  return (
    // F-04 Phase E (Issue #29): @gorhom/bottom-sheet に必要な GestureHandlerRootView を root に配置
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: headerColors.background }}>
      <ThemeProvider value={navigationTheme}>
        <Stack
          screenOptions={{
            // Phase B-1b: Stack header を Colors 経由 (washi 背景 + 墨テキスト + brand tint)
            headerStyle: { backgroundColor: headerColors.surface },
            headerTintColor: headerColors.text,
            headerTitleStyle: { color: headerColors.text },
            contentStyle: { backgroundColor: headerColors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          {/* fix/247 (post-ADR-0020): Paywall は自前 Header を持つので Stack header 非表示。
              modal presentation で × タップ時に history が空でも自然に閉じられる。 */}
          <Stack.Screen name="pro" options={{ headerShown: false, presentation: 'modal' }} />
          {/* Issue #507: (modals) group の root Stack 登録漏れ修正。
              expo-router で group route が root Stack に未登録だと default header が「(modals)」 を表示する。
              (modals)/_layout.tsx の child Stack で各 modal の title 制御 (例: bonsai-new → 「盆栽を登録」)。 */}
          <Stack.Screen name="(modals)" options={{ headerShown: false }} />
          {/* Sess9 PR-3 (ADR-0008 §Notes Amended 2026-05-18): タグ追加 / 編集の自前全画面。
              presentation 未指定 = default 'card' = iOS/Android 共に push transition (案 A)。
              旧 app/tags.tsx の Alert.alert 素っ気ない popup を置換、 設定 → タグを管理 → row tap で起動。 */}
          <Stack.Screen name="tag-edit" options={{ title: '' }} />
          {/* Sess9 PR-9 (user Q3 拡張 2、 Apple Notes パターン): タグ別盆栽一覧。
              タグ管理画面 → row 長押しで起動、 該当タグが付いた盆栽カードを一覧表示。
              dynamic title はスクリーン内 Stack.Screen options で 「タグ名 の盆栽 (N 件)」 設定。 */}
          <Stack.Screen name="tag-bonsai-list" options={{ title: '' }} />
        </Stack>
        <StatusBar style={effectiveScheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
