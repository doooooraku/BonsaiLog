/**
 * 設定画面のアカウント/プラン section (F-13 Issue #20 / ADR-0009、 Phase 4 A3 で抽出)。
 *
 * - プラン row: Free/Pro/Lifetime ステータス badge + (Free 時) Upgrade CTA、 タップで /pro
 * - 購入を復元 row (Apple Review 3.1.1、 ADR-0009 AC4-1)
 *
 * 振る舞いは SettingsScreen の元実装と完全同一 (純粋な抽出)。
 */
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import { ACCENT_GOLD, BG_SURFACE, BORDER_DEFAULT, ON_BRAND } from '@/src/core/theme/colors';
import { useProStore } from '@/src/stores/proStore';

import { SettingsSection } from './SettingsSection';

export function PlanSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const isPro = useProStore((s) => s.isPro);
  const planType = useProStore((s) => s.planType);
  const restorePro = useProStore((s) => s.restore);
  const [restoring, setRestoring] = React.useState(false);

  const handleRestorePress = React.useCallback(async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const result = await restorePro();
      Alert.alert(result.hasActive ? t('restoreSuccess') : t('restoreNotFound'));
    } catch {
      Alert.alert(t('restoreFailed'));
    } finally {
      setRestoring(false);
    }
  }, [restorePro, restoring, t]);

  return (
    <SettingsSection title={t('settingsAccountSection')}>
      {/* Issue #457 Phase 2: mockup `settings-tab-01.png` 整合の 1 行 row (label + Free/Lifetime badge + Upgrade CTA)。 */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('proTitle')}
        testID="e2e_open_paywall"
        style={styles.entry}
        onPress={() => router.push('/pro' as Href)}
      >
        <View style={styles.rowInner}>
          <ThemedText type="defaultSemiBold">{t('settingsPlanLabel')}</ThemedText>
          <View style={styles.rowRight}>
            <View
              style={[styles.planStatusBadge, isPro && styles.planStatusBadgePro]}
              testID="e2e_settings_plan_status_badge"
            >
              <ThemedText
                style={[styles.planStatusBadgeText, isPro && styles.planStatusBadgeTextPro]}
              >
                {planType === 'lifetime'
                  ? t('proPlanLifetimeTitle')
                  : isPro
                    ? t('proBadgeShort')
                    : t('proPlanFreeTitle')}
              </ThemedText>
            </View>
            {!isPro && (
              <View style={styles.planUpgradeBadge} testID="e2e_settings_plan_upgrade_cta">
                <ThemedText style={styles.planUpgradeBadgeText}>
                  {t('settingsPlanUpgradeBadge')}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </Pressable>

      {/* F-13 Phase 2d (Issue #20, ADR-0009 AC4-1): Settings からの購入復元 (Apple Review 3.1.1) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('settingsRestoreTitle')}
        accessibilityHint={t('settingsRestoreDesc')}
        testID="e2e_settings_restore_purchase"
        style={[styles.entry, restoring && styles.entryDisabled]}
        disabled={restoring}
        onPress={handleRestorePress}
      >
        <View style={styles.rowInner}>
          <ThemedText type="defaultSemiBold">{t('settingsRestoreTitle')}</ThemedText>
          <ThemedText style={styles.chevron}>›</ThemedText>
        </View>
      </Pressable>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  entry: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
    gap: 6,
  },
  entryDisabled: { opacity: 0.6 },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chevron: { fontSize: 18, opacity: 0.5, lineHeight: 18 },
  // 「プラン」 row の 3 要素 (label + 状態 badge + Upgrade CTA)。mockup `settings-tab-01.png` 整合。
  planStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: BG_SURFACE,
  },
  planStatusBadgePro: { borderColor: ACCENT_GOLD, backgroundColor: ACCENT_GOLD },
  planStatusBadgeText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
  planStatusBadgeTextPro: { color: ON_BRAND },
  planUpgradeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#1F3A2E', // BRAND_GREEN を直接参照 (color util 重複 import 回避)
  },
  planUpgradeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
