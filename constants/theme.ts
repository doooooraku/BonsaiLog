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
  ACCENT_BARK,
  ACCENT_GOLD,
  BADGE_SOFT_BG,
  BG_PRIMARY,
  BG_SECONDARY,
  BG_SURFACE,
  BORDER_DEFAULT,
  BORDER_STRONG,
  BRAND_GREEN,
  BRAND_GREEN_BG,
  BUTTON_SECONDARY_BG,
  DANGER,
  DISABLED_BG,
  ON_BRAND,
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
 * Sess69 PR-A (ADR-0015 Amendment / ADR-0052 Amendment): brand-static 撤回。
 * brand 色 (tint / tintSubtle / badgeBg / buttonSecondaryBg / onTint / disabledBg /
 * placeholderBg) も scheme-aware にし、 inline `c.*` 経由でのみ参照する。 light の
 * `BRAND_GREEN = #1F3A2E` 深緑が dark mode `#16140F` 上で contrast 1.5:1 (≪ AA 3.0:1)
 * で破綻する罠を構造的に排除。
 *
 * 参考: Claude Design `tokens.css` `[data-theme="dark"]` 提案値整合。
 * 旧 navy 系 (#0A0E1A / #131826 / #6B9B7F / #2A2F3E 等) は Sess66 Sess67 で完全置換。
 */
export const DARK_TOKENS = {
  bgPrimary: '#16140F', // 宵墨 yoizumi — 暖かい墨
  bgSurface: '#211E18', // 重ねの紙
  bgSecondary: '#252319', // 副次背景 (AdBanner プレースホルダ等、 Sess106 PR-2 追加、 bgPrimary #16140F より約 5% 明)
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
  // Sess69 PR-A: brand scheme-aware tokens (ADR-0015 Amendment 2026-06-06)
  tintSubtle: '#2A3328', // dark 用 brand-subtle bg (light: BRAND_GREEN_BG #F1F8F2 等価)
  badgeBg: '#2C3329', // dark 用 BADGE_SOFT_BG 等価 (light: #E8F0EA)
  buttonSecondaryBg: '#2C3329', // dark 用 BUTTON_SECONDARY_BG 等価 (light: #E8F0EA、 badge と用途分離維持で同色)
  onTint: '#1A1A1A', // 苔緑 #7FA98A bg 上で sumi 文字 (contrast 9.5:1 AAA)
  disabledBg: '#3A3631', // dark 用 DISABLED_BG 等価 (light: #9E9E9E、 sumi 重ね灰)
  placeholderBg: '#3A3631', // 画像 fallback (light: #E0E0E0、 暗灰)
} as const;

/**
 * React Navigation `Theme` の `colors` 互換マップ。
 * 各 scheme は ThemedText/ThemedView から `useThemeColor()` 経由で参照される。
 *
 * Sess69 PR-A: brand scheme-aware 7 prop 追加 (tintSubtle / badgeBg / buttonSecondaryBg /
 * onTint / disabledBg / placeholderBg / accentBark / dangerColor)。 これらは Sess66 PR3
 * ADR-0052 の Allowed tokens (brand-static) を撤回するための受け皿で、 既存
 * `BRAND_GREEN_BG` / `BADGE_SOFT_BG` 等の literal を inline `c.tintSubtle` 等に置換する。
 */
export const Colors = {
  light: {
    text: TEXT_PRIMARY,
    background: BG_PRIMARY,
    surface: BG_SURFACE,
    bgSecondary: BG_SECONDARY, // Sess106 PR-2: AdBanner プレースホルダ用
    textSecondary: TEXT_SECONDARY,
    textMuted: TEXT_MUTED,
    tint: BRAND_GREEN,
    accent: ACCENT_GOLD,
    border: BORDER_DEFAULT,
    // Sess73 PR-2: borderStrong scheme-aware token (chip / EventRow / groupRow card 用、
    // 既存 c.border では WCAG 1.4.11 Non-text Contrast 3.0:1 未達成のため強化版を別 prop で提供)
    borderStrong: BORDER_STRONG, // #8A8274 (vs background #FAF8F1 ≈ 3.05:1 AA pass)
    icon: TEXT_SECONDARY,
    tabIconDefault: TEXT_MUTED,
    tabIconSelected: BRAND_GREEN,
    // Sess69 PR-A: scheme-aware brand tokens
    tintSubtle: BRAND_GREEN_BG, // #F1F8F2 薄緑
    badgeBg: BADGE_SOFT_BG, // #E8F0EA
    buttonSecondaryBg: BUTTON_SECONDARY_BG, // #E8F0EA
    onTint: ON_BRAND, // #FFFFFF
    disabledBg: DISABLED_BG, // #9E9E9E
    placeholderBg: '#E0E0E0', // 画像 fallback (BonsaiPlaceholder.tsx で個別利用)
    accentBark: ACCENT_BARK, // #5A4637
    dangerColor: DANGER, // #8B2E2E (`danger` は React Navigation 既存 prop と衝突回避で `dangerColor`)
  },
  dark: {
    text: DARK_TOKENS.textPrimary,
    background: DARK_TOKENS.bgPrimary,
    surface: DARK_TOKENS.bgSurface,
    bgSecondary: DARK_TOKENS.bgSecondary, // Sess106 PR-2: AdBanner プレースホルダ用
    textSecondary: DARK_TOKENS.textSecondary,
    textMuted: DARK_TOKENS.textMuted,
    tint: DARK_TOKENS.brandGreen,
    accent: DARK_TOKENS.accentGold,
    border: DARK_TOKENS.border,
    // Sess73 PR-2: borderStrong scheme-aware (dark で chip card 境界線可視化、 c.border=#2C2820
    // と c.surface=#211E18 の contrast ≈ 1.4:1 で視認不能だった既存予定 chip / EventRow を救う)
    borderStrong: DARK_TOKENS.borderStrong, // #4A4534 (vs surface #211E18 ≈ 3.18:1 AA pass)
    icon: DARK_TOKENS.textSecondary,
    tabIconDefault: DARK_TOKENS.textMuted,
    tabIconSelected: DARK_TOKENS.brandGreen,
    // Sess69 PR-A: scheme-aware brand tokens
    tintSubtle: DARK_TOKENS.tintSubtle, // #2A3328
    badgeBg: DARK_TOKENS.badgeBg, // #2C3329
    buttonSecondaryBg: DARK_TOKENS.buttonSecondaryBg, // #2C3329
    onTint: DARK_TOKENS.onTint, // #1A1A1A sumi 文字 (苔緑 bg 上 AAA 9.5:1)
    disabledBg: DARK_TOKENS.disabledBg, // #3A3631
    placeholderBg: DARK_TOKENS.placeholderBg, // #3A3631
    accentBark: DARK_TOKENS.accentBark, // #A1886F
    dangerColor: DARK_TOKENS.danger, // #CE7A72
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
