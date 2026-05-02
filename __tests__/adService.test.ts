/**
 * F-LEGAL-001 Phase A — adService 純関数テスト (Issue #37 / ADR-0017)。
 *
 * react-native-google-mobile-ads を Jest 環境で読めないため、enum を mock。
 * 純関数 (string→enum / string→string[]) のみカバー。実機検証は Phase B + 人間タスク。
 */

jest.mock('react-native-google-mobile-ads', () => ({
  AdsConsentDebugGeography: {
    DISABLED: 0,
    EEA: 1,
    NOT_EEA: 2,
    REGULATED_US_STATE: 3,
    OTHER: 4,
  },
  AdsConsentPrivacyOptionsRequirementStatus: {
    UNKNOWN: 0,
    REQUIRED: 1,
    NOT_REQUIRED: 2,
  },
  AdsConsent: {},
  MaxAdContentRating: { G: 'G' },
  TestIds: { ADAPTIVE_BANNER: 'test-adaptive-banner' },
  default: () => ({
    setRequestConfiguration: jest.fn(),
    initialize: jest.fn(),
  }),
}));

// eslint-disable-next-line import/first -- jest.mock を先に書く必要があるため
import {
  buildAdsConsentInfoOptions,
  parseConsentDebugGeography,
  parseConsentTestDeviceIdentifiers,
} from '@/src/services/adService';

describe('parseConsentDebugGeography', () => {
  test('未指定や空文字は undefined', () => {
    expect(parseConsentDebugGeography(undefined)).toBeUndefined();
    expect(parseConsentDebugGeography(null)).toBeUndefined();
    expect(parseConsentDebugGeography('')).toBeUndefined();
    expect(parseConsentDebugGeography(123)).toBeUndefined();
  });

  test('EEA / NOT_EEA / REGULATED_US_STATE / DISABLED / OTHER を enum 値に変換', () => {
    expect(parseConsentDebugGeography('EEA')).toBe(1);
    expect(parseConsentDebugGeography('NOT_EEA')).toBe(2);
    expect(parseConsentDebugGeography('REGULATED_US_STATE')).toBe(3);
    expect(parseConsentDebugGeography('DISABLED')).toBe(0);
    expect(parseConsentDebugGeography('OTHER')).toBe(4);
  });

  test('小文字 / hyphen / 余分な空白を正規化', () => {
    expect(parseConsentDebugGeography(' eea ')).toBe(1);
    expect(parseConsentDebugGeography('regulated-us-state')).toBe(3);
    expect(parseConsentDebugGeography('not-eea')).toBe(2);
  });

  test('未知トークンは undefined', () => {
    expect(parseConsentDebugGeography('JAPAN')).toBeUndefined();
    expect(parseConsentDebugGeography('asia')).toBeUndefined();
  });
});

describe('parseConsentTestDeviceIdentifiers', () => {
  test('未指定や非文字列は undefined', () => {
    expect(parseConsentTestDeviceIdentifiers(undefined)).toBeUndefined();
    expect(parseConsentTestDeviceIdentifiers(null)).toBeUndefined();
    expect(parseConsentTestDeviceIdentifiers(['abc'])).toBeUndefined();
  });

  test('カンマ区切りの ID 配列を返す', () => {
    expect(parseConsentTestDeviceIdentifiers('id-1,id-2,id-3')).toEqual(['id-1', 'id-2', 'id-3']);
  });

  test('空白 trim と空要素除去', () => {
    expect(parseConsentTestDeviceIdentifiers(' a , , b , c ')).toEqual(['a', 'b', 'c']);
  });

  test('重複は de-dup', () => {
    expect(parseConsentTestDeviceIdentifiers('a,a,b,a,c')).toEqual(['a', 'b', 'c']);
  });

  test('全要素が空なら undefined', () => {
    expect(parseConsentTestDeviceIdentifiers(',, ,, ')).toBeUndefined();
    expect(parseConsentTestDeviceIdentifiers('')).toBeUndefined();
  });
});

describe('buildAdsConsentInfoOptions', () => {
  test('extra 値が空なら空オブジェクトを返す', () => {
    expect(buildAdsConsentInfoOptions({})).toEqual({});
  });

  test('debugGeography のみ指定', () => {
    expect(buildAdsConsentInfoOptions({ ADMOB_CONSENT_DEBUG_GEOGRAPHY: 'EEA' })).toEqual({
      debugGeography: 1,
    });
  });

  test('testDeviceIdentifiers のみ指定', () => {
    expect(buildAdsConsentInfoOptions({ ADMOB_CONSENT_TEST_DEVICE_IDS: 'd1,d2' })).toEqual({
      testDeviceIdentifiers: ['d1', 'd2'],
    });
  });

  test('両方指定', () => {
    expect(
      buildAdsConsentInfoOptions({
        ADMOB_CONSENT_DEBUG_GEOGRAPHY: 'NOT_EEA',
        ADMOB_CONSENT_TEST_DEVICE_IDS: 'd1, d2',
      }),
    ).toEqual({
      debugGeography: 2,
      testDeviceIdentifiers: ['d1', 'd2'],
    });
  });

  test('未知 debugGeography は debugGeography キー自体が存在しない', () => {
    const opts = buildAdsConsentInfoOptions({ ADMOB_CONSENT_DEBUG_GEOGRAPHY: 'UNKNOWN' });
    expect(opts.debugGeography).toBeUndefined();
    expect(Object.keys(opts)).not.toContain('debugGeography');
  });
});
