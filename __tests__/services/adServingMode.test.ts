/**
 * F-14 Phase E — 広告配信モード判定 純関数テスト (Issue #22 / ADR-0010 AC7 + AC9)。
 *
 * 判定優先度:
 * 1. Pro → 'none'
 * 2. UMP 拒否 → 'none'
 * 3. ATT 拒否 → 'non_personalized'
 * 4. それ以外 → 'personalized'
 */

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} }, manifest: null },
}));

jest.mock('react-native-google-mobile-ads', () => ({
  __esModule: true,
  default: () => ({ setRequestConfiguration: jest.fn(), initialize: jest.fn() }),
  AdsConsentDebugGeography: {
    DISABLED: 0,
    EEA: 1,
    NOT_EEA: 2,
    REGULATED_US_STATE: 3,
    OTHER: 4,
  },
  AdsConsentPrivacyOptionsRequirementStatus: { UNKNOWN: 0, REQUIRED: 1, NOT_REQUIRED: 2 },
  AdsConsent: {
    gatherConsent: jest.fn(),
    getConsentInfo: jest.fn(),
    showPrivacyOptionsForm: jest.fn(),
  },
  MaxAdContentRating: { G: 'G', PG: 'PG' },
  TestIds: { ADAPTIVE_BANNER: 'test-adaptive-banner' },
}));

// eslint-disable-next-line import/first -- jest.mock を先に書く必要があるため
import { resolveAdServingMode } from '@/src/services/adService';

describe('resolveAdServingMode (AC7 + AC9 配信モード判定)', () => {
  describe('AC9-1 / AC9-2 Pro 加入者は常に none', () => {
    test('Pro + ATT 認可 + UMP OK → none', () => {
      expect(
        resolveAdServingMode({ isPro: true, attAuthorized: true, umpCanRequestAds: true }),
      ).toBe('none');
    });

    test('Pro + ATT 拒否 + UMP NG → none (Pro 優先)', () => {
      expect(
        resolveAdServingMode({ isPro: true, attAuthorized: false, umpCanRequestAds: false }),
      ).toBe('none');
    });

    test('Pro + ATT null + UMP OK → none', () => {
      expect(
        resolveAdServingMode({ isPro: true, attAuthorized: null, umpCanRequestAds: true }),
      ).toBe('none');
    });
  });

  describe('AC7-3 UMP 拒否時は none (Repolog __DEV__ 逆運用削除)', () => {
    test('Free + UMP 拒否 → none', () => {
      expect(
        resolveAdServingMode({ isPro: false, attAuthorized: true, umpCanRequestAds: false }),
      ).toBe('none');
    });

    test('Free + UMP 拒否 + ATT 拒否 → none (UMP 優先)', () => {
      expect(
        resolveAdServingMode({ isPro: false, attAuthorized: false, umpCanRequestAds: false }),
      ).toBe('none');
    });
  });

  describe('AC7-2 ATT 拒否時は non_personalized (Apple 5.1.2(i) 準拠)', () => {
    test('Free + UMP OK + ATT 拒否 → non_personalized', () => {
      expect(
        resolveAdServingMode({ isPro: false, attAuthorized: false, umpCanRequestAds: true }),
      ).toBe('non_personalized');
    });
  });

  describe('通常配信 (personalized)', () => {
    test('Free + UMP OK + ATT 認可 → personalized', () => {
      expect(
        resolveAdServingMode({ isPro: false, attAuthorized: true, umpCanRequestAds: true }),
      ).toBe('personalized');
    });

    test('Free + UMP OK + ATT null (pre-iOS-14 / Android) → personalized', () => {
      expect(
        resolveAdServingMode({ isPro: false, attAuthorized: null, umpCanRequestAds: true }),
      ).toBe('personalized');
    });
  });

  describe('AC9-2 Pro → Free 戻りシナリオ', () => {
    test('Pro 期間中 → none、Free 戻り (isPro=false) → personalized 復活', () => {
      expect(
        resolveAdServingMode({ isPro: true, attAuthorized: true, umpCanRequestAds: true }),
      ).toBe('none');
      expect(
        resolveAdServingMode({ isPro: false, attAuthorized: true, umpCanRequestAds: true }),
      ).toBe('personalized');
    });
  });

  describe('AC7 統合シナリオ (リージョン別)', () => {
    test('シナリオ EEA (UMP 必要 + 拒否) → none', () => {
      expect(
        resolveAdServingMode({ isPro: false, attAuthorized: null, umpCanRequestAds: false }),
      ).toBe('none');
    });

    test('シナリオ EEA (UMP 認可) + iOS ATT 拒否 → non_personalized', () => {
      expect(
        resolveAdServingMode({ isPro: false, attAuthorized: false, umpCanRequestAds: true }),
      ).toBe('non_personalized');
    });

    test('シナリオ Japan (UMP 不要 = canRequestAds=true) + iOS ATT 認可 → personalized', () => {
      expect(
        resolveAdServingMode({ isPro: false, attAuthorized: true, umpCanRequestAds: true }),
      ).toBe('personalized');
    });

    test('シナリオ Japan (UMP 不要) + Android (ATT null) → personalized', () => {
      expect(
        resolveAdServingMode({ isPro: false, attAuthorized: null, umpCanRequestAds: true }),
      ).toBe('personalized');
    });
  });

  describe('境界値ガード', () => {
    test('isPro=true は厳密一致のみ none (truthy 偽陽性なし)', () => {
      // === true なので boolean 以外の値は (TypeScript で防御するが、念のため) personalized 判定
      expect(
        resolveAdServingMode({
          isPro: true,
          attAuthorized: true,
          umpCanRequestAds: true,
        }),
      ).toBe('none');
    });

    test('umpCanRequestAds=true 時のみ広告配信、false → none', () => {
      expect(
        resolveAdServingMode({ isPro: false, attAuthorized: true, umpCanRequestAds: false }),
      ).toBe('none');
      expect(
        resolveAdServingMode({ isPro: false, attAuthorized: true, umpCanRequestAds: true }),
      ).toBe('personalized');
    });
  });
});
