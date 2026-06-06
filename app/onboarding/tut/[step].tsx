/**
 * F-26 Phase G — Step 1-5 機能チュート動的画面 (Issue #26 / ADR-0018)。
 *
 * 1 ファイルで 5 step 全対応:
 * - useLocalSearchParams で step を取得
 * - getTutorialStepMeta(step) で アイコン + i18n キーを動的解決
 * - Phase D `getNextOnboardingStep` (#105) で次画面決定
 * - 「次へ」: markDismissed(step) → 次 step へ navigate
 * - 「あとで」: 残り全 step を dismissed 化 → completed=true → ホームへ
 * - **Step 5 (tut5)** (F-16 ADR-0014 Amended): 通知の「予告」のみ。OS permission は撃たず
 *   「次へ」 と同じく step を進めるだけ。実際の通知 opt-in は初回予定登録時の soft-ask で行う。
 *
 * 不正な step (welcome/language/未知) は welcome へリダイレクト。
 */
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
import { BRAND_GREEN, ON_BRAND } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { getNextOnboardingStep } from '@/src/features/onboarding/onboardingFlow';
import {
  TUTORIAL_STEPS,
  getTutorialStepMeta,
  isTutorialStep,
} from '@/src/features/onboarding/tutorialSteps';
import { useOnboardingStore, type OnboardingStep } from '@/src/stores/onboardingStore';

export default function OnboardingTutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  // Sess65 PR2-d: safe bg + title/body color を useColors 動的化。 OS dark でも washi beige
  // 残存していた tut 5 step を dark 追従化。
  const c = useColors();
  const params = useLocalSearchParams<{ step?: string }>();

  const stepParam = typeof params.step === 'string' ? params.step : '';
  const meta = getTutorialStepMeta(stepParam);

  const markDismissed = useOnboardingStore((s) => s.markDismissed);
  const setCompleted = useOnboardingStore((s) => s.setCompleted);
  const dismissed = useOnboardingStore((s) => s.dismissed);

  // 不正な step → welcome に戻す (Phase B が表示)
  React.useEffect(() => {
    if (!meta) {
      router.replace('/onboarding/welcome' as Href);
    }
  }, [meta, router]);

  if (!meta) return null;

  // 共通: この step を dismiss → 次画面決定
  const advanceStep = () => {
    markDismissed(meta.step);
    const updatedDismissed = { ...dismissed, [meta.step]: true };
    const next = getNextOnboardingStep(false, updatedDismissed);
    if (next === null || !isTutorialStep(next)) {
      // 残りなし → 完了 → ホームへ
      setCompleted(true);
      router.replace('/(tabs)/bonsai' as Href);
      return;
    }
    router.replace(`/onboarding/tut/${next}` as Href);
  };

  // 「次へ」/「始める」: 全 step 共通。tut5 (通知予告) も OS permission は撃たず step を進めるだけ。
  // 実際の通知 opt-in は初回予定登録時の soft-ask で行う (ADR-0014 Amended)。
  const handleNext = () => {
    advanceStep();
  };

  // 「あとで」: 残り全 tut を dismissed 化 → completed → ホームへ
  const handleSkipAll = () => {
    for (const tutMeta of TUTORIAL_STEPS) {
      markDismissed(tutMeta.step as OnboardingStep);
    }
    setCompleted(true);
    router.replace('/(tabs)/bonsai' as Href);
  };

  const isStep5 = meta.step === 'tut5';
  // tut5 は最終 step なので CTA を「始める」、それ以外は「次へ」。どちらも handleNext (advanceStep)。
  const ctaLabel = isStep5 ? t('onboardingTut5Cta') : t('onboardingTutNext');
  const ctaHandler = handleNext;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: c.background }]}
      edges={['top', 'bottom']}
      testID="e2e_onboarding_tut"
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('back')}
          testID="e2e_onboarding_tut_back"
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
        >
          <ThemedText style={styles.backIcon}>‹</ThemedText>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.iconRow}>
          {/* Bell は outline SVG で mockup 整合 (Sess5 PR-2)、他 icon は将来 Lucide 導入まで絵文字 fallback で a11y 維持。 */}
          {meta.icon === 'bell' ? (
            <BellIcon size={64} color={BRAND_GREEN} />
          ) : (
            <ThemedText style={styles.iconText} accessibilityLabel={meta.icon}>
              {ICON_FALLBACK[meta.icon] ?? '•'}
            </ThemedText>
          )}
        </View>
        <ThemedText style={[styles.title, { color: c.text }]}>
          {t(meta.titleKey as TranslationKey)}
        </ThemedText>
        <ThemedText style={[styles.body, { color: c.textSecondary }]}>
          {t(meta.bodyKey as TranslationKey)}
        </ThemedText>
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          testID={`e2e_onboarding_tut_next_${meta.step}`}
          style={styles.cta}
          onPress={ctaHandler}
        >
          <ThemedText style={styles.ctaText}>{ctaLabel}</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('skipForLater')}
          testID={`e2e_onboarding_tut_skip_${meta.step}`}
          style={styles.skipBtn}
          onPress={handleSkipAll}
        >
          <ThemedText style={styles.skipText}>{t('skipForLater')}</ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/** Lucide icon 名 → 絵文字 fallback。 */
const ICON_FALLBACK: Record<string, string> = {
  'book-open': '📖',
  leaf: '🌿',
  droplet: '💧',
  calendar: '📅',
  bell: '🔔',
};

/** Bell outline SVG (mockup 01-Onboarding.html NotificationScreen 整合、Sess5 PR-2)。 */
function BellIcon({ size = 64, color = BRAND_GREEN }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path
        d="M32 10 C22 10 18 18 18 28 C18 38 14 44 10 48 L54 48 C50 44 46 38 46 28 C46 18 42 10 32 10 Z"
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <Path
        d="M27 48 C27 52 29 56 32 56 C35 56 37 52 37 48"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    minHeight: 36,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 28, lineHeight: 32, color: BRAND_GREEN, fontWeight: '500' },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 16 },
  iconRow: { alignItems: 'center', marginBottom: 16 },
  iconText: { fontSize: 64, lineHeight: 72 },
  // displayM 24/32 (design_system.md §3-3、Claude Design Onboarding Wireframes 整合)
  title: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 24,
    lineHeight: 32,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  body: { textAlign: 'center', fontSize: 16, lineHeight: 26 },
  actions: { padding: 24, gap: 12 },
  cta: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  ctaText: { color: ON_BRAND, fontWeight: '600', fontSize: 17, letterSpacing: 0.5 },
  skipBtn: { paddingVertical: 12, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  skipText: { fontSize: 14, opacity: 0.7, textDecorationLine: 'underline' },
});
