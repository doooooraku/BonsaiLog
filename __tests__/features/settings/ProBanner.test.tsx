/**
 * ProBanner unit tests (Sess106 PR-6 = Issue #1251、 ADR-0061 SoT 検証).
 *
 * カバー範囲:
 *   - D4 Free 限定: isPro=false で render、 isPro=true で null
 *   - D5 Paywall SoT: tap で /pro?source=settings_banner 遷移
 *   - D3 寸法: 高さ 64dp、 testID=e2e_settings_pro_banner
 */
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { ProBanner, __TEST_ONLY } from '@/src/features/settings/ProBanner';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/src/core/i18n/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'settingsViewProPlans' ? 'Pro プランを見る' : key),
    lang: 'ja',
  }),
}));

jest.mock('@/src/core/theme/useColors', () => ({
  useColors: () => ({
    tint: '#1F3A2E',
    onTint: '#FFFFFF',
    border: '#D9D1BF',
    text: '#1A1A1A',
  }),
}));

const mockUseProStore = jest.fn();
jest.mock('@/src/stores/proStore', () => ({
  useProStore: (selector: (state: { isPro: boolean }) => unknown) => selector(mockUseProStore()),
}));

const setPro = (isPro: boolean) => {
  mockUseProStore.mockReturnValue({ isPro });
};

describe('ProBanner (Sess106 PR-6、 ADR-0061)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('D4 Free 限定 (Q5 確定)', () => {
    it('isPro=false で render される (testID 存在)', () => {
      setPro(false);
      const { queryByTestId } = render(<ProBanner />);
      expect(queryByTestId('e2e_settings_pro_banner')).not.toBeNull();
    });

    it('isPro=true で null 返却 (= 完全非表示)', () => {
      setPro(true);
      const { queryByTestId } = render(<ProBanner />);
      expect(queryByTestId('e2e_settings_pro_banner')).toBeNull();
    });
  });

  describe('D5 Paywall SoT', () => {
    it('tap で /pro?source=settings_banner に遷移', () => {
      setPro(false);
      const { getByTestId } = render(<ProBanner />);
      fireEvent.press(getByTestId('e2e_settings_pro_banner'));
      expect(mockPush).toHaveBeenCalledWith('/pro?source=settings_banner');
    });

    it('tap は 1 回の push 呼出のみ (誤タップ防止 / 連続防止)', () => {
      setPro(false);
      const { getByTestId } = render(<ProBanner />);
      fireEvent.press(getByTestId('e2e_settings_pro_banner'));
      expect(mockPush).toHaveBeenCalledTimes(1);
    });
  });

  describe('D3 寸法 (ADR-0054 統一)', () => {
    it('BANNER_HEIGHT = 64dp (ADR-0054 BottomCtaBar と統一)', () => {
      expect(__TEST_ONLY.BANNER_HEIGHT).toBe(64);
    });

    it('container 高さに BANNER_HEIGHT が反映される', () => {
      setPro(false);
      const { getByTestId } = render(<ProBanner />);
      const banner = getByTestId('e2e_settings_pro_banner');
      const style = banner.props.style;
      const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
      expect(flatStyle.height).toBe(__TEST_ONLY.BANNER_HEIGHT);
    });
  });
});
