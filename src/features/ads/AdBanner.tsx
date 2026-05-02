/**
 * F-14 Phase A AdBanner (Issue #22 / ADR-0010、F-LEGAL-001 #37 Phase B 統合)。
 *
 * - Pro 時は完全非表示 (useProStore.isPro で分岐、ADR-0010)
 * - Free + canRequestAds=true のときのみ INLINE_ADAPTIVE_BANNER を表示
 * - initializeAds() は app/_layout.tsx で起動 hook 済 (PR #72)
 * - Web は表示しない (react-native-google-mobile-ads は Native 専用)
 *
 * Phase B 以降のスコープ:
 * - Maestro flow (att_dialog / ump_consent_eea / pro_no_ads)
 * - 実機 ATT/UMP 発火確認 (人間タスク)
 * - 誤タップ防止 X ボタン 48dp 以上
 * - ATT pre-prompt (中立説明型)
 */
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { getBannerUnitId, initializeAds } from '@/src/services/adService';
import { useProStore } from '@/src/stores/proStore';

export function AdBanner() {
  const isWeb = Platform.OS === 'web';
  const isPro = useProStore((s) => s.isPro);
  const proInitialized = useProStore((s) => s.initialized);
  const unitId = getBannerUnitId();
  const [ready, setReady] = React.useState(false);

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
  if (isPro) return null;
  if (!proInitialized) return null;
  if (!unitId) return null;
  if (!ready) return null;

  return (
    <View style={styles.container} testID="e2e_ad_banner">
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.INLINE_ADAPTIVE_BANNER}
        onAdFailedToLoad={handleAdFailedToLoad}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
});
