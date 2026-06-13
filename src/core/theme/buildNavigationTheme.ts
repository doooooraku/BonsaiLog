/**
 * React Navigation `Theme` ビルダー (Phase B-1a)。
 *
 * `effectiveScheme` ('light' | 'dark') から `@react-navigation/native` の
 * `Theme` オブジェクトを生成し、`<ThemeProvider value={theme}>` に渡せる形にする。
 *
 * Source of Truth: `constants/theme.ts` Colors + `src/core/theme/colors.ts`。
 * 値の出所を 1 経路 (Colors) に集約し、ThemedView/ThemedText は同経路を参照する。
 */
import { DefaultTheme, type Theme } from 'expo-router/react-navigation';

import { Colors } from '@/constants/theme';
import type { EffectiveScheme } from './themeResolver';

/**
 * 実効スキームから React Navigation Theme を構築する純関数。
 *
 * - background = `Colors[scheme].background` (light = washi、dark = OLED-safe 紺黒)
 * - text = `Colors[scheme].text`
 * - primary = `Colors[scheme].tint` (Brand 緑)
 * - card = `Colors[scheme].surface` (Stack header / Tab bar の背景)
 * - border = `Colors[scheme].border`
 *
 * 旧 DarkTheme/DefaultTheme の `#fff` / `#11181C` は使わない。
 */
export function buildNavigationTheme(scheme: EffectiveScheme): Theme {
  const c = Colors[scheme];
  return {
    ...DefaultTheme,
    dark: scheme === 'dark',
    colors: {
      ...DefaultTheme.colors,
      primary: c.tint,
      background: c.background,
      card: c.surface,
      text: c.text,
      border: c.border,
      notification: c.tint,
    },
  };
}
