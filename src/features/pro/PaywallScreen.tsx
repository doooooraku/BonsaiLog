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
// Sess66 PR6c: theme-dependent token (BG_*/TEXT_*/BORDER_*) を inline c.* に移行 (dark cascade)。
// Sess70 PR-C3: BRAND_GREEN / BRAND_GREEN_BG / DISABLED_BG / ON_BRAND を scheme-aware
// (c.tint / c.tintSubtle / c.disabledBg / c.onTint) に移行 (ADR-0015/0052 Sess69 PR-A Amendment 整合)。
// ACCENT_BARK は champion banner で利用継続 (PR-D で再検討、 ここでは static 維持)、
// ACCENT_GOLD は Pro バッジ専用 brand-static (両 theme 同色維持)。
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
    // Sess81: priceDetails 自体が null = `getOfferings()` 失敗 (RC Dashboard 未設定 or
    // 24h プロパゲーション中)。 全 plan で同じ「ストア準備中」 文言に切替えてテスター混乱回避。
    if (!priceDetails) return t('priceUnavailableStorePreparing');
    return priceDetails[plan]?.priceString ?? t('priceUnavailable');
  };

  const proStateLabel = isPro
    ? planType === 'lifetime'
      ? t('proPlanLifetimeTitle')
      : planType === 'yearly'
        ? t('proPlanYearlyTitle')
        : t('proPlanMonthlyTitle')
    : t('proPlanFreeTitle');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
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

        {planType === 'lifetime' ? (
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

        {/* ADR-0049 Sess59 PR2: Sess58 確定 Pro 機能 6 項目に整合 (旧 BonsaiCount/History/
            Backup/Theme は Sess58 で「全 Free」 確定のため row 削除、 新規 ①Photo + ②Tag +
            ③WorkLogPhoto + ⑥CustomSpecies の 4 行追加)。 */}
        <View
          style={[styles.featureTable, { backgroundColor: c.surface, borderColor: c.border }]}
          testID="e2e_paywall_comparison"
        >
          <View style={[styles.featureHeader, { borderBottomColor: c.border }]}>
            <ThemedText style={[styles.featureHeaderLabel, { color: c.textMuted }]}>
              {t('paywallFeatureColLabel')}
            </ThemedText>
            <ThemedText style={[styles.featureHeaderFree, { color: c.textMuted }]}>FREE</ThemedText>
            <ThemedText style={[styles.featureHeaderPro, { color: c.tint }]}>PRO</ThemedText>
          </View>
          {/* ① 基本情報 写真 (ADR-0049、 PR3 で実装) */}
          <FeatureRow
            label={t('paywallFeaturePhoto')}
            free={t('paywallFeaturePhotoFreeValue')}
            pro={t('paywallFeaturePhotoProValue')}
          />
          {/* ② タグ作成 (rename は無制限、 ADR-0049、 PR4 で実装) */}
          <FeatureRow
            label={t('paywallFeatureTag')}
            free={t('paywallFeatureTagFreeValue')}
            pro={t('paywallFeatureTagProValue')}
          />
          {/* ③ 作業記録 写真 (表示は全 Free、 ADR-0049、 PR3 で実装) */}
          <FeatureRow
            label={t('paywallFeatureWorkLogPhoto')}
            free={t('paywallFeatureWorkLogPhotoFreeValue')}
            pro={t('paywallFeatureWorkLogPhotoProValue')}
          />
          {/* ④ CSV/PDF エクスポート (既存実装済、 csvExport.ts L8 で Pro guard) */}
          {/* Sess60 PR2: literal "—" "◎" を i18n key に置換 (値表記統一) */}
          <FeatureRow
            label={t('paywallFeatureCsv')}
            free={t('paywallFeatureCsvFreeValue')}
            pro={t('paywallFeatureCsvProValue')}
          />
          {/* ⑤ 広告非表示 (既存実装済、 adService.ts L170-174 で isPro 判定) */}
          <FeatureRow
            label={t('paywallFeatureNoAds')}
            free={t('paywallFeatureNoAdsFreeValue')}
            pro={t('paywallFeatureNoAdsProValue')}
          />
          {/* ⑥ カスタム樹種・樹形 (マスタ 5 + カスタム 3、 ADR-0049、 PR5 で実装) */}
          <FeatureRow
            label={t('paywallFeatureCustomSpecies')}
            free={t('paywallFeatureCustomSpeciesFreeValue')}
            pro={t('paywallFeatureCustomSpeciesProValue')}
          />
          {/* ⑦ 定期予定 (Free 3 件 / Pro 無制限、 Sess81 PR-9、 ADR-0056 D7) */}
          <FeatureRow
            label={t('paywallFeatureRecurringRule')}
            free={t('paywallFeatureRecurringRuleFreeValue')}
            pro={t('paywallFeatureRecurringRuleProValue')}
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
          style={[styles.restoreBtn, { borderColor: c.border }]}
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

        {/* Sess57: Apple Review 3.1.1 / Google Play Data Safety 整合で Paywall に
            利用規約 + プライバシーポリシーリンクを掲載。Settings と共通の LegalLinksRow を流用。 */}
        <View style={styles.legalLinks}>
          <LegalLinksRow />
        </View>
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

function PlanCard({ testID, title, badge, price, cta, busy, disabled, onPress }: PlanCardProps) {
  const c = useColors();
  return (
    <View style={[styles.card, { borderColor: c.border }]} testID={testID}>
      <View style={styles.cardHeader}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        {badge && <ThemedText style={styles.badge}>{badge}</ThemedText>}
      </View>
      <ThemedText style={styles.price}>{price}</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={cta}
        style={[styles.cta, { backgroundColor: disabled ? c.disabledBg : c.tint }]}
        disabled={disabled}
        onPress={onPress}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText style={[styles.ctaText, { color: c.onTint }]}>{cta}</ThemedText>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Sess66 PR6c: 全 theme-dependent 色を inline c.* に (dark cascade)。
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
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
  // Sess70 PR-C3: color は inline c.tint (scheme-aware)。
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
  // Sess70 PR-C3: color は inline c.tint (scheme-aware)。
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
  // Sess70 PR-C3: bg は inline c.tintSubtle (scheme-aware)、 ACCENT_GOLD border は static 維持。
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
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // pill 999 → 8 (design_system.md §5)、accent-gold で Pro 推奨マーク。
  // Sess70 PR-C3: ACCENT_GOLD bg + 白文字は両 theme 同色 (Pro バッジ仕様、 ADR-0015 Allowed)、
  // PR-D で hex literal rule 例外 marker 規約化予定。
  badge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: ACCENT_GOLD,
    color: '#FFFFFF',
  },
  price: { fontSize: 20, fontWeight: '600' },
  // Sess70 PR-C3: bg / color は inline c.tint / c.disabledBg / c.onTint (scheme-aware)。
  cta: {
    paddingVertical: 14,
    minHeight: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontWeight: '600' },
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
});
