/**
 * F-13 Phase 1b Paywall 骨組み (Issue #20、ADR-0009)。
 *
 * Repolog 565 行版から最小骨組みに絞った実装。Phase 1c 以降で:
 * - Champion 方式 (Lifetime 所持時はサブスク非表示) ← 本 PR で実装
 * - Pro 状態 3 種表示 (Free / Pro 月年・期限まで / Pro 買切) ← 本 PR で実装
 * - Restore ボタン (Apple Review 3.1.1) ← 本 PR で実装
 * - 個別プラン CTA カード (3 種) ← 本 PR で実装
 *
 * Phase 1c 以降:
 * - 価格表示の locale 別フォーマット (年額月割「33% お得」バッジ等)
 * - 機能比較表 (写真∞ / CSV / PDF / 広告非表示 / 樹種別作業時期)
 * - Apple Review 3.1.2(c): サブスク中ユーザーの Lifetime 購入時の手動解約警告
 * - DPA リンク / Privacy Policy リンク (legalService 流用)
 * - Maestro `paywall_to_purchase.yaml`
 */
import React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
import {
  ACCENT_BARK,
  ACCENT_GOLD,
  BG_PRIMARY,
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  BRAND_GREEN_BG,
  DISABLED_BG,
  ON_BRAND,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { shouldHideSubscriptions } from '@/src/features/pro/championMode';
import {
  mapPurchaseErrorCode,
  proService,
  type PlanType,
  type PriceDetails,
  type PurchaseErrorKind,
} from '@/src/services/proService';
import { useProStore } from '@/src/stores/proStore';

// F-13 Phase 2c-2 (Issue #20, ADR-0009 AC8): RC エラーコードを UI 文言キーにマッピング
const PURCHASE_ERROR_MESSAGE_KEY: Record<
  Exclude<PurchaseErrorKind, 'cancelled'>,
  TranslationKey
> = {
  pending: 'purchasePending',
  network: 'purchaseErrorNetwork',
  alreadyPurchased: 'purchaseErrorAlreadyPurchased',
  storeProblem: 'purchaseErrorStoreProblem',
  notAllowed: 'purchaseErrorNotAllowed',
  unknown: 'purchaseFailed',
};

export default function PaywallScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const isPro = useProStore((s) => s.isPro);
  const planType = useProStore((s) => s.planType);
  const initPro = useProStore((s) => s.init);
  const refreshPro = useProStore((s) => s.refresh);
  const purchasePro = useProStore((s) => s.purchase);
  const restorePro = useProStore((s) => s.restore);

  const [priceDetails, setPriceDetails] = React.useState<PriceDetails | null>(null);
  const [loadingPrices, setLoadingPrices] = React.useState(true);
  const [action, setAction] = React.useState<PlanType | 'restore' | null>(null);

  React.useEffect(() => {
    void initPro();
    refreshPro().catch(() => null);
  }, [initPro, refreshPro]);

  React.useEffect(() => {
    let mounted = true;
    setLoadingPrices(true);
    proService
      .getPriceDetails()
      .then((d) => {
        if (mounted) setPriceDetails(d);
      })
      .catch(() => {
        if (mounted) setPriceDetails(null);
      })
      .finally(() => {
        if (mounted) setLoadingPrices(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const hideSubscriptions = shouldHideSubscriptions(planType);

  const startPurchase = React.useCallback(
    async (plan: PlanType) => {
      setAction(plan);
      try {
        await purchasePro(plan);
        Alert.alert(t('purchaseSuccess'));
      } catch (err) {
        const code = (err as { code?: unknown } | null | undefined)?.code;
        const kind = mapPurchaseErrorCode(code);
        // AC2-4: 購入キャンセルは無音 (Paywall 維持)
        if (kind === 'cancelled') return;
        Alert.alert(t(PURCHASE_ERROR_MESSAGE_KEY[kind]));
      } finally {
        setAction(null);
      }
    },
    [purchasePro, t],
  );

  const handlePurchase = React.useCallback(
    (plan: PlanType) => {
      // F-13 Phase 2d (Issue #20, ADR-0009 AC5): Apple Review 3.1.2(c) 透明性。
      // Lifetime 購入時、既存サブスク自動キャンセルされない旨を購入前に明示。
      if (plan === 'lifetime') {
        Alert.alert(t('lifetimeWarningTitle'), t('lifetimeWarningBody'), [
          { text: t('cancel'), style: 'cancel' },
          { text: t('confirm'), onPress: () => void startPurchase(plan) },
        ]);
        return;
      }
      void startPurchase(plan);
    },
    [startPurchase, t],
  );

  const handleRestore = React.useCallback(async () => {
    setAction('restore');
    try {
      const result = await restorePro();
      Alert.alert(result.hasActive ? t('restoreSuccess') : t('restoreNotFound'));
    } catch {
      Alert.alert(t('restoreFailed'));
    } finally {
      setAction(null);
    }
  }, [restorePro, t]);

  const priceLabel = (plan: PlanType) => {
    if (loadingPrices) return t('priceLoading');
    return priceDetails?.[plan]?.priceString ?? t('priceUnavailable');
  };

  const proStateLabel = isPro
    ? planType === 'lifetime'
      ? t('proPlanLifetimeTitle')
      : planType === 'yearly'
        ? t('proPlanYearlyTitle')
        : t('proPlanMonthlyTitle')
    : t('proPlanFreeTitle');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} testID="e2e_paywall_screen">
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('close')}
            onPress={() => {
              // fix/247: history が空 (deep link / 直接起動) でも安全に閉じる
              if (router.canGoBack()) router.back();
              else router.replace('/(tabs)/bonsai' as Href);
            }}
            testID="e2e_paywall_close"
            hitSlop={8}
            style={styles.headerSide}
          >
            <ThemedText style={styles.closeText}>{'×'}</ThemedText>
          </Pressable>
          <ThemedText style={styles.headerTitle}>{t('paywallModalHeaderTitle')}</ThemedText>
          <View style={styles.headerSide} />
        </View>

        {/* ADR-0020 v1.x-5: Claude Design Hero (NotoSerifJP 32pt、letterSpacing 0.5) */}
        <View style={styles.hero}>
          <ThemedText style={styles.heroEyebrow}>{t('paywallHeroEyebrow')}</ThemedText>
          <ThemedText style={styles.heroTitle}>{t('paywallHeroTitle')}</ThemedText>
          <ThemedText style={styles.heroBody}>{t('paywallHeroBody')}</ThemedText>
        </View>

        {planType === 'lifetime' ? (
          <View style={styles.championBanner} testID="e2e_paywall_champion_banner">
            <ThemedText style={styles.championBannerEmoji}>👑</ThemedText>
            <View style={styles.championBannerTextWrap}>
              <ThemedText type="defaultSemiBold" style={styles.championBannerTitle}>
                {t('paywallChampionBannerTitle')}
              </ThemedText>
              <ThemedText style={styles.championBannerDesc}>
                {t('paywallChampionBannerDesc')}
              </ThemedText>
            </View>
          </View>
        ) : (
          <View style={styles.statusBox}>
            <ThemedText type="defaultSemiBold">{proStateLabel}</ThemedText>
          </View>
        )}

        {/* ADR-0020 v1.x-5: Claude Design FeatureRow 比較表 (Free / Pro 3 列、機能 / FREE / PRO) */}
        <View style={styles.featureTable} testID="e2e_paywall_comparison">
          <View style={styles.featureHeader}>
            <ThemedText style={styles.featureHeaderLabel}>{t('paywallFeatureColLabel')}</ThemedText>
            <ThemedText style={styles.featureHeaderFree}>FREE</ThemedText>
            <ThemedText style={styles.featureHeaderPro}>PRO</ThemedText>
          </View>
          <FeatureRow label={t('paywallFeatureBonsaiCount')} free="∞" pro="∞" />
          {/* Issue #458 Phase 2: 写真制限撤廃 (principles.md v1.0「写真枚数 Free/Pro
              いずれも無制限」)。Free/Pro 同じ ∞/∞ で冗長なため比較表 row 削除。
              paywallFeaturePhotos key は legacy 残置。 */}
          <FeatureRow label={t('paywallFeatureHistory')} free="∞" pro="∞" />
          <FeatureRow label={t('paywallFeatureBackup')} free="◎" pro="◎" />
          {/* Issue #458 Phase 3: mockup `paywall-01.png` 整合で CSV/PDF を 1 行に統合
              (paywallFeaturePdf key は legacy で残置)。 */}
          <FeatureRow label={t('paywallFeatureCsv')} free="—" pro="◎" />
          <FeatureRow label={t('paywallFeatureYearlyTimeline')} free="—" pro="◎" />
          {/* Issue #335: mockup v1.0 「テーマ」 行追加。ADR-0015 整合 (theme は 3 mode 全 Free)、
              機能差なし = 両方 ◎ で表記。mockup の「標準/◎」 表記は古い情報、ADR 優先 (R-28)。 */}
          <FeatureRow label={t('paywallFeatureTheme')} free="◎" pro="◎" />
          <FeatureRow
            label={t('paywallFeatureNoAds')}
            free={t('paywallFeatureNoAdsFreeValue')}
            pro={t('paywallFeatureNoAdsProValue')}
          />
        </View>

        {!hideSubscriptions && (
          <PlanCard
            testID="e2e_plan_monthly"
            title={t('proPlanMonthlyTitle')}
            price={priceLabel('monthly')}
            cta={t('proCtaMonthly')}
            busy={action === 'monthly'}
            disabled={isPro || action !== null}
            onPress={() => handlePurchase('monthly')}
          />
        )}

        {!hideSubscriptions && (
          <PlanCard
            testID="e2e_plan_yearly"
            title={t('proPlanYearlyTitle')}
            badge={t('proPlanYearlyBadge')}
            price={priceLabel('yearly')}
            cta={t('proCtaYearly')}
            busy={action === 'yearly'}
            disabled={isPro || action !== null}
            onPress={() => handlePurchase('yearly')}
          />
        )}

        <PlanCard
          testID="e2e_plan_lifetime"
          title={t('proPlanLifetimeTitle')}
          badge={t('proPlanLifetimeBadge')}
          price={priceLabel('lifetime')}
          cta={t('proCtaLifetime')}
          busy={action === 'lifetime'}
          disabled={planType === 'lifetime' || action !== null}
          onPress={() => handlePurchase('lifetime')}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('restore')}
          testID="e2e_paywall_restore"
          style={styles.restoreBtn}
          disabled={action !== null}
          onPress={handleRestore}
        >
          {action === 'restore' ? (
            <ActivityIndicator />
          ) : (
            <ThemedText style={styles.restoreText}>{t('restore')}</ThemedText>
          )}
        </Pressable>

        <ThemedText style={styles.finePrint}>{t('proFinePrint')}</ThemedText>
        <ThemedText style={styles.finePrint}>{t('proLifetimeFinePrint')}</ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

type PlanCardProps = {
  testID: string;
  title: string;
  badge?: string;
  price: string;
  cta: string;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
};

function FeatureRow({
  label,
  free,
  pro,
  highlight = false,
}: {
  label: string;
  free: string;
  pro: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.featureRow}>
      <ThemedText style={[styles.featureLabel, highlight && styles.featureLabelHighlight]}>
        {label}
      </ThemedText>
      <ThemedText style={styles.featureFree}>{free}</ThemedText>
      <ThemedText style={styles.featurePro}>{pro}</ThemedText>
    </View>
  );
}

function PlanCard({ testID, title, badge, price, cta, busy, disabled, onPress }: PlanCardProps) {
  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.cardHeader}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        {badge && <ThemedText style={styles.badge}>{badge}</ThemedText>}
      </View>
      <ThemedText style={styles.price}>{price}</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={cta}
        style={[styles.cta, disabled && styles.ctaDisabled]}
        disabled={disabled}
        onPress={onPress}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText style={styles.ctaText}>{cta}</ThemedText>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG_PRIMARY },
  scroll: { padding: 16, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 4 },
  headerSide: { width: 48, alignItems: 'flex-start', justifyContent: 'center' },
  closeText: { fontSize: 28, paddingHorizontal: 8, color: TEXT_PRIMARY },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 20,
    color: TEXT_PRIMARY,
    letterSpacing: 0.4,
  },
  // ADR-0020 v1.x-5: Hero (Claude Design monetization-screens.jsx 整合、NotoSerifJP 32pt)
  hero: { paddingTop: 12, paddingHorizontal: 8, paddingBottom: 8, gap: 8 },
  heroEyebrow: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: TEXT_MUTED,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 32,
    lineHeight: 42,
    color: TEXT_PRIMARY,
    letterSpacing: 0.5,
  },
  heroBody: { fontSize: 15, lineHeight: 24, color: TEXT_SECONDARY },
  // FeatureRow テーブル (Free / Pro 比較)
  featureTable: {
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
  },
  featureHeaderLabel: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: TEXT_MUTED,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  featureHeaderFree: {
    width: 64,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: TEXT_MUTED,
    letterSpacing: 1.2,
  },
  featureHeaderPro: {
    width: 64,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: BRAND_GREEN,
    letterSpacing: 1.2,
    fontWeight: '500',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
  },
  featureLabel: { flex: 1, fontSize: 14, color: TEXT_PRIMARY },
  featureLabelHighlight: { fontWeight: '500' },
  featureFree: { width: 64, textAlign: 'center', fontSize: 13, color: TEXT_MUTED },
  featurePro: {
    width: 64,
    textAlign: 'center',
    fontSize: 13,
    color: BRAND_GREEN,
    fontWeight: '500',
  },
  statusBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    alignItems: 'center',
  },
  championBanner: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: ACCENT_GOLD,
    backgroundColor: BRAND_GREEN_BG,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  championBannerEmoji: { fontSize: 32 },
  championBannerTextWrap: { flex: 1, gap: 4 },
  championBannerTitle: { fontSize: 16, color: ACCENT_BARK },
  championBannerDesc: { fontSize: 13, color: ACCENT_BARK, lineHeight: 18 },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // pill 999 → 8 (design_system.md §5)、accent-gold で Pro 推奨マーク
  badge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: ACCENT_GOLD,
    color: ON_BRAND,
  },
  price: { fontSize: 20, fontWeight: '600' },
  cta: {
    paddingVertical: 14,
    minHeight: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_GREEN,
  },
  ctaDisabled: { backgroundColor: DISABLED_BG },
  ctaText: { color: ON_BRAND, fontWeight: '600' },
  restoreBtn: {
    paddingVertical: 14,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
  },
  restoreText: { fontSize: 14 },
  finePrint: { fontSize: 11, opacity: 0.65, lineHeight: 16 },
});
