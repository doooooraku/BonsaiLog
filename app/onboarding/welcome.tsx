/**
 * F-26 Phase B Welcome 画面 (Issue #26 / ADR-0018 / mockups v1.0 整合)。
 *
 * Phase B 範囲:
 * - Welcome 画面のみ実装 (Splash → Welcome → 「はじめる」で onboarding.completed=true → ルート復帰)
 * - 「はじめる」CTA 1 つ、スキップなし (Welcome は起点、ADR-0018)
 * - ヘッダー戻る非表示 (Stack 開始点)
 *
 * mockups v1.0 整合 (PR #269、ADR-0021 Notes Amended):
 * - タイトル: serif 32px (Noto Serif JP)、「鉢 1 本ずつ、一生分。」(ADR-0018 §11)
 * - 3 価値訴求: 葉/鍵/本 SVG icon + 17px text (ADR-0018 §12)
 * - 補助文: 「アカウント登録は不要です」 (ADR-0018 §14)
 * - 色は constants/theme + src/core/theme/colors.ts 経由 (R-25 drift 解消、
 *   旧 hardcode `#2E7D32` を BRAND_GREEN=`#1F3A2E` に切替、tokens.css 整合)
 *
 * Phase C 以降:
 * - 言語選択画面 (Screen 3、19 言語 + native + Latin + OS バッジ + 瞬時プレビュー)
 * - 機能チュート (ADR-0020 で 2 ステップに圧縮)
 * - F-15 light 固定 + 太陽アイコン非表示 + 200ms アニメ
 */
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Fonts } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_PRIMARY,
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  ON_BRAND,
  TEXT_MUTED,
  TEXT_PRIMARY,
} from '@/src/core/theme/colors';

type IconProps = { size?: number; color?: string };

function LeafIcon({ size = 32, color = BRAND_GREEN }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M26 6C26 6 12 6 8 14C4 22 10 26 10 26C10 26 14 20 20 16C14 22 10 26 10 26"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M26 6C26 14 22 20 16 22" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function LockIcon({ size = 32, color = BRAND_GREEN }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Rect x={7} y={14} width={18} height={13} rx={2} stroke={color} strokeWidth={1.5} />
      <Path
        d="M11 14V10C11 7.23858 13.2386 5 16 5C18.7614 5 21 7.23858 21 10V14"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Circle cx={16} cy={20} r={1.5} fill={color} />
    </Svg>
  );
}

function BookIcon({ size = 32, color = BRAND_GREEN }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M6 6h9a3 3 0 013 3v18a2 2 0 00-2-2H6V6z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path
        d="M26 6h-9a3 3 0 00-3 3v18a2 2 0 012-2h10V6z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const VALUES = [
  { key: 'onboardingWelcomeValue1', Icon: LeafIcon },
  { key: 'onboardingWelcomeValue2', Icon: LockIcon },
  { key: 'onboardingWelcomeValue3', Icon: BookIcon },
] as const;

export default function OnboardingWelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const handleStart = React.useCallback(() => {
    // Phase C: 言語選択画面へ遷移、completed は言語選択完了時にセット
    router.push('/onboarding/language' as Href);
  }, [router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']} testID="e2e_onboarding_welcome">
      <View style={styles.container}>
        <View style={styles.titleSection}>
          <ThemedText style={styles.title}>{t('onboardingWelcomeTitle')}</ThemedText>
        </View>

        <View style={styles.valueList}>
          {VALUES.map(({ key, Icon }) => (
            <View key={key} style={styles.valueRow}>
              <View style={styles.iconBox}>
                <Icon size={32} color={BRAND_GREEN} />
              </View>
              <ThemedText style={styles.valueText}>{t(key)}</ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('onboardingWelcomeCta')}
            testID="e2e_onboarding_welcome_cta"
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            onPress={handleStart}
          >
            <ThemedText style={styles.ctaText}>{t('onboardingWelcomeCta')}</ThemedText>
          </Pressable>
          <ThemedText style={styles.note}>{t('onboardingWelcomeNote')}</ThemedText>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG_PRIMARY },
  container: { flex: 1 },
  titleSection: {
    paddingTop: 48,
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: Fonts?.serif,
    fontSize: 32,
    lineHeight: 46,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  valueList: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 32,
    gap: 20,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: BG_SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    flex: 1,
    fontFamily: Fonts?.sans,
    fontSize: 17,
    lineHeight: 26,
    color: TEXT_PRIMARY,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  cta: {
    height: 56,
    borderRadius: 12,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    opacity: 0.92,
  },
  ctaText: {
    color: ON_BRAND,
    fontFamily: Fonts?.sans,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500',
  },
  note: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: TEXT_MUTED,
    fontFamily: Fonts?.sans,
  },
});
