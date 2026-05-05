/**
 * F-26 Phase G — Step 1-5 機能チュート動的画面 (Issue #26 / ADR-0018)。
 *
 * 1 ファイルで 5 step 全対応:
 * - useLocalSearchParams で step を取得
 * - getTutorialStepMeta(step) で アイコン + i18n キーを動的解決
 * - Phase D `getNextOnboardingStep` (#105) で次画面決定
 * - 「次へ」: markDismissed(step) → 次 step へ navigate
 * - 「あとで」: 残り全 step を dismissed 化 → completed=true → ホームへ
 * - **Step 5 (tut5)** (F-16 ADR-0014 §41-47): CTA を「通知を有効にする」に切替、
 *   OS permission リクエスト → 許可で通知 ON、拒否で Alert、いずれも step 完了。
 *
 * 不正な step (welcome/language/未知) は welcome へリダイレクト。
 */
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
import { BG_PRIMARY, BRAND_GREEN, ON_BRAND, TEXT_SECONDARY } from '@/src/core/theme/colors';
import { requestNotificationPermission } from '@/src/features/notification/scheduler';
import { getNextOnboardingStep } from '@/src/features/onboarding/onboardingFlow';
import {
  TUTORIAL_STEPS,
  getTutorialStepMeta,
  isTutorialStep,
} from '@/src/features/onboarding/tutorialSteps';
import { useOnboardingStore, type OnboardingStep } from '@/src/stores/onboardingStore';
import { useSettingsStore } from '@/src/stores/settingsStore';

export default function OnboardingTutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string }>();

  const stepParam = typeof params.step === 'string' ? params.step : '';
  const meta = getTutorialStepMeta(stepParam);

  const markDismissed = useOnboardingStore((s) => s.markDismissed);
  const setCompleted = useOnboardingStore((s) => s.setCompleted);
  const dismissed = useOnboardingStore((s) => s.dismissed);
  // F-16 Step 5 用: 通知許可後にデフォルト値で ON にする (ADR-0014 §47)
  const setNotifSummaryEnabled = useSettingsStore((s) => s.setNotificationDailySummaryEnabled);
  const setNotifWateringEnabled = useSettingsStore((s) => s.setNotificationWateringRepeatEnabled);

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

  // 「次へ」: 通常 step (tut1-4)
  const handleNext = () => {
    advanceStep();
  };

  // 「通知を有効にする」: Step 5 専用 (ADR-0014 §43)
  // OS permission を要求 → granted なら summary + watering 通知をデフォルト値で ON 化、
  // denied なら案内 Alert を出して step 完了 (K1 通り、押し付けがましさ排除)。
  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotifSummaryEnabled(true);
      setNotifWateringEnabled(true);
    } else {
      Alert.alert(t('settingsNotifPermissionDeniedTitle'), t('settingsNotifPermissionDeniedBody'));
    }
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
  const ctaLabel = isStep5 ? t('onboardingTut5Cta') : t('onboardingTutNext');
  const ctaHandler = isStep5 ? () => void handleEnableNotifications() : handleNext;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']} testID="e2e_onboarding_tut">
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.iconRow}>
          {/* Lucide icon は将来導入。現状は絵文字 fallback で a11y 維持。 */}
          <ThemedText style={styles.iconText} accessibilityLabel={meta.icon}>
            {ICON_FALLBACK[meta.icon] ?? '•'}
          </ThemedText>
        </View>
        <ThemedText style={styles.title}>{t(meta.titleKey as TranslationKey)}</ThemedText>
        <ThemedText style={styles.body}>{t(meta.bodyKey as TranslationKey)}</ThemedText>
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

/** Lucide icon 名 → 絵文字 fallback (将来 @tamagui/lucide-icons で置換予定)。 */
const ICON_FALLBACK: Record<string, string> = {
  'book-open': '📖',
  leaf: '🌿',
  droplet: '💧',
  calendar: '📅',
  bell: '🔔',
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG_PRIMARY },
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
  body: { textAlign: 'center', fontSize: 16, lineHeight: 26, color: TEXT_SECONDARY },
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
  skipText: { fontSize: 14, opacity: 0.7 },
});
