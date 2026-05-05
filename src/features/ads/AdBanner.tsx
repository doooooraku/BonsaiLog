/**
 * F-14 Phase A/B AdBanner (Issue #22 / ADR-0010、F-LEGAL-001 #37 Phase B 統合)。
 *
 * ADR-0020 Phase 9: Repolog の `apps/Repolog/components/ad-banner.tsx` 同等構成に統一:
 *   - INLINE_ADAPTIVE_BANNER + maxHeight={90} (旧実装は maxHeight 未指定 → 半画面占有問題)
 *   - paddingVertical 8 (旧 16dp 過剰余白を解消)
 *   - 「広告」ラベル削除 (Repolog 同等、AdMob 標準の "Test Ad" / 配信元バッジに任せる)
 *
 * - Pro 時は完全非表示 (useProStore.isPro で分岐、ADR-0010)
 * - Free + canRequestAds=true のときのみ表示
 * - initializeAds() は app/_layout.tsx で起動 hook 済 (PR #72)
 * - Web は表示しない (react-native-google-mobile-ads は Native 専用)
 * - resolveAdServingMode で Pro / UMP / ATT 状態から配信モード判定 (既存ロジック維持)
 */
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import {
  getAttStatus,
  getBannerUnitId,
  initializeAds,
  resolveAdServingMode,
} from '@/src/services/adService';
import { useProStore } from '@/src/stores/proStore';

export function AdBanner() {
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

  const mode = resolveAdServingMode({
    isPro,
    attAuthorized,
    umpCanRequestAds: ready,
  });

  if (mode === 'none') return null;

  return (
    <View style={styles.container} testID="e2e_ad_banner">
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.INLINE_ADAPTIVE_BANNER}
        // ADR-0020 Phase 9: maxHeight 90px で画面占有 < 12% を保証 (Repolog 同等)
        maxHeight={90}
        requestOptions={{ requestNonPersonalizedAdsOnly: mode === 'non_personalized' }}
        onAdFailedToLoad={handleAdFailedToLoad}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // ADR-0020 Phase 9: 上下 8dp (Repolog 同等、誤タップ防止しつつ占有最小化)
  container: { paddingVertical: 8, alignItems: 'center' },
});
