import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
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
