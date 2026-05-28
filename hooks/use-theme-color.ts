/**
 * useThemeColor — ThemedView/ThemedText が背景色・テキスト色を取得する hook。
 *
 * Phase B-1c (PR #223): 旧版は useColorScheme (system) を直接参照していたが、
 * これでは app/_layout.tsx の `<ThemeProvider value={buildNavigationTheme(effectiveScheme)}>`
 * と経路が分離し、ThemedView の背景は ThemeProvider 経由で light (washi)、
 * ThemedText の色は system の dark を見て `Colors.dark.text` = '#E8E4D6' (淡 washi)
 * という不整合が発生していた (実機スクショ 15237/15238 の text 同色化問題)。
 *
 * 本版は `resolveEffectiveScheme(themeMode, systemScheme)` を経由し、
 * ThemeProvider と完全一致した scheme で Colors を解決する。
 * (ADR-0015 Notes Amended 2026-05-10、outdoor mode 削除済)
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { resolveEffectiveScheme } from '@/src/core/theme/themeResolver';
import { useSettingsStore } from '@/src/stores/settingsStore';

export function useThemeColor(
  props: { light?: string | undefined; dark?: string | undefined },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark,
) {
  const systemScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const normalized = systemScheme === 'light' || systemScheme === 'dark' ? systemScheme : null;
  const theme = resolveEffectiveScheme(themeMode, normalized);

  const colorFromProps = props[theme];
  if (colorFromProps) return colorFromProps;
  return Colors[theme][colorName];
}
