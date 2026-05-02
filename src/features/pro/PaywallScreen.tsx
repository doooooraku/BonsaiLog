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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import { proService, type PlanType, type PriceDetails } from '@/src/services/proService';
import { useProStore } from '@/src/stores/proStore';

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

  // Champion 方式 (Pocket Casts): Lifetime 所持時はサブスク非表示。
  const hideSubscriptions = planType === 'lifetime';

  const handlePurchase = React.useCallback(
    async (plan: PlanType) => {
      setAction(plan);
      try {
        await purchasePro(plan);
        Alert.alert(t('purchaseSuccess'));
      } catch {
        Alert.alert(t('purchaseFailed'));
      } finally {
        setAction(null);
      }
    },
    [purchasePro, t],
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
            onPress={() => router.back()}
            testID="e2e_paywall_close"
            hitSlop={8}
          >
            <ThemedText style={styles.closeText}>{'<'}</ThemedText>
          </Pressable>
          <ThemedText type="title">{t('proTitle')}</ThemedText>
        </View>

        <View style={styles.statusBox}>
          <ThemedText type="defaultSemiBold">{proStateLabel}</ThemedText>
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
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  closeText: { fontSize: 22, paddingHorizontal: 8 },
  statusBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#FFE082',
    color: '#5D4037',
  },
  price: { fontSize: 20, fontWeight: '600' },
  cta: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#2E7D32',
  },
  ctaDisabled: { backgroundColor: '#9E9E9E' },
  ctaText: { color: '#FFFFFF', fontWeight: '600' },
  restoreBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  restoreText: { fontSize: 14 },
  finePrint: { fontSize: 11, opacity: 0.65, lineHeight: 16 },
});
