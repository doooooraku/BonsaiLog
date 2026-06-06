/**
 * React Navigation / ThemedView / ThemedText が参照する `Colors` 定義。
 *
 * **Source of Truth**: `docs/reference/design_system.md` §2 + `src/core/theme/colors.ts`
 * Expo create-expo-app テンプレの初期値 (`#fff` / `#11181C` / `#0a7ea4` 青) は
 * 削除済 (PR Phase B-1a、design_system.md と乖離していた drift を解消)。
 *
 * 同期方針:
 * - light / dark の 2 themes (ADR-0015 Notes Amended 2026-05-10、outdoor 削除済)
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

/**
 * dark theme トークン (design_system.md §2-2 完全準拠)。
 *
 * Sess66 PR4 (ADR-0015 Amendment): 配色を navy 寒色 系から **宵墨 (yoizumi) warm
 * 暖墨** 系に pivot。 「washi 和紙 → sumi 墨 → fukamidori 深緑」 のブランド哲学を
 * dark mode まで延長 (P3「永く、 変わらない」 整合)。
 *
 * 参考: Claude Design `tokens.css` `[data-theme="dark"]` 提案値整合。
 * 旧 navy 系 (#0A0E1A / #131826 / #6B9B7F / #2A2F3E 等) は Sess66 Sess67 で完全置換。
 */
export const DARK_TOKENS = {
  bgPrimary: '#16140F', // 宵墨 yoizumi — 暖かい墨
  bgSurface: '#211E18', // 重ねの紙
  textPrimary: '#ECE6D6', // 淡 washi
  textSecondary: '#B3AA97',
  textMuted: '#837A68',
  brandGreen: '#7FA98A', // 苔緑 — 夜目に映える深緑
  brandGreenHover: '#93BD9E',
  accentBark: '#A1886F',
  accentGold: '#D4B062', // 秋葉色 (Pro バッジ、 両 theme 同色維持)
  danger: '#CE7A72',
  success: '#88B083',
  border: '#2C2820', // 茶味の枠線
  borderStrong: '#4A4534',
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
