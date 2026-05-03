/**
 * F-26 Phase G — Step 1-5 機能チュート動的画面 (Issue #26 / ADR-0018)。
 *
 * 1 ファイルで 5 step 全対応:
 * - useLocalSearchParams で step を取得
 * - getTutorialStepMeta(step) で アイコン + i18n キーを動的解決
 * - Phase D `getNextOnboardingStep` (#105) で次画面決定
 * - 「次へ」: markDismissed(step) → 次 step へ navigate
 * - 「あとで」: 残り全 step を dismissed 化 → completed=true → ホームへ
 *
 * 不正な step (welcome/language/未知) は welcome へリダイレクト。
 */
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
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

  // 「次へ」: この step を dismiss → 次画面決定
  const handleNext = () => {
    markDismissed(meta.step);
    const updatedDismissed = { ...dismissed, [meta.step]: true };
    const next = getNextOnboardingStep(false, updatedDismissed);
    if (next === null || !isTutorialStep(next)) {
      // 残りなし → 完了 → ホームへ
      setCompleted(true);
      router.replace('/' as Href);
      return;
    }
    router.replace(`/onboarding/tut/${next}` as Href);
  };

  // 「あとで」: 残り全 tut を dismissed 化 → completed → ホームへ
  const handleSkipAll = () => {
    for (const tutMeta of TUTORIAL_STEPS) {
      markDismissed(tutMeta.step as OnboardingStep);
    }
    setCompleted(true);
    router.replace('/' as Href);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']} testID="e2e_onboarding_tut">
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.iconRow}>
          {/* Lucide icon は将来導入。現状は絵文字 fallback で a11y 維持。 */}
          <ThemedText style={styles.iconText} accessibilityLabel={meta.icon}>
            {ICON_FALLBACK[meta.icon] ?? '•'}
          </ThemedText>
        </View>
        <ThemedText type="title" style={styles.title}>
          {t(meta.titleKey as TranslationKey)}
        </ThemedText>
        <ThemedText style={styles.body}>{t(meta.bodyKey as TranslationKey)}</ThemedText>
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('onboardingTutNext')}
          testID={`e2e_onboarding_tut_next_${meta.step}`}
          style={styles.cta}
          onPress={handleNext}
        >
          <ThemedText style={styles.ctaText}>{t('onboardingTutNext')}</ThemedText>
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

/** Lucide icon 名 → 絵文字 fallback (将来 @tamagui/lucide-icons で置換予定)。 */
const ICON_FALLBACK: Record<string, string> = {
  'book-open': '📖',
  leaf: '🌿',
  droplet: '💧',
  calendar: '📅',
  bell: '🔔',
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 16 },
  iconRow: { alignItems: 'center', marginBottom: 16 },
  iconText: { fontSize: 64, lineHeight: 72 },
  title: { textAlign: 'center', fontSize: 24, lineHeight: 32 },
  body: { textAlign: 'center', fontSize: 15, opacity: 0.85, lineHeight: 22 },
  actions: { padding: 24, gap: 12 },
  cta: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
  },
  ctaText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  skipBtn: { paddingVertical: 12, alignItems: 'center' },
  skipText: { fontSize: 14, opacity: 0.7 },
});
