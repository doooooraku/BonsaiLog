/**
 * 設定画面のアカウント/プラン section (F-13 Issue #20 / ADR-0009 / Sess57 Repolog 風強化)。
 *
 * 構成 (Repolog 整合):
 * - 「現在のプラン」 row (Free / PRO / 買い切り badge)
 * - Pro (期限あり) のみ: 次回更新日
 * - Lifetime のみ: 永久アクセス
 * - 説明文 (Free=アップグレード訴求 / Pro=感謝)
 * - Free のみ: Pro メリット bullet 4 + Primary CTA「Pro プランを見る」
 * - 「ご購入履歴を復元」 row (Apple Review 3.1.1、ADR-0009 AC4-1)
 *
 * 既存 testID (e2e_open_paywall / e2e_settings_plan_status_badge /
 * e2e_settings_plan_upgrade_cta / e2e_settings_restore_purchase) は全て維持。
 * 新規 testID: e2e_view_pro_plans (Primary CTA)。
 */
import { useRouter, type Href } from 'expo-router';
import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
import {
  ACCENT_GOLD,
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  ON_BRAND,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { useProStore } from '@/src/stores/proStore';

import { SettingsSection } from './SettingsSection';

// ADR-0049 Sess59 PR2: Pro メリット bullet を Sess58 確定 Pro 機能 6 項目 全部に展開
// (User 真意「Free と Pro で差分があるもの全部表示」 採用、 案 A フラット シンプル)。
// 順序は ADR-0049 ①〜⑥ に整合 (写真 / タグ / 作業記録写真 / CSV-PDF / 広告非表示 /
// カスタム樹種樹形)。 paywallFeatureNoAds は意味曖昧 ("広告表示" = Free 視点で逆効果) のため
// settingsBenefitNoAds 「広告非表示」 専用 key を維持 (Sess57 実機検証由来)。
const PRO_BENEFIT_KEYS: TranslationKey[] = [
  'settingsBenefitPhoto',
  'settingsBenefitTag',
  'settingsBenefitWorkLogPhoto',
  'paywallFeatureCsv',
  'settingsBenefitNoAds',
  'settingsBenefitCustomSpecies',
];

function formatRenewalDate(iso: string | null, lang: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(lang === 'ja' ? 'ja-JP' : lang, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function PlanSection() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const isPro = useProStore((s) => s.isPro);
  const planType = useProStore((s) => s.planType);
  const expirationDate = useProStore((s) => s.expirationDate);
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

  const planLabel =
    planType === 'lifetime'
      ? t('proPlanLifetimeTitle')
      : isPro
        ? t('proBadgeShort')
        : t('proPlanFreeTitle');

  const renewalLabel = React.useMemo(() => {
    if (planType === 'lifetime') return t('settingsLifetimeAccess');
    if (!isPro) return null;
    const formatted = formatRenewalDate(expirationDate, lang);
    if (!formatted) return null;
    return t('settingsRenewsOn').replace('{date}', formatted);
  }, [isPro, planType, expirationDate, lang, t]);

  return (
    <SettingsSection title={t('settingsAccountSection')}>
      {/* 1. 現在のプラン row (Free/Pro/Lifetime badge + Free 時は Upgrade CTA badge) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('proTitle')}
        testID="e2e_open_paywall"
        style={styles.entry}
        onPress={() => router.push('/pro' as Href)}
      >
        <View style={styles.rowInner}>
          <ThemedText type="defaultSemiBold">{t('settingsCurrentPlan')}</ThemedText>
          <View style={styles.rowRight}>
            <View
              style={[styles.planStatusBadge, isPro && styles.planStatusBadgePro]}
              testID="e2e_settings_plan_status_badge"
            >
              <ThemedText
                style={[styles.planStatusBadgeText, isPro && styles.planStatusBadgeTextPro]}
              >
                {planLabel}
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

      {/* 2-3. (Pro 期限あり/Lifetime のみ) 更新日 or 永久アクセス */}
      {renewalLabel && (
        <View style={styles.body}>
          <ThemedText style={styles.bodyText}>{renewalLabel}</ThemedText>
        </View>
      )}

      {/* 4. 説明文 (Free=アップグレード訴求 / Pro=感謝) */}
      <View style={styles.body}>
        <ThemedText style={styles.bodyText}>
          {isPro ? t('settingsDescPro') : t('settingsDescFree')}
        </ThemedText>
      </View>

      {/* 5. (Free のみ) Pro メリット bullet 4 項目 */}
      {!isPro && (
        <View style={styles.benefitList}>
          {PRO_BENEFIT_KEYS.map((key) => (
            <ThemedText key={key} style={styles.benefitText}>{`• ${t(key)}`}</ThemedText>
          ))}
        </View>
      )}

      {/* 6. (Free のみ) Primary CTA「Pro プランを見る」 */}
      {!isPro && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settingsViewProPlans')}
          testID="e2e_view_pro_plans"
          style={styles.primaryCta}
          onPress={() => router.push('/pro' as Href)}
        >
          <ThemedText style={styles.primaryCtaText}>{t('settingsViewProPlans')}</ThemedText>
        </Pressable>
      )}

      {/* 7. F-13 Phase 2d (Issue #20, ADR-0009 AC4-1): 購入復元 (Apple Review 3.1.1) */}
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
  body: { paddingHorizontal: 16, paddingTop: 8 },
  bodyText: { fontSize: 13, color: TEXT_SECONDARY, lineHeight: 20 },
  benefitList: { paddingHorizontal: 16, paddingTop: 6, gap: 4 },
  benefitText: { fontSize: 13, color: TEXT_SECONDARY, lineHeight: 20 },
  primaryCta: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
  },
  primaryCtaText: {
    color: ON_BRAND,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
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
    backgroundColor: BRAND_GREEN,
  },
  planUpgradeBadgeText: {
    color: ON_BRAND,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
