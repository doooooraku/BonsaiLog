/**
 * F-26 Phase C 言語選択画面 (Issue #26 / ADR-0018 Screen 3)。
 *
 * - 19 言語 + native 表記 + Latin 併記 (シニア視認性、ADR-0018)
 * - OS 言語に「端末の言語」緑バッジ
 * - タップで瞬時プレビュー (i18n.setLang で全文言切替)
 * - 「次へ」CTA で /onboarding/complete (Phase D) → 現状は ホームへ遷移 + completed=true
 *
 * Phase D 以降:
 * - 機能チュート 5 ステップ (Step 1-5)
 * - 完了画面 (システム部 → 機能チュート 移行)
 * - スキップ動線 (各画面「あとで」、Welcome / 言語選択は対象外)
 */
import { useRouter, type Href } from 'expo-router';
import * as Localization from 'expo-localization';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { setLang, useTranslation } from '@/src/core/i18n/i18n';
import type { Lang } from '@/src/core/i18n/langCode';
import {
  BG_PRIMARY,
  BORDER_DEFAULT,
  BRAND_GREEN,
  BRAND_GREEN_BG,
  ON_BRAND,
} from '@/src/core/theme/colors';
import { getNextOnboardingStep } from '@/src/features/onboarding/onboardingFlow';
import { useOnboardingStore } from '@/src/stores/onboardingStore';

type LanguageOption = {
  code: Lang;
  /** 母語表記 (各言語自身)。 */
  native: string;
  /** Latin 併記 (英字、シニアが OS UI 表記で区別できるよう)。 */
  latin: string;
};

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', native: 'English', latin: 'English' },
  { code: 'ja', native: '日本語', latin: 'Japanese' },
  { code: 'fr', native: 'Français', latin: 'French' },
  { code: 'es', native: 'Español', latin: 'Spanish' },
  { code: 'de', native: 'Deutsch', latin: 'German' },
  { code: 'it', native: 'Italiano', latin: 'Italian' },
  { code: 'pt', native: 'Português', latin: 'Portuguese' },
  { code: 'ru', native: 'Русский', latin: 'Russian' },
  { code: 'zhHans', native: '简体中文', latin: 'Chinese (Simplified)' },
  { code: 'zhHant', native: '繁體中文', latin: 'Chinese (Traditional)' },
  { code: 'ko', native: '한국어', latin: 'Korean' },
  { code: 'hi', native: 'हिन्दी', latin: 'Hindi' },
  { code: 'id', native: 'Bahasa Indonesia', latin: 'Indonesian' },
  { code: 'th', native: 'ไทย', latin: 'Thai' },
  { code: 'vi', native: 'Tiếng Việt', latin: 'Vietnamese' },
  { code: 'tr', native: 'Türkçe', latin: 'Turkish' },
  { code: 'nl', native: 'Nederlands', latin: 'Dutch' },
  { code: 'pl', native: 'Polski', latin: 'Polish' },
  { code: 'sv', native: 'Svenska', latin: 'Swedish' },
];

export default function OnboardingLanguageScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const markDismissed = useOnboardingStore((s) => s.markDismissed);
  const dismissed = useOnboardingStore((s) => s.dismissed);

  // OS 言語タグ (例: 'ja-JP') を取得して、対応する 19 言語のうち最初のマッチを返す。
  const osLangCode = React.useMemo<Lang | null>(() => {
    try {
      const locales = Localization.getLocales();
      const tag = locales?.[0]?.languageCode?.toLowerCase();
      if (!tag) return null;
      const found = LANGUAGE_OPTIONS.find((o) => o.code === tag || o.code.startsWith(tag));
      return found?.code ?? null;
    } catch {
      return null;
    }
  }, []);

  const handlePick = React.useCallback((code: Lang) => {
    setLang(code);
  }, []);

  // F-26 Phase H: language → tut1 動線完成
  // welcome / language を dismissed 化 → getNextOnboardingStep で tut1 等に遷移
  const handleNext = React.useCallback(() => {
    markDismissed('welcome');
    markDismissed('language');
    const updatedDismissed = { ...dismissed, welcome: true, language: true };
    const next = getNextOnboardingStep(false, updatedDismissed);
    if (next === null) {
      router.replace('/' as Href);
      return;
    }
    if (next === 'welcome' || next === 'language') {
      // 理論上発生しないが防御
      router.replace('/' as Href);
      return;
    }
    router.replace(`/onboarding/tut/${next}` as Href);
  }, [router, markDismissed, dismissed]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']} testID="e2e_onboarding_language">
      <View style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          {t('onboardingLanguageTitle')}
        </ThemedText>
        <ThemedText style={styles.desc}>{t('onboardingLanguageDesc')}</ThemedText>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {LANGUAGE_OPTIONS.map((opt) => {
            const selected = lang === opt.code;
            const isOs = osLangCode === opt.code;
            return (
              <Pressable
                key={opt.code}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={opt.native}
                testID={`e2e_onboarding_lang_${opt.code}`}
                style={[styles.row, selected && styles.rowSelected]}
                onPress={() => handlePick(opt.code)}
              >
                <View style={styles.rowMain}>
                  <ThemedText type="defaultSemiBold" style={styles.native}>
                    {opt.native}
                  </ThemedText>
                  <ThemedText style={styles.latin}>{opt.latin}</ThemedText>
                </View>
                {isOs && (
                  <View style={styles.osBadge}>
                    <ThemedText style={styles.osBadgeText}>
                      {t('onboardingLanguageOsBadge')}
                    </ThemedText>
                  </View>
                )}
                {selected && <ThemedText style={styles.checkMark}>✓</ThemedText>}
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('onboardingLanguageContinue')}
          testID="e2e_onboarding_lang_next"
          style={styles.cta}
          onPress={handleNext}
        >
          {/* mockup v1.0 screens.jsx LanguagePickerScreen 整合 (B2 PR、「選択して続ける」) */}
          <ThemedText style={styles.ctaText}>{t('onboardingLanguageContinue')}</ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 22, lineHeight: 28 },
  desc: { fontSize: 14, opacity: 0.7, lineHeight: 20 },
  list: { flex: 1 },
  listContent: { gap: 6, paddingBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
  },
  rowSelected: { borderColor: BRAND_GREEN, backgroundColor: BRAND_GREEN_BG, borderWidth: 2 },
  rowMain: { flex: 1, gap: 2 },
  native: { fontSize: 16 },
  latin: { fontSize: 12, opacity: 0.6, fontStyle: 'italic' },
  osBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: BRAND_GREEN,
  },
  osBadgeText: { color: ON_BRAND, fontSize: 10, fontWeight: '700' },
  checkMark: { color: BRAND_GREEN, fontSize: 20, fontWeight: '700' },
  cta: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
  },
  ctaText: { color: ON_BRAND, fontWeight: '600', fontSize: 16 },
});
