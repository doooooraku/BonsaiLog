/**
 * Settings 画面 Pro CTA Banner (Sess106 PR-6 = Issue #1251、 ADR-0061 SoT)。
 *
 * 配置: app/settings/index.tsx で SearchHeader (= Stack native header) 直下の sticky 位置 (ScrollView の外)。
 *
 * 仕様 (ADR-0061):
 * - **D1 sticky 配置**: ScrollView の外で flex 上端固定 (Q1 user 確定)
 * - **D2 機能セット**: 64dp の CTA Bar 単体 (= PRO_FEATURE_ROWS 比較表は PlanSection 内に残す、 scroll で見える)
 * - **D3 寸法**: 高さ 64dp (ADR-0054 BottomCtaBar と統一)、 i18n キー `settingsViewProPlans` 流用 (新規キー追加ゼロ、 Q2 確定)
 * - **D4 Free 限定**: useProStore.isPro=true で null 返却 (Pro 即 unmount、 Q5 確定)
 * - **D5 Paywall SoT**: tap で `/pro?source=settings_banner` 遷移 (= 単一 Paywall ルート維持)
 *
 * design_system.md §ProBanner で SoT (PR-3 / ADR-0061 D7 Follow-up で追記予定)。
 */
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import { useColors } from '@/src/core/theme/useColors';
import { useProStore } from '@/src/stores/proStore';

/** ADR-0061 D3: BottomCtaBar (ADR-0054) と統一の 64dp 高で視覚的調和。 */
const BANNER_HEIGHT = 64;

export function ProBanner() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const isPro = useProStore((s) => s.isPro);

  const handlePress = React.useCallback(() => {
    router.push('/pro?source=settings_banner' as Href);
  }, [router]);

  // ADR-0061 D4: Pro 加入後は完全非表示 (Free 限定継続、 Q5 確定)
  if (isPro) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('settingsViewProPlans')}
      testID="e2e_settings_pro_banner"
      onPress={handlePress}
      style={[styles.container, { backgroundColor: c.tint, borderBottomColor: c.border }]}
    >
      <View style={styles.inner}>
        <ThemedText style={[styles.icon, { color: c.onTint }]}>🌱</ThemedText>
        <ThemedText style={[styles.label, { color: c.onTint }]}>
          {t('settingsViewProPlans')}
        </ThemedText>
        <ThemedText style={[styles.chevron, { color: c.onTint }]}>›</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: BANNER_HEIGHT,
    borderBottomWidth: 1,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 12,
  },
  icon: { fontSize: 20 },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'left',
  },
  chevron: { fontSize: 20, opacity: 0.9 },
});

/** テスト用エクスポート (Jest からのみ参照)。 */
export const __TEST_ONLY = {
  BANNER_HEIGHT,
};
