/**
 * F-13 Phase 1b Paywall (Issue #20、ADR-0009 + ADR-0049 + ADR-0020 ClaudeDesign 整合)。
 *
 * Sess105 PR1: ClaudeDesign monetization-screens.jsx 準拠で PlanCard 構造変換。
 * - 旧: 各 plan ごとに独立 CTA ボタンの 3 並列カード
 * - 新: radio 選択型 PlanRow × 3 + 単一 sticky CTA (画面下固定) + サブコピー + おすすめ pin
 *       + 月割り表示 (年額のみ、 RC pricePerMonthString) + 「税込・いつでも解約」 セクション
 * Champion / isPro 時の sticky CTA 制御 (Champion = 完全非表示、 isPro 非 lifetime = lifetime 選択時のみ enable)。
 * 法務安全: 取消線元値 / 「33% お得」 % 表示は本 PR 不採用 (景品表示法 5 条リスク回避、 ADR/RC 設定整備後の別 PR で再検討)。
 */
import React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
import { ACCENT_BARK, ACCENT_GOLD } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { LegalLinksRow } from '@/src/features/legal/LegalLinksRow';
import { shouldHideSubscriptions } from '@/src/features/pro/championMode';
import {
  mapPurchaseErrorCode,
  proService,
  type PlanType,
  type PriceDetails,
  type PurchaseErrorKind,
} from '@/src/services/proService';
import { useProStore } from '@/src/stores/proStore';
import {
  SERIF_FAMILY,
  featureTableHeaderLabel,
  featureTableHeaderValue,
  featureTableHeaderValuePro,
} from '@/src/core/theme/typography';

// F-13 Phase 2c-2 (Issue #20, ADR-0009 AC8): RC エラーコードを UI 文言キーにマッピング
// Sess81: offeringsEmpty を追加 (= RC Offerings null or Package not found のとき
// 「ストア準備中」 と前向きに伝える、 `purchaseFailed` 万能エラー回避)。
const PURCHASE_ERROR_MESSAGE_KEY: Record<
  Exclude<PurchaseErrorKind, 'cancelled'>,
  TranslationKey
> = {
  pending: 'purchasePending',
  network: 'purchaseErrorNetwork',
  alreadyPurchased: 'purchaseErrorAlreadyPurchased',
  storeProblem: 'purchaseErrorStoreProblem',
  notAllowed: 'purchaseErrorNotAllowed',
  offeringsEmpty: 'purchaseErrorOfferingsEmpty',
  unknown: 'purchaseFailed',
};

export default function PaywallScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const c = useColors();
  const isPro = useProStore((s) => s.isPro);
  const planType = useProStore((s) => s.planType);
  const initPro = useProStore((s) => s.init);
  const refreshPro = useProStore((s) => s.refresh);
  const purchasePro = useProStore((s) => s.purchase);
  const restorePro = useProStore((s) => s.restore);

  const [priceDetails, setPriceDetails] = React.useState<PriceDetails | null>(null);
  const [loadingPrices, setLoadingPrices] = React.useState(true);
  const [action, setAction] = React.useState<PlanType | 'restore' | null>(null);
  const hideSubscriptions = shouldHideSubscriptions(planType);
  const isChampion = planType === 'lifetime';
  // Sess105 PR1: Free → 年額デフォルト選択 (上位誘導)。 isPro 非 lifetime は lifetime のみ購入可能。
  const [selectedPlan, setSelectedPlan] = React.useState<PlanType>(
    hideSubscriptions ? 'lifetime' : 'yearly',
  );

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
    // Sess81: priceDetails 自体が null = `getOfferings()` 失敗 (RC Dashboard 未設定 or
    // 24h プロパゲーション中)。 全 plan で同じ「ストア準備中」 文言に切替えてテスター混乱回避。
    if (!priceDetails) return t('priceUnavailableStorePreparing');
    return priceDetails[plan]?.priceString ?? t('priceUnavailable');
  };

  // Sess105 PR1: 月割り表示 (年額のみ、 RC pricePerMonthString が null/未設定なら null を返す)
  const yearlyPerMonthLabel = React.useMemo(() => {
    const pm = priceDetails?.yearly?.pricePerMonthString;
    if (!pm) return null;
    return t('paywallPlanYearlyPerMonth').replace('{amount}', pm);
  }, [priceDetails, t]);

  const proStateLabel = isPro
    ? planType === 'lifetime'
      ? t('proPlanLifetimeTitle')
      : planType === 'yearly'
        ? t('proPlanYearlyTitle')
        : t('proPlanMonthlyTitle')
    : t('proPlanFreeTitle');

  // Sess105 PR1: sticky CTA disabled / 表示判定。
  // - Champion (lifetime) は完全非表示 (ScrollView 末尾の Champion banner で訴求済)
  // - isPro 非 lifetime + selectedPlan が非 lifetime: disabled (購入済プラン再購入不可)
  // - action 進行中: disabled
  const stickyCtaDisabled =
    action !== null ||
    (isPro && selectedPlan !== 'lifetime') ||
    (isChampion && selectedPlan === 'lifetime');
  const showStickyCta = !isChampion;

  // sticky CTA 上の動的サマリ
  const stickySummary = React.useMemo(() => {
    const price = priceLabel(selectedPlan);
    if (selectedPlan === 'monthly') {
      return t('paywallStickyCtaSummaryMonthly').replace('{price}', price);
    }
    if (selectedPlan === 'yearly') {
      return t('paywallStickyCtaSummaryYearly')
        .replace('{price}', price)
        .replace('{perMonth}', yearlyPerMonthLabel ?? '');
    }
    return t('paywallStickyCtaSummaryLifetime').replace('{price}', price);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlan, priceDetails, loadingPrices, yearlyPerMonthLabel, t]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.scroll, showStickyCta && styles.scrollWithStickyCta]}
          testID="e2e_paywall_screen"
        >
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
              <ThemedText style={[styles.closeText, { color: c.text }]}>{'×'}</ThemedText>
            </Pressable>
            <ThemedText style={[styles.headerTitle, { color: c.text }]}>
              {t('paywallModalHeaderTitle')}
            </ThemedText>
            <View style={styles.headerSide} />
          </View>

          {/* ADR-0020 v1.x-5: Claude Design Hero (NotoSerifJP 32pt、letterSpacing 0.5) */}
          <View style={styles.hero}>
            <ThemedText style={[styles.heroEyebrow, { color: c.textMuted }]}>
              {t('paywallHeroEyebrow')}
            </ThemedText>
            <ThemedText style={[styles.heroTitle, { color: c.text }]}>
              {t('paywallHeroTitle')}
            </ThemedText>
            <ThemedText style={[styles.heroBody, { color: c.textSecondary }]}>
              {t('paywallHeroBody')}
            </ThemedText>
          </View>

          {isChampion ? (
            <View
              style={[styles.championBanner, { backgroundColor: c.tintSubtle }]}
              testID="e2e_paywall_champion_banner"
            >
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
            <View style={[styles.statusBox, { borderColor: c.border }]}>
              <ThemedText type="defaultSemiBold">{proStateLabel}</ThemedText>
            </View>
          )}

          {/* ADR-0049 Sess59 PR2 + Sess81 PR-9: Pro 機能 7 項目 (写真/タグ/作業記録写真/CSV/広告/カスタム/定期予定) */}
          <View
            style={[styles.featureTable, { backgroundColor: c.surface, borderColor: c.border }]}
            testID="e2e_paywall_comparison"
          >
            <View style={[styles.featureHeader, { borderBottomColor: c.border }]}>
              <ThemedText style={[styles.featureHeaderLabel, { color: c.textMuted }]}>
                {t('paywallFeatureColLabel')}
              </ThemedText>
              <ThemedText style={[styles.featureHeaderFree, { color: c.textMuted }]}>
                FREE
              </ThemedText>
              <ThemedText style={[styles.featureHeaderPro, { color: c.tint }]}>PRO</ThemedText>
            </View>
            <FeatureRow
              label={t('paywallFeaturePhoto')}
              free={t('paywallFeaturePhotoFreeValue')}
              pro={t('paywallFeaturePhotoProValue')}
            />
            <FeatureRow
              label={t('paywallFeatureTag')}
              free={t('paywallFeatureTagFreeValue')}
              pro={t('paywallFeatureTagProValue')}
            />
            <FeatureRow
              label={t('paywallFeatureWorkLogPhoto')}
              free={t('paywallFeatureWorkLogPhotoFreeValue')}
              pro={t('paywallFeatureWorkLogPhotoProValue')}
            />
            <FeatureRow
              label={t('paywallFeatureCsv')}
              free={t('paywallFeatureCsvFreeValue')}
              pro={t('paywallFeatureCsvProValue')}
            />
            <FeatureRow
              label={t('paywallFeatureNoAds')}
              free={t('paywallFeatureNoAdsFreeValue')}
              pro={t('paywallFeatureNoAdsProValue')}
            />
            <FeatureRow
              label={t('paywallFeatureCustomSpecies')}
              free={t('paywallFeatureCustomSpeciesFreeValue')}
              pro={t('paywallFeatureCustomSpeciesProValue')}
            />
            <FeatureRow
              label={t('paywallFeatureRecurringRule')}
              free={t('paywallFeatureRecurringRuleFreeValue')}
              pro={t('paywallFeatureRecurringRuleProValue')}
            />
          </View>

          {/* Sess105 PR1: PlanRow セクション (radio + おすすめ pin + サブコピー + 月割り表示) */}
          {!isChampion && (
            <>
              <View style={styles.plansHeader}>
                <ThemedText style={[styles.plansHeaderLabel, { color: c.textMuted }]}>
                  {t('paywallPlanSectionLabel')}
                </ThemedText>
                <ThemedText style={[styles.plansHeaderTax, { color: c.textSecondary }]}>
                  {t('paywallTaxNotice')}
                </ThemedText>
              </View>

              <View style={styles.plansList}>
                {!hideSubscriptions && (
                  <PlanRow
                    testID="e2e_plan_yearly"
                    title={t('proPlanYearlyTitle')}
                    subCopy={t('paywallPlanYearlySubCopy')}
                    perMonth={yearlyPerMonthLabel}
                    price={priceLabel('yearly')}
                    period={t('paywallPlanPeriodYear')}
                    recommended
                    recommendedBadgeLabel={t('paywallPlanRecommendedBadge')}
                    selected={selectedPlan === 'yearly'}
                    disabled={isPro || action !== null}
                    onSelect={() => setSelectedPlan('yearly')}
                  />
                )}
                {!hideSubscriptions && (
                  <PlanRow
                    testID="e2e_plan_monthly"
                    title={t('proPlanMonthlyTitle')}
                    subCopy={t('paywallPlanMonthlySubCopy')}
                    perMonth={null}
                    price={priceLabel('monthly')}
                    period={t('paywallPlanPeriodMonth')}
                    selected={selectedPlan === 'monthly'}
                    disabled={isPro || action !== null}
                    onSelect={() => setSelectedPlan('monthly')}
                  />
                )}
                <PlanRow
                  testID="e2e_plan_lifetime"
                  title={t('proPlanLifetimeTitle')}
                  subCopy={t('paywallPlanLifetimeSubCopy')}
                  perMonth={null}
                  price={priceLabel('lifetime')}
                  period={t('paywallPlanPeriodLifetime')}
                  selected={selectedPlan === 'lifetime'}
                  disabled={action !== null}
                  onSelect={() => setSelectedPlan('lifetime')}
                />
              </View>
            </>
          )}

          {/* Apple Review 3.1.1: 「購入を復元」 は Paywall 内に表示必須 */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('restore')}
            testID="e2e_paywall_restore"
            style={[styles.restoreBtn, { borderColor: c.border }]}
            disabled={action !== null}
            onPress={handleRestore}
            hitSlop={8}
          >
            {action === 'restore' ? (
              <ActivityIndicator />
            ) : (
              <ThemedText style={styles.restoreText}>{t('restore')}</ThemedText>
            )}
          </Pressable>

          <ThemedText style={styles.finePrint}>{t('proFinePrint')}</ThemedText>
          <ThemedText style={styles.finePrint}>{t('proLifetimeFinePrint')}</ThemedText>

          {/* Sess57: Apple Review 3.1.1 / Google Play Data Safety 整合で Paywall に
              利用規約 + プライバシーポリシーリンクを掲載。Settings と共通の LegalLinksRow を流用。 */}
          <View style={styles.legalLinks}>
            <LegalLinksRow />
          </View>
        </ScrollView>

        {/* Sess105 PR1: sticky 単一 CTA (画面下固定)。 Champion (lifetime) は完全非表示。 */}
        {showStickyCta && (
          <View
            style={[
              styles.stickyFooter,
              { backgroundColor: c.background, borderTopColor: c.border },
            ]}
          >
            <ThemedText style={[styles.stickySummary, { color: c.textMuted }]} numberOfLines={1}>
              {stickySummary}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('paywallStickyCtaLabel')}
              testID="e2e_paywall_sticky_cta"
              style={[
                styles.stickyCta,
                { backgroundColor: stickyCtaDisabled ? c.disabledBg : c.tint },
              ]}
              disabled={stickyCtaDisabled}
              onPress={() => handlePurchase(selectedPlan)}
            >
              {action === selectedPlan ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={[styles.stickyCtaText, { color: c.onTint }]}>
                  {t('paywallStickyCtaLabel')}
                </ThemedText>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

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
  const c = useColors();
  return (
    <View style={[styles.featureRow, { borderBottomColor: c.border }]}>
      <ThemedText
        style={[styles.featureLabel, { color: c.text }, highlight && styles.featureLabelHighlight]}
      >
        {label}
      </ThemedText>
      <ThemedText style={[styles.featureFree, { color: c.textMuted }]}>{free}</ThemedText>
      <ThemedText style={[styles.featurePro, { color: c.tint }]}>{pro}</ThemedText>
    </View>
  );
}

type PlanRowProps = {
  testID: string;
  title: string;
  subCopy: string;
  perMonth: string | null;
  price: string;
  period: string;
  recommended?: boolean;
  recommendedBadgeLabel?: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
};

function PlanRow({
  testID,
  title,
  subCopy,
  perMonth,
  price,
  period,
  recommended = false,
  recommendedBadgeLabel,
  selected,
  disabled,
  onSelect,
}: PlanRowProps) {
  const c = useColors();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={title}
      onPress={disabled ? undefined : onSelect}
      style={[
        styles.planRow,
        {
          backgroundColor: selected ? c.tintSubtle : c.surface,
          borderColor: selected ? c.tint : c.border,
          borderWidth: selected ? 2 : 1,
          opacity: disabled ? 0.5 : 1,
        },
        recommended && styles.planRowRecommendedSpacing,
      ]}
    >
      {recommended && recommendedBadgeLabel && (
        <View style={[styles.recommendedPin, { backgroundColor: c.tint }]}>
          <View style={[styles.recommendedDot, { backgroundColor: ACCENT_GOLD }]} />
          <ThemedText style={[styles.recommendedPinText, { color: c.onTint }]}>
            {recommendedBadgeLabel}
          </ThemedText>
        </View>
      )}
      <View style={[styles.radio, { borderColor: selected ? c.tint : c.border }]}>
        {selected && <View style={[styles.radioDot, { backgroundColor: c.tint }]} />}
      </View>
      <View style={styles.planMiddle}>
        <ThemedText type="defaultSemiBold" style={[styles.planTitle, { color: c.text }]}>
          {title}
        </ThemedText>
        <ThemedText style={[styles.planSubCopy, { color: c.textSecondary }]}>{subCopy}</ThemedText>
        {perMonth && (
          <ThemedText style={[styles.planPerMonth, { color: c.textMuted }]}>{perMonth}</ThemedText>
        )}
      </View>
      <View style={styles.planRight}>
        <View style={styles.planPriceRow}>
          <ThemedText style={[styles.planPrice, { color: selected ? c.tint : c.text }]}>
            {price}
          </ThemedText>
          <ThemedText style={[styles.planPeriod, { color: c.textSecondary }]}>{period}</ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  scrollWithStickyCta: { paddingBottom: 140 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 4 },
  headerSide: { width: 48, alignItems: 'flex-start', justifyContent: 'center' },
  closeText: { fontSize: 28, paddingHorizontal: 8 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: SERIF_FAMILY,
    fontSize: 20,
    letterSpacing: 0.4,
  },
  // ADR-0020 v1.x-5: Hero (Claude Design monetization-screens.jsx 整合、NotoSerifJP 32pt)
  hero: { paddingTop: 12, paddingHorizontal: 8, paddingBottom: 8, gap: 8 },
  heroEyebrow: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: SERIF_FAMILY,
    fontSize: 32,
    lineHeight: 42,
    letterSpacing: 0.5,
  },
  heroBody: { fontSize: 15, lineHeight: 24 },
  // FeatureRow テーブル (Free / Pro 比較)
  featureTable: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  featureHeaderLabel: {
    flex: 1,
    ...featureTableHeaderLabel,
  },
  featureHeaderFree: {
    width: 64,
    textAlign: 'center',
    ...featureTableHeaderValue,
  },
  featureHeaderPro: {
    width: 64,
    textAlign: 'center',
    ...featureTableHeaderValuePro,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  featureLabel: { flex: 1, fontSize: 14 },
  featureLabelHighlight: { fontWeight: '500' },
  featureFree: { width: 64, textAlign: 'center', fontSize: 13 },
  featurePro: {
    width: 64,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
  },
  statusBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  championBanner: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: ACCENT_GOLD,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  championBannerEmoji: { fontSize: 32 },
  championBannerTextWrap: { flex: 1, gap: 4 },
  championBannerTitle: { fontSize: 16, color: ACCENT_BARK },
  championBannerDesc: { fontSize: 13, color: ACCENT_BARK, lineHeight: 18 },
  // Sess105 PR1: Plan section header (label + tax notice)
  plansHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
    marginBottom: -4,
  },
  plansHeaderLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  plansHeaderTax: { fontSize: 12 },
  plansList: { gap: 10 },
  // Sess105 PR1: PlanRow (radio + middle + price right)
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 12,
    position: 'relative',
    minHeight: 88,
  },
  // pin (top: -10, height ≈22) が中身に重ならないよう paddingTop で content を下げる
  planRowRecommendedSpacing: { marginTop: 14, paddingTop: 26 },
  recommendedPin: {
    position: 'absolute',
    top: -10,
    left: 16,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recommendedDot: { width: 4, height: 4, borderRadius: 2 },
  recommendedPinText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 11, height: 11, borderRadius: 6 },
  planMiddle: { flex: 1, minWidth: 0, gap: 4 },
  planTitle: { fontSize: 16 },
  planSubCopy: { fontSize: 12, lineHeight: 17 },
  planPerMonth: { fontSize: 11, marginTop: 1 },
  planRight: { alignItems: 'flex-end' },
  planPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  planPrice: {
    fontFamily: SERIF_FAMILY,
    fontSize: 24,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  planPeriod: { fontSize: 12 },
  // Sess105 PR1: Restore (Apple Review 3.1.1)
  restoreBtn: {
    paddingVertical: 14,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  restoreText: { fontSize: 14 },
  finePrint: { fontSize: 11, opacity: 0.65, lineHeight: 16 },
  legalLinks: { marginTop: 16 },
  // Sess105 PR1: sticky CTA footer (画面下固定)
  stickyFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: 1,
    gap: 8,
  },
  stickySummary: {
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  stickyCta: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyCtaText: { fontSize: 17, fontWeight: '600', letterSpacing: 0.6 },
});
