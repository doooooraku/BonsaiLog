/**
 * React Navigation / ThemedView / ThemedText が参照する `Colors` 定義。
 *
 * **Source of Truth**: `docs/reference/design_system.md` §2 + `src/core/theme/colors.ts`
 * Expo create-expo-app テンプレの初期値 (`#fff` / `#11181C` / `#0a7ea4` 青) は
 * 削除済 (PR Phase B-1a、design_system.md と乖離していた drift を解消)。
 *
 * 同期方針:
 * - light / dark / outdoor の 3 themes
 * - `src/core/theme/colors.ts` (16 トークン) と整合する形で `background` / `text` /
 *   `tint` / `icon` / `tabIconDefault` / `tabIconSelected` を再マッピング
 * - 値変更時は `pnpm theme:sot` (Source of Truth integrity check) が緑であること
 */

import { Platform } from 'react-native';

import {
  ACCENT_GOLD,
  BG_PRIMARY,
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';

/** dark theme トークン (design_system.md §2-2 完全準拠)。 */
export const DARK_TOKENS = {
  bgPrimary: '#0A0E1A',
  bgSurface: '#131826',
  textPrimary: '#E8E4D6',
  textSecondary: '#B0A897',
  textMuted: '#7A7265',
  brandGreen: '#6B9B7F',
  brandGreenHover: '#7FB095',
  accentBark: '#8C7561',
  accentGold: '#D4B062',
  danger: '#C9575D',
  success: '#7DAE7A',
  border: '#2A2F3E',
  borderStrong: '#4A5060',
} as const;

/** outdoor theme トークン (design_system.md §2-3 WCAG AAA 7:1 準拠)。 */
export const OUTDOOR_TOKENS = {
  bgPrimary: '#FFFFFF',
  bgSurface: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#000000',
  textMuted: '#000000',
  brandGreen: '#000080',
  brandGreenHover: '#000080',
  accentBark: '#000000',
  accentGold: '#000000',
  danger: '#8B0000',
  success: '#004000',
  border: '#000000',
  borderStrong: '#000000',
} as const;

/**
 * React Navigation `Theme` の `colors` 互換マップ。
 * 各 scheme は ThemedText/ThemedView から `useThemeColor()` 経由で参照される。
 */
export const Colors = {
  light: {
    text: TEXT_PRIMARY,
    background: BG_PRIMARY,
    surface: BG_SURFACE,
    textSecondary: TEXT_SECONDARY,
    textMuted: TEXT_MUTED,
    tint: BRAND_GREEN,
    accent: ACCENT_GOLD,
    border: BORDER_DEFAULT,
    icon: TEXT_SECONDARY,
    tabIconDefault: TEXT_MUTED,
    tabIconSelected: BRAND_GREEN,
  },
  dark: {
    text: DARK_TOKENS.textPrimary,
    background: DARK_TOKENS.bgPrimary,
    surface: DARK_TOKENS.bgSurface,
    textSecondary: DARK_TOKENS.textSecondary,
    textMuted: DARK_TOKENS.textMuted,
    tint: DARK_TOKENS.brandGreen,
    accent: DARK_TOKENS.accentGold,
    border: DARK_TOKENS.border,
    icon: DARK_TOKENS.textSecondary,
    tabIconDefault: DARK_TOKENS.textMuted,
    tabIconSelected: DARK_TOKENS.brandGreen,
  },
} as const;

export const Fonts = Platform.select({
  // design_system.md §3-1: Noto Serif JP (display) / Noto Sans JP (body) / Inter (latin)
  // PR #186 で @expo-google-fonts でロード済、ThemedText が直接参照。
  ios: {
    sans: 'NotoSansJP_400Regular',
    serif: 'NotoSerifJP_500Medium',
    rounded: 'NotoSansJP_400Regular',
    mono: 'Inter_400Regular',
  },
  default: {
    sans: 'NotoSansJP_400Regular',
    serif: 'NotoSerifJP_500Medium',
    rounded: 'NotoSansJP_400Regular',
    mono: 'Inter_400Regular',
  },
  web: {
    sans: "'Noto Sans JP', system-ui, -apple-system, sans-serif",
    serif: "'Noto Serif JP', Georgia, serif",
    rounded: "'Noto Sans JP', system-ui, sans-serif",
    mono: "'Inter', SFMono-Regular, monospace",
  },
});
