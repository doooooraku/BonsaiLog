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
import { LANGUAGE_OPTIONS } from '@/src/core/i18n/languageOptions';
import { BRAND_GREEN, BRAND_GREEN_BG, ON_BRAND } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { getNextOnboardingStep } from '@/src/features/onboarding/onboardingFlow';
import { useOnboardingStore } from '@/src/stores/onboardingStore';

export default function OnboardingLanguageScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  // Sess65 PR2-d: SafeAreaView / row 等の bg を c.background / c.surface 動的化、 row border /
  // text 系も useColors 経由化。 OS dark でも washi beige のまま残っていた問題を解消。
  const c = useColors();
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

  // 端末言語を先頭に並べ替え (mockup 整合、ADR-0018 §④ 21 端末言語 pre-select)。
  const sortedOptions = React.useMemo(() => {
    if (!osLangCode) return LANGUAGE_OPTIONS;
    const top = LANGUAGE_OPTIONS.find((o) => o.code === osLangCode);
    if (!top) return LANGUAGE_OPTIONS;
    const rest = LANGUAGE_OPTIONS.filter((o) => o.code !== osLangCode);
    return [top, ...rest];
  }, [osLangCode]);

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
    <SafeAreaView
      style={[styles.safe, { backgroundColor: c.background }]}
      edges={['top', 'bottom']}
      testID="e2e_onboarding_language"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('back')}
            testID="e2e_onboarding_lang_back"
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={8}
          >
            <ThemedText style={styles.backIcon}>‹</ThemedText>
          </Pressable>
        </View>
        <ThemedText type="title" style={[styles.title, { color: c.text }]}>
          {t('onboardingLanguageTitle')}
        </ThemedText>
        <ThemedText style={[styles.desc, { color: c.textSecondary }]}>
          {t('onboardingLanguageDesc')}
        </ThemedText>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {sortedOptions.map((opt) => {
            const selected = lang === opt.code;
            const isOs = osLangCode === opt.code;
            return (
              <Pressable
                key={opt.code}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={opt.native}
                testID={`e2e_onboarding_lang_${opt.code}`}
                style={[styles.row, { borderColor: c.border }, selected && styles.rowSelected]}
                onPress={() => handlePick(opt.code)}
              >
                <View style={styles.rowMain}>
                  <ThemedText type="defaultSemiBold" style={[styles.native, { color: c.text }]}>
                    {opt.native}
                  </ThemedText>
                  <ThemedText style={[styles.latin, { color: c.textSecondary }]}>
                    {opt.latin}
                  </ThemedText>
                </View>
                {isOs && (
                  <View style={styles.osBadge}>
                    <ThemedText style={styles.osBadgeText}>
                      {t('onboardingLanguageOsBadge')}
                    </ThemedText>
                  </View>
                )}
                <View
                  style={[
                    styles.radio,
                    { borderColor: c.border },
                    selected && styles.radioSelected,
                  ]}
                >
                  {selected && <View style={styles.radioDot} />}
                </View>
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
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 36 },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 28, lineHeight: 32, color: BRAND_GREEN, fontWeight: '500' },
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
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: BRAND_GREEN },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND_GREEN,
  },
  cta: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
  },
  ctaText: { color: ON_BRAND, fontWeight: '600', fontSize: 16 },
});
