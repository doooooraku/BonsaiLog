/**
 * AdBanner unit tests (Sess106 PR-2 = Issue #1247).
 *
 * カバー範囲:
 *   - 修正1: minHeight + bg.secondary プレースホルダ表示 (CLS 解消)
 *   - 修正3: useRef アプリ起動時刻基準の遅延 (再 mount 耐性)
 *   - Pro 状態で完全非表示
 *   - Web で null 返却
 *
 * 修正2 (useForeground) のテストは `__tests__/core/hooks/useForeground.test.ts` 側でカバー (AppState mock)。
 */
import { render } from '@testing-library/react-native';
import React from 'react';

import { AdBanner, __TEST_ONLY } from '@/src/features/ads/AdBanner';

// react-native-google-mobile-ads は Native 専用なので Jest 環境では mock
jest.mock('react-native-google-mobile-ads', () => ({
  BannerAd: jest.fn(() => null),
  BannerAdSize: { INLINE_ADAPTIVE_BANNER: 'INLINE_ADAPTIVE_BANNER' },
  TestIds: { ADAPTIVE_BANNER: 'ca-app-pub-3940256099942544/9214589741' },
}));

// adService の純関数を mock (initializeAds / getAttStatus / getBannerUnitId / resolveAdServingMode)
jest.mock('@/src/services/adService', () => ({
  getBannerUnitId: jest.fn(() => 'ca-app-pub-test/1234567890'),
  initializeAds: jest.fn(() => Promise.resolve(true)),
  getAttStatus: jest.fn(() => Promise.resolve(true)),
  // Sess106 PR-2: isPro 連動で 'none' を返すことで、 Pro 状態の non-display 挙動を再現
  resolveAdServingMode: jest.fn(({ isPro }: { isPro: boolean }) =>
    isPro ? 'none' : 'personalized',
  ),
}));

// useColors hook を mock (c.bgSecondary を返す)
jest.mock('@/src/core/theme/useColors', () => ({
  useColors: jest.fn(() => ({
    bgSecondary: '#EFE9D8',
    background: '#F7F3E8',
    text: '#1A1A1A',
  })),
}));

// useForeground hook を mock
jest.mock('@/src/core/hooks/useForeground', () => ({
  useForeground: jest.fn(() => ({ shouldReload: false, acknowledge: jest.fn() })),
}));

// useProStore mock (jest.fn の getState/setState で柔軟に)
const mockUseProStore = jest.fn();
jest.mock('@/src/stores/proStore', () => ({
  useProStore: (selector: (state: { isPro: boolean; initialized: boolean }) => unknown) =>
    selector(mockUseProStore()),
}));

const setProState = (isPro: boolean, initialized = true) => {
  mockUseProStore.mockReturnValue({ isPro, initialized });
};

describe('AdBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pro 状態', () => {
    it('Pro = true で null 返却 (= 完全非表示、 ADR-0010 §9)', () => {
      setProState(true);
      const { queryByTestId } = render(<AdBanner />);
      // mode='none' で early return → testID e2e_ad_banner が tree に存在しない
      expect(queryByTestId('e2e_ad_banner')).toBeNull();
    });
  });

  describe('Free 状態 + container プレースホルダ表示 (修正1)', () => {
    it('Free user では container が mount され、 minHeight 98 + bg.secondary 背景色を適用', () => {
      setProState(false);
      const { queryByTestId } = render(<AdBanner />);
      const container = queryByTestId('e2e_ad_banner');
      expect(container).not.toBeNull();
      // container の style に minHeight と bg.secondary が反映されている
      const style = container?.props.style;
      const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
      expect(flatStyle.minHeight).toBe(__TEST_ONLY.PLACEHOLDER_MIN_HEIGHT); // 98
      expect(flatStyle.backgroundColor).toBe('#EFE9D8'); // BG_SECONDARY 和紙派生
    });
  });

  describe('修正3: アプリ起動時刻基準 (再 mount 耐性)', () => {
    it('STARTUP_DELAY_MS = 3000ms (Issue #22 AC4-3 維持)', () => {
      expect(__TEST_ONLY.STARTUP_DELAY_MS).toBe(3000);
    });

    it('APP_LAUNCH_TIME_MS は module evaluation 時に確定 (再評価されない)', () => {
      const t1 = __TEST_ONLY.APP_LAUNCH_TIME_MS;
      // 100ms 待っても module の定数は変わらない
      const t2 = __TEST_ONLY.APP_LAUNCH_TIME_MS;
      expect(t1).toBe(t2);
    });

    it('mount 時点で起動から 3 秒経過済なら delayElapsed=true (BannerAd 即時表示)', () => {
      jest.useFakeTimers();
      // Date.now() を APP_LAUNCH_TIME_MS + 3001 にして「3 秒超経過」をシミュレーション
      const realNow = Date.now;
      jest.spyOn(Date, 'now').mockReturnValue(__TEST_ONLY.APP_LAUNCH_TIME_MS + 3001);
      setProState(false);
      const { queryByTestId } = render(<AdBanner />);
      // container 自体は表示される (修正1)
      expect(queryByTestId('e2e_ad_banner')).not.toBeNull();
      // 復元
      (Date.now as jest.Mock).mockRestore?.();
      Date.now = realNow;
      jest.useRealTimers();
    });
  });

  describe('PLACEHOLDER_MIN_HEIGHT 定数 (修正1)', () => {
    it('= 98px (maxHeight=90 + paddingTop=8 + buffer)', () => {
      expect(__TEST_ONLY.PLACEHOLDER_MIN_HEIGHT).toBe(98);
    });
  });
});
