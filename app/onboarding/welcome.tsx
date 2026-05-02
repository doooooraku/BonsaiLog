/**
 * F-26 Phase B Welcome 画面 (Issue #26 / ADR-0018)。
 *
 * Phase B 範囲:
 * - Welcome 画面のみ実装 (Splash → Welcome → 「はじめる」で onboarding.completed=true → ルート復帰)
 * - 「はじめる」CTA 1 つ、スキップなし (Welcome は起点、ADR-0018)
 * - ヘッダー戻る非表示 (Stack 開始点)
 *
 * Phase C 以降:
 * - 言語選択画面 (Screen 3、19 言語 + native + Latin + OS バッジ + 瞬時プレビュー)
 * - 機能チュート 5 ステップ (Step 1-5)
 * - F-15 light 固定 + 太陽アイコン非表示 + 200ms アニメ
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import { useOnboardingStore } from '@/src/stores/onboardingStore';

export default function OnboardingWelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setCompleted = useOnboardingStore((s) => s.setCompleted);

  const handleStart = React.useCallback(() => {
    setCompleted(true);
    // ルート切替は _layout.tsx の hook が拾うが、即座にホームへ遷移
    router.replace('/');
  }, [router, setCompleted]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']} testID="e2e_onboarding_welcome">
      <View style={styles.container}>
        <View style={styles.copy}>
          <ThemedText type="title" style={styles.title}>
            {t('onboardingWelcomeTitle')}
          </ThemedText>
          <ThemedText style={styles.body}>{t('onboardingWelcomeBody')}</ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('onboardingWelcomeCta')}
          testID="e2e_onboarding_welcome_cta"
          style={styles.cta}
          onPress={handleStart}
        >
          <ThemedText style={styles.ctaText}>{t('onboardingWelcomeCta')}</ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  copy: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  title: { textAlign: 'center', fontSize: 28, lineHeight: 36 },
  body: { textAlign: 'center', fontSize: 16, opacity: 0.8, lineHeight: 24 },
  cta: {
    paddingVertical: 18,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
  },
  ctaText: { color: '#FFFFFF', fontWeight: '600', fontSize: 18 },
});
