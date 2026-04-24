import { createFont, createTamagui, createTokens } from 'tamagui';
import { createAnimations } from '@tamagui/animations-react-native';

const tokens = createTokens({
  color: {
    background: '#000000', // ベース黒
    surface: '#0b0b0b', // カード面
    gray: '#222222', // 枠線
    muted: '#888888', // 補足テキスト
    neonGreen: '#39FF14', // メインアクセント
    neonPink: '#FF00FF', // サブアクセント
    cyberBlue: '#00C8FF', // 追加テーマ用
    warning: '#FFA500',
    error: '#FF4D4F',
    text: '#FFFFFF',
    accent: '#39FF14',
    shadow: '#39FF14',
  },
  space: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    true: 16, // default space size baseline for scaling
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
    true: 44, // default component size baseline for scaling (button/input向け)
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
  fast: { type: 'spring', damping: 20, mass: 1.2, stiffness: 250 },
  medium: { type: 'spring', damping: 12, mass: 1, stiffness: 140 },
  slow: { type: 'spring', damping: 18, stiffness: 70 },
  bouncy: { type: 'spring', damping: 15, mass: 0.9, stiffness: 120 },
});

const config = createTamagui({
  tokens,
  themes: {
    dark: {
      background: tokens.color.background,
      surface: tokens.color.surface,
      muted: tokens.color.muted,
      neonGreen: tokens.color.neonGreen,
      neonPink: tokens.color.neonPink,
      gray: tokens.color.gray,
      text: tokens.color.text,
      accent: tokens.color.neonGreen,
      shadow: tokens.color.neonGreen,
    },
    neonPink: {
      background: tokens.color.background,
      surface: '#150013',
      muted: tokens.color.muted,
      neonGreen: tokens.color.neonPink,
      neonPink: tokens.color.neonPink,
      gray: tokens.color.gray,
      text: tokens.color.text,
      accent: tokens.color.neonPink,
      shadow: tokens.color.neonPink,
    },
    cyberBlue: {
      background: tokens.color.background,
      surface: '#00131a',
      muted: tokens.color.muted,
      neonGreen: tokens.color.cyberBlue,
      neonPink: tokens.color.neonPink,
      gray: tokens.color.gray,
      text: tokens.color.text,
      accent: tokens.color.cyberBlue,
      shadow: tokens.color.cyberBlue,
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
