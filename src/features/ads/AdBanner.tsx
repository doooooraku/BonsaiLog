/**
 * F-14 Phase A/B AdBanner (Issue #22 / ADR-0010、F-LEGAL-001 #37 Phase B 統合)。
 *
 * - Pro 時は完全非表示 (useProStore.isPro で分岐、ADR-0010)
 * - Free + canRequestAds=true のときのみ INLINE_ADAPTIVE_BANNER を表示
 * - initializeAds() は app/_layout.tsx で起動 hook 済 (PR #72)
 * - Web は表示しない (react-native-google-mobile-ads は Native 専用)
 *
 * Phase B 追加 (本 PR):
 * - 「広告」ラベル (12sp、WCAG AA 4.5:1、functional_spec §19、地域 1 単語)
 * - 16dp 余白 (AdMob 規約 + 誤タップ防止)
 * - 誤タップ防止 X ボタンは AdMob SDK 標準を踏襲 (規約上 overlay は配置不可)
 *
 * Phase C 以降:
 * - Maestro flow (att_dialog / ump_consent_eea / pro_no_ads)
 * - 実機 ATT/UMP 発火確認 (人間タスク)
 * - ATT pre-prompt (中立説明型 7 ステップ)
 * - MaxAdContentRating.PG 設定 + カテゴリフィルタ (ギャンブル / アルコール / 出会い系拒否)
 */
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  getAttStatus,
  getBannerUnitId,
  initializeAds,
  resolveAdServingMode,
} from '@/src/services/adService';
import { useProStore } from '@/src/stores/proStore';

export function AdBanner() {
  const { t } = useTranslation();
  const isWeb = Platform.OS === 'web';
  const isPro = useProStore((s) => s.isPro);
  const proInitialized = useProStore((s) => s.initialized);
  const unitId = getBannerUnitId();
  const [ready, setReady] = React.useState(false);
  const [attAuthorized, setAttAuthorized] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (isWeb) return;
    if (isPro) return;
    if (!proInitialized) return;
    let mounted = true;
    initializeAds()
      .then((canRender) => {
        if (mounted) setReady(canRender);
      })
      .catch(() => {
        if (mounted) setReady(false);
      });
    // F-LEGAL-001 Phase E (Issue #37、ADR-0017 §④): ATT 状態取得 (iOS 14.5+ で
    // 標準ダイアログ発火、Android / Web は null = personalized 扱い)。
    getAttStatus()
      .then((status) => {
        if (mounted) setAttAuthorized(status);
      })
      .catch(() => {
        if (mounted) setAttAuthorized(null);
      });
    return () => {
      mounted = false;
    };
  }, [isWeb, isPro, proInitialized]);

  const handleAdFailedToLoad = React.useCallback((error: Error) => {
    if (__DEV__) {
      console.warn(`[AdBanner] failed to load: ${error.message}`);
    }
  }, []);

  if (isWeb) return null;
  if (!proInitialized) return null;
  if (!unitId) return null;

  // resolveAdServingMode 純関数で Pro / UMP / ATT 状態から配信モードを決定。
  // - mode='none' → 描画しない (Pro / UMP 拒否)
  // - mode='non_personalized' → NPA フラグ付与 (ATT 拒否時、Apple 5.1.2(i))
  // - mode='personalized' → 通常配信
  const mode = resolveAdServingMode({
    isPro,
    attAuthorized,
    umpCanRequestAds: ready,
  });

  if (mode === 'none') return null;

  return (
    <View style={styles.container} testID="e2e_ad_banner">
      <ThemedText style={styles.label} testID="e2e_ad_banner_label">
        {t('adBannerLabel')}
      </ThemedText>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.INLINE_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: mode === 'non_personalized' }}
        onAdFailedToLoad={handleAdFailedToLoad}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16, // 上下 16dp (AdMob 規約 + 誤タップ防止)
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
  },
  // 「広告」ラベル: 12pt、WCAG AA 4.5:1 (#666 on #FFFFFF = 5.74:1)
  label: { fontSize: 12, opacity: 0.7 },
});
