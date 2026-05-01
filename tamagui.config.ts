import { createFont, createTamagui, createTokens } from 'tamagui';
import { createAnimations } from '@tamagui/animations-react-native';

/**
 * F-15 ダークモード / 屋外モード (ADR-0015)
 * - 4 mode: Auto (system 追従) / Light / Dark / Outdoor
 * - Material 3 dark baseline #121212
 * - Outdoor: 純白 + 純黒 + 緑単色 #1B5E20 (9.7:1 AAA)
 * - F-04 ヒートマップ 3 モード対応 (bonsai_heatmap_l0..l3)
 * - 直 hex 禁止 (ESLint no-direct-hex-in-jsx)、必ず useTheme() 経由で参照
 */

const tokens = createTokens({
  color: {
    // ───────────── 共通アクセント (緑系) ─────────────
    green700: '#1B5E20', // outdoor accent (9.7:1 vs 純白)
    green500: '#2E7D32', // light accent (Material green primary、7.4:1 vs 白)
    green300: '#74C476', // ColorBrewer Greens 4-class L2
    green200: '#7BC97D', // dark accent (Material 3 tone 80、8.5:1 vs #121212)
    green100: '#BAE4B3', // ColorBrewer Greens 4-class L1
    green050: '#F5F8F5', // ColorBrewer Greens 4-class L0 (空セル)
    green800: '#238B45', // ColorBrewer Greens 4-class L3 (light)
    greenDark500: '#4A8A4D', // dark/outdoor heatmap L2
    greenDark300: '#2D4A2E', // dark heatmap L1
    greenOutdoorL1: '#A8D5A8', // outdoor heatmap L1

    // ───────────── light theme トークン ─────────────
    bgLight: '#FFFFFF',
    surfaceLight: '#FAFAFA',
    surface2Light: '#F5F5F5',
    textLight: '#1A1A1A', // 16:1 vs 白 (AAA)
    mutedLight: '#4A4A4A', // 8.6:1 vs 白 (AAA)
    borderLight: '#E0E0E0',

    // ───────────── dark theme トークン (Material 3 baseline) ─────────────
    bgDark: '#121212',
    surfaceDark: '#1E1E1E', // surface +1 elevation
    surface2Dark: '#242424', // surface +2
    textDark: '#E1E1E1', // 14.5:1 vs #121212 (AAA)
    mutedDark: '#A0A0A0', // 8.5:1 vs #121212 (AAA)
    borderDark: '#2C2C2C',

    // ───────────── outdoor theme トークン (純白 + 純黒 + 緑単色) ─────────────
    bgOutdoor: '#FFFFFF',
    surfaceOutdoor: '#FFFFFF', // 同色 (装飾排除、影 OFF)
    textOutdoor: '#000000', // 21:1 vs 白 (理論上限)
    borderOutdoor: '#000000', // 純黒、線幅 2dp+ で形状判別
  },
  space: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    true: 16, // default space size baseline
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    10: 40,
    12: 48,
  },
  size: {
    0: 0,
    1: 20,
    2: 28,
    3: 36,
    4: 44,
    true: 44, // default component size baseline (button/input 向け、WCAG 2.5.5 AAA)
    5: 52,
    6: 64,
    7: 74,
    8: 84,
    9: 94,
    10: 104,
  },
  radius: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 24,
    6: 32,
    7: 40,
  },
  zIndex: {
    0: 0,
    1: 1,
    2: 2,
    5: 5,
    10: 10,
    20: 20,
    30: 30,
  },
});

const bodyFont = createFont({
  family: 'System',
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 22,
    6: 26,
    7: 30,
  },
  lineHeight: {
    1: 16,
    2: 20,
    3: 22,
    4: 24,
    5: 28,
    6: 32,
    7: 36,
  },
  weight: {
    1: '400',
    2: '500',
    3: '600',
    4: '700',
    5: '800',
    6: '900',
    7: '900',
  },
  letterSpacing: {
    1: 0,
    2: 0,
    3: 0.2,
    4: 0.3,
    5: 0.4,
    6: 0.5,
    7: 0.6,
  },
});

const media = {
  maxSm: { maxWidth: 660 },
  maxMd: { maxWidth: 860 },
  maxLg: { maxWidth: 1120 },
} as const;

const animations = createAnimations({
  // F-15: 200ms 標準 (Reduced Motion ON 時はアプリ側で 0ms 強制)
  quick: { type: 'spring', damping: 22, mass: 1, stiffness: 320 },
  fast: { type: 'spring', damping: 20, mass: 1.2, stiffness: 250 },
  medium: { type: 'spring', damping: 12, mass: 1, stiffness: 140 },
  slow: { type: 'spring', damping: 18, stiffness: 70 },
  bouncy: { type: 'spring', damping: 15, mass: 0.9, stiffness: 120 },
});

const config = createTamagui({
  tokens,
  themes: {
    // ───────────── light: 通常モード (デフォルト) ─────────────
    light: {
      background: tokens.color.bgLight,
      surface: tokens.color.surfaceLight,
      surface2: tokens.color.surface2Light,
      color: tokens.color.textLight,
      muted: tokens.color.mutedLight,
      borderColor: tokens.color.borderLight,
      accent: tokens.color.green500, // #2E7D32 (Material green primary、7.4:1 AAA)
      bonsai_heatmap_l0: tokens.color.green050, // #F5F8F5 (ADR-0013 継続)
      bonsai_heatmap_l1: tokens.color.green100, // #BAE4B3
      bonsai_heatmap_l2: tokens.color.green300, // #74C476
      bonsai_heatmap_l3: tokens.color.green800, // #238B45
      bonsai_today_border: tokens.color.green800, // 太枠 2dp
    },

    // ───────────── dark: Material 3 baseline #121212 ─────────────
    dark: {
      background: tokens.color.bgDark,
      surface: tokens.color.surfaceDark,
      surface2: tokens.color.surface2Dark,
      color: tokens.color.textDark,
      muted: tokens.color.mutedDark,
      borderColor: tokens.color.borderDark,
      accent: tokens.color.green200, // #7BC97D (Material 3 tone 80、8.5:1 AAA)
      bonsai_heatmap_l0: tokens.color.surfaceDark, // #1E1E1E (background ≈ 透過印象)
      bonsai_heatmap_l1: tokens.color.greenDark300, // #2D4A2E
      bonsai_heatmap_l2: tokens.color.greenDark500, // #4A8A4D
      bonsai_heatmap_l3: tokens.color.green200, // #7BC97D (8.5:1 AAA)
      bonsai_today_border: tokens.color.green200,
    },

    // ───────────── outdoor: 純白 + 純黒 + 緑単色 ─────────────
    outdoor: {
      background: tokens.color.bgOutdoor,
      surface: tokens.color.surfaceOutdoor, // 同色 (装飾排除)
      surface2: tokens.color.surfaceOutdoor,
      color: tokens.color.textOutdoor, // 21:1 (理論上限)
      muted: tokens.color.textOutdoor, // 屋外モードは muted も純黒
      borderColor: tokens.color.borderOutdoor, // 純黒、線幅 2dp+ 推奨
      accent: tokens.color.green700, // #1B5E20 (緑単色、9.7:1 AAA)
      bonsai_heatmap_l0: tokens.color.bgOutdoor, // #FFFFFF (枠線で識別)
      bonsai_heatmap_l1: tokens.color.greenOutdoorL1, // #A8D5A8
      bonsai_heatmap_l2: tokens.color.greenDark500, // #4A8A4D
      bonsai_heatmap_l3: tokens.color.green700, // #1B5E20 (9.7:1 AAA)
      bonsai_today_border: tokens.color.textOutdoor, // 太枠 2dp 純黒
    },
  },
  fonts: {
    body: bodyFont,
  },
  media,
  animations,
  shorthands: {
    p: 'padding',
    px: 'paddingHorizontal',
    py: 'paddingVertical',
    pt: 'paddingTop',
    pb: 'paddingBottom',
    pl: 'paddingLeft',
    pr: 'paddingRight',
    m: 'margin',
    mx: 'marginHorizontal',
    my: 'marginVertical',
    mt: 'marginTop',
    mb: 'marginBottom',
    ml: 'marginLeft',
    mr: 'marginRight',
    bg: 'backgroundColor',
    br: 'borderRadius',
  },
});
export default config;
