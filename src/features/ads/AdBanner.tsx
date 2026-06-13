/**
 * F-14 AdBanner (Issue #22 / ADR-0010、F-LEGAL-001 #37 Phase B 統合、Sess106 PR-2 = Issue #1247)。
 *
 * Sess106 Amendment (#1247 で 4 点修正集約、 ADR-0010 Sess106 Amendment §22 整合):
 *   - 修正1: minHeight + bg.secondary プレースホルダ (CLS 解消、 起動後 3 秒間も枠維持で「下からニュッ」 体感解消)
 *   - 修正2: useForeground hook で iOS バックグラウンド復帰 60 秒以内の再 load 抑制 (ADR-0010 §58 実装漏れ解消)
 *   - 修正3: useRef アプリ起動時刻基準の遅延 (再 mount で 3 秒タイマー再カウントしない構造保証)
 *   - 修正4: empty/list 両状態で AdBanner 表示維持 (= bonsai/index.tsx の L268/L319、 Day1 Pro 誘導哲学整合、 Sess106 user Q 確定)
 *
 * 過去経緯 (Sess1〜Sess105):
 *   - ADR-0020 Phase 9: Repolog の `apps/Repolog/components/ad-banner.tsx` 同等構成に統一 (INLINE_ADAPTIVE_BANNER + maxHeight=90)
 *   - Issue #22 AC4-3 (F1 PR、 2026-05-10): 起動後 3 秒以上経過後に表示 (誤タップ防止 + Day1 Pro 誘導機会維持、 functional_spec §19、 シニアペルソナの初見びっくり減少)
 *   - Pro 時は完全非表示 (useProStore.isPro で分岐、 ADR-0010)
 *   - Free + canRequestAds=true のときのみ表示
 *   - initializeAds() は app/_layout.tsx で起動 hook 済 (PR #72)
 *   - Web は表示しない (react-native-google-mobile-ads は Native 専用)
 *   - resolveAdServingMode で Pro / UMP / ATT 状態から配信モード判定 (既存ロジック維持)
 */
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { useForeground } from '@/src/core/hooks/useForeground';
import { useColors } from '@/src/core/theme/useColors';
import {
  getAttStatus,
  getBannerUnitId,
  initializeAds,
  resolveAdServingMode,
} from '@/src/services/adService';
import { useProStore } from '@/src/stores/proStore';

/**
 * Issue #22 AC4-3: 起動後 3 秒以上経過後に AdBanner を表示 (誤タップ防止)。
 * Sess106 PR-2: module-level constant でアプリ起動時刻を保持し、 useRef 基準で再 mount 耐性化。
 */
const STARTUP_DELAY_MS = 3000;

/**
 * モジュール evaluation 時刻 (= アプリ bundle ロード時 ≈ アプリ起動時) を保持。
 * AdBanner の各 instance はこの定数を参照することで、 mount/remount サイクルに関わらず
 * 「アプリ起動から経過時間」 を一貫して判定できる (Sess106 Amendment §22 修正3)。
 */
const APP_LAUNCH_TIME_MS = Date.now();

/**
 * Sess106 PR-2 (ADR-0010 Sess106 Amendment §22 修正1): プレースホルダ枠のサイズ。
 * INLINE_ADAPTIVE_BANNER maxHeight=90 + paddingTop=8 = 98 の枠を予約し、 広告ロード前後の CLS=0 を保証。
 */
const PLACEHOLDER_MIN_HEIGHT = 98;

export function AdBanner() {
  const isWeb = Platform.OS === 'web';
  const isPro = useProStore((s) => s.isPro);
  const proInitialized = useProStore((s) => s.initialized);
  const unitId = getBannerUnitId();
  const c = useColors();
  const bannerRef = React.useRef<BannerAd>(null);

  // Sess106 PR-2 修正3: アプリ起動時刻からの経過時間で 3 秒判定 (再 mount 時にも初回起動時刻を使う)。
  // Sess108 PR-E (React Compiler 整合): mount 時点で Date.now() を 1 回呼んで固定 (useState lazy init)。
  // 旧 render body 直書きは react-hooks/purity 違反 (Date.now() は impure)。
  const [initialRemainingMs] = React.useState(() =>
    Math.max(0, STARTUP_DELAY_MS - (Date.now() - APP_LAUNCH_TIME_MS)),
  );
  const [delayElapsed, setDelayElapsed] = React.useState(initialRemainingMs === 0);
  const [ready, setReady] = React.useState(false);
  const [attAuthorized, setAttAuthorized] = React.useState<boolean | null>(null);

  // Sess106 PR-2 修正2: iOS background → active 復帰時の reload 抑制 hook
  const { shouldReload, acknowledge } = useForeground();

  React.useEffect(() => {
    if (isWeb) return;
    if (isPro) return;
    if (delayElapsed) return;
    const timer = setTimeout(() => setDelayElapsed(true), initialRemainingMs);
    return () => clearTimeout(timer);
    // initialRemainingMs は mount 時点で確定するので、 依存配列で再評価不要
    // delayElapsed が true になったら再 set 不要
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWeb, isPro, delayElapsed]);

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

  // Sess106 PR-2 修正2: useForeground hook が「60 秒超 background 復帰」 を検出したら手動 reload
  React.useEffect(() => {
    if (shouldReload && bannerRef.current) {
      bannerRef.current.load();
      acknowledge();
    }
  }, [shouldReload, acknowledge]);

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

  // Sess106 PR-2 修正1: container は delayElapsed の有無に関わらず常時 mount (= CLS 解消の枠予約)
  // BannerAd だけ delayElapsed=true の後に mount し、 誤タップ防止と CLS 解消を両立。
  return (
    <View style={[styles.container, { backgroundColor: c.bgSecondary }]} testID="e2e_ad_banner">
      {delayElapsed && (
        <BannerAd
          ref={bannerRef}
          unitId={unitId}
          size={BannerAdSize.INLINE_ADAPTIVE_BANNER}
          // ADR-0020 Phase 9: maxHeight 90px で画面占有 < 12% を保証 (Repolog 同等)
          maxHeight={90}
          requestOptions={{ requestNonPersonalizedAdsOnly: mode === 'non_personalized' }}
          onAdFailedToLoad={handleAdFailedToLoad}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Sess106 PR-2 修正1: minHeight 98 で枠予約 (CLS 解消)、 paddingTop 8 (ADR-0020 Phase 9)
  container: {
    minHeight: PLACEHOLDER_MIN_HEIGHT,
    paddingTop: 8,
    paddingBottom: 0,
    alignItems: 'center',
  },
});

/**
 * テスト用エクスポート (Jest からのみ参照、 production code でアクセス禁止)。
 */
export const __TEST_ONLY = {
  STARTUP_DELAY_MS,
  APP_LAUNCH_TIME_MS,
  PLACEHOLDER_MIN_HEIGHT,
};
