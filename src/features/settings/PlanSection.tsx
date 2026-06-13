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
import { getTzOffsetMin } from '@/src/core/datetime/tz';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
// Sess70 PR-C3: BRAND_GREEN / ON_BRAND を scheme-aware (c.tint / c.onTint) に移行
// (ADR-0015/0052 Sess69 PR-A Amendment 整合)。 ACCENT_GOLD は Pro バッジ専用 brand-static 維持。
import { ACCENT_GOLD } from '@/src/core/theme/colors';
import {
  featureTableHeaderLabel,
  featureTableHeaderValue,
  featureTableHeaderValuePro,
} from '@/src/core/theme/typography';
import { useColors } from '@/src/core/theme/useColors';
import { toLocalDateKey } from '@/src/features/watering/dateUtils';
import { useProStore } from '@/src/stores/proStore';

import { SettingsSection } from './SettingsSection';

// ADR-0049 Sess59 PR2 + Sess60 PR3: bullet → 3 列表 (機能 / Free / Pro) に変更。
// PaywallScreen の FeatureRow と同じ 6 行構成で、 ユーザーが Free vs Pro を一目で比較可能。
// Sess60 PR2 で確立した literal 排除 + i18n 統一 pattern を Settings でも適用。
type FeatureRowKey = {
  label: TranslationKey;
  free: TranslationKey;
  pro: TranslationKey;
};

const PRO_FEATURE_ROWS: FeatureRowKey[] = [
  // ① 基本情報写真
  {
    label: 'paywallFeaturePhoto',
    free: 'paywallFeaturePhotoFreeValue',
    pro: 'paywallFeaturePhotoProValue',
  },
  // ② タグ
  {
    label: 'paywallFeatureTag',
    free: 'paywallFeatureTagFreeValue',
    pro: 'paywallFeatureTagProValue',
  },
  // ③ 作業記録写真
  {
    label: 'paywallFeatureWorkLogPhoto',
    free: 'paywallFeatureWorkLogPhotoFreeValue',
    pro: 'paywallFeatureWorkLogPhotoProValue',
  },
  // ④ CSV/PDF エクスポート
  {
    label: 'paywallFeatureCsv',
    free: 'paywallFeatureCsvFreeValue',
    pro: 'paywallFeatureCsvProValue',
  },
  // ⑤ 広告非表示 (機能名は Settings 用 settingsBenefitNoAds でも OK だが、 Sess60 PR2 で
  //    Paywall 側も「広告非表示」 統一済なので paywallFeatureNoAds 使用)
  {
    label: 'paywallFeatureNoAds',
    free: 'paywallFeatureNoAdsFreeValue',
    pro: 'paywallFeatureNoAdsProValue',
  },
  // ⑥ カスタム樹種・樹形
  {
    label: 'paywallFeatureCustomSpecies',
    free: 'paywallFeatureCustomSpeciesFreeValue',
    pro: 'paywallFeatureCustomSpeciesProValue',
  },
  // ⑦ 定期予定 (Sess81 PR-9、 ADR-0056 D7 + ADR-0049 Sess101 Amendment)
  // Free 3 件 (= 予定グループ単位、 盆栽数は問わない、 Sess101 #1159) / Pro 無制限
  // (FREE_RECURRENCE_GROUP_LIMIT = 3。 文言「3件まで」 はグループ単位でも正のため i18n 変更なし)
  {
    label: 'paywallFeatureRecurringRule',
    free: 'paywallFeatureRecurringRuleFreeValue',
    pro: 'paywallFeatureRecurringRuleProValue',
  },
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
    // Sess67 fix: Intl 失敗時の fallback でも UTC 日付化を避ける (JST 深夜で 1 日前表示の防止)。
    return toLocalDateKey(date.toISOString(), getTzOffsetMin());
  }
}

export function PlanSection() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const c = useColors();
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

  // Sess65 PR2-a: dark mode で「白カード + dark token (薄ベージュ) text」 で全 row 判読不能だった
  // 問題を解消するため、 row border / body text / feature 表 / status badge の static 色を
  // inline c.* で上書き。 primaryCta / planUpgradeBadge は BRAND_GREEN 固定維持 (両 mode で識別性高い)。
  return (
    <SettingsSection title={t('settingsAccountSection')}>
      {/* 1. 現在のプラン row (Free/Pro/Lifetime badge + Free 時は Upgrade CTA badge) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('proTitle')}
        testID="e2e_open_paywall"
        style={[styles.entry, { borderBottomColor: c.border }]}
        onPress={() => router.push('/pro' as Href)}
      >
        <View style={styles.rowInner}>
          <ThemedText type="defaultSemiBold">{t('settingsCurrentPlan')}</ThemedText>
          <View style={styles.rowRight}>
            <View
              style={[
                styles.planStatusBadge,
                { backgroundColor: c.surface, borderColor: c.border },
                isPro && styles.planStatusBadgePro,
              ]}
              testID="e2e_settings_plan_status_badge"
            >
              <ThemedText
                style={[styles.planStatusBadgeText, isPro && styles.planStatusBadgeTextPro]}
              >
                {planLabel}
              </ThemedText>
            </View>
            {!isPro && (
              <View
                style={[styles.planUpgradeBadge, { backgroundColor: c.tint }]}
                testID="e2e_settings_plan_upgrade_cta"
              >
                <ThemedText style={[styles.planUpgradeBadgeText, { color: c.onTint }]}>
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
          <ThemedText style={[styles.bodyText, { color: c.textSecondary }]}>
            {renewalLabel}
          </ThemedText>
        </View>
      )}

      {/* 4. 説明文 (Free=アップグレード訴求 / Pro=感謝) */}
      <View style={styles.body}>
        <ThemedText style={[styles.bodyText, { color: c.textSecondary }]}>
          {isPro ? t('settingsDescPro') : t('settingsDescFree')}
        </ThemedText>
      </View>

      {/* 5. (Free のみ) Pro メリット 3 列表 (機能 / Free / Pro) - Sess60 PR3 で bullet → table 化 */}
      {!isPro && (
        <View
          style={[styles.featureTable, { borderColor: c.border }]}
          testID="e2e_settings_plan_feature_table"
        >
          <View style={[styles.featureHeader, { borderBottomColor: c.border }]}>
            <ThemedText style={[styles.featureHeaderLabel, { color: c.textMuted }]}>
              {t('paywallFeatureColLabel')}
            </ThemedText>
            <ThemedText style={[styles.featureHeaderFree, { color: c.textMuted }]}>FREE</ThemedText>
            <ThemedText style={[styles.featureHeaderPro, { color: c.tint }]}>PRO</ThemedText>
          </View>
          {PRO_FEATURE_ROWS.map((row, idx) => (
            <View
              key={row.label}
              style={[
                styles.featureRow,
                { borderBottomColor: c.border },
                idx === PRO_FEATURE_ROWS.length - 1 && styles.featureRowLast,
              ]}
            >
              <ThemedText style={[styles.featureLabel, { color: c.text }]}>
                {t(row.label)}
              </ThemedText>
              <ThemedText style={[styles.featureFree, { color: c.textSecondary }]}>
                {t(row.free)}
              </ThemedText>
              <ThemedText style={[styles.featurePro, { color: c.tint }]}>{t(row.pro)}</ThemedText>
            </View>
          ))}
        </View>
      )}

      {/* 6. (Free のみ) Primary CTA「Pro プランを見る」 */}
      {!isPro && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settingsViewProPlans')}
          testID="e2e_view_pro_plans"
          style={[styles.primaryCta, { backgroundColor: c.tint }]}
          onPress={() => router.push('/pro' as Href)}
        >
          <ThemedText style={[styles.primaryCtaText, { color: c.onTint }]}>
            {t('settingsViewProPlans')}
          </ThemedText>
        </Pressable>
      )}

      {/* 7. F-13 Phase 2d (Issue #20, ADR-0009 AC4-1): 購入復元 (Apple Review 3.1.1) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('settingsRestoreTitle')}
        accessibilityHint={t('settingsRestoreDesc')}
        testID="e2e_settings_restore_purchase"
        style={[styles.entry, { borderBottomColor: c.border }, restoring && styles.entryDisabled]}
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

// Sess65 PR2-a: 色は全て inline c.* で動的指定するため StyleSheet からは削除。
// レイアウト + font 関連のみ static で保持。 BORDER_DEFAULT / TEXT_* / BG_SURFACE 参照を除去。
const styles = StyleSheet.create({
  entry: {
    padding: 16,
    borderBottomWidth: 1,
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
  bodyText: { fontSize: 13, lineHeight: 20 },
  // Sess60 PR3: Settings PlanSection bullet → 3 列表に変更 (PaywallScreen FeatureRow と同設計)
  // 幅 720dp で 機能 60% / Free 20% / Pro 20% を flexbox で割り当て
  featureTable: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  // Sess104 #1210: typography は featureTable* token に集約 (正準 = Paywall 版)。
  featureHeaderLabel: {
    flex: 1,
    ...featureTableHeaderLabel,
  },
  featureHeaderFree: {
    width: 60,
    textAlign: 'center',
    ...featureTableHeaderValue,
  },
  featureHeaderPro: {
    width: 60,
    textAlign: 'center',
    ...featureTableHeaderValuePro,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  featureRowLast: {
    borderBottomWidth: 0,
  },
  featureLabel: {
    flex: 1,
    fontSize: 13,
  },
  featureFree: {
    width: 60,
    textAlign: 'center',
    fontSize: 12,
  },
  featurePro: {
    width: 60,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  primaryCta: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  // Sess70 PR-C3: color は inline c.onTint (scheme-aware)。
  primaryCtaText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  planStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  planStatusBadgePro: { borderColor: ACCENT_GOLD, backgroundColor: ACCENT_GOLD },
  planStatusBadgeText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
  // Sess70 PR-C3: ACCENT_GOLD は両 theme 同色維持、 文字色は白固定 (Pro バッジ仕様)。
  // eslint-disable-next-line local/no-color-hex-literal-in-stylesheet -- reason: pro badge gold bg uses fixed white text (両 theme で ACCENT_GOLD bg 上の固定白、 design_system.md §2-1 Pro バッジ仕様)
  planStatusBadgeTextPro: { color: '#FFFFFF' },
  // Sess70 PR-C3: bg / color は inline c.tint / c.onTint (scheme-aware)。
  planUpgradeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planUpgradeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
