/**
 * F-LEGAL-001 Phase B — adService 実行系テスト (Issue #37 / ADR-0017)。
 *
 * Phase A の純関数テスト (`__tests__/adService.test.ts`) に加え、本ファイルでは
 * initializeAds / showAdPrivacyOptionsForm / getBannerUnitId の実行系挙動を AC ベースで網羅する。
 *
 * Platform.OS / __DEV__ / Constants.expoConfig.extra をテスト毎に差し替えるため、
 * react-native は最小 mock で Platform を可変オブジェクトにし、jest.resetModules で
 * adService の `let initialized` と `const isNative` を fresh 再評価する。
 *
 * 実機検証 (ATT 標準ダイアログ / EEA UMP / Settings 再選択ダイアログ / NPA 配信) は Phase C 以降の人間タスク。
 */

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

const mockGatherConsent = jest.fn();
const mockGetConsentInfo = jest.fn();
const mockShowPrivacyOptionsForm = jest.fn();
const mockSetRequestConfiguration = jest.fn();
const mockInitialize = jest.fn();
const mockMobileAds = jest.fn(() => ({
  setRequestConfiguration: mockSetRequestConfiguration,
  initialize: mockInitialize,
}));

jest.mock('expo-tracking-transparency', () => ({
  getTrackingPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'undetermined', canAskAgain: true, expires: 'never' }),
  ),
  requestTrackingPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'undetermined', canAskAgain: true, expires: 'never' }),
  ),
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
}));

jest.mock('react-native-google-mobile-ads', () => ({
  __esModule: true,
  default: mockMobileAds,
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
  AdsConsent: {
    gatherConsent: (...args: unknown[]) => mockGatherConsent(...args),
    getConsentInfo: () => mockGetConsentInfo(),
    showPrivacyOptionsForm: () => mockShowPrivacyOptionsForm(),
  },
  MaxAdContentRating: { G: 'G', PG: 'PG' },
  TestIds: { ADAPTIVE_BANNER: 'test-adaptive-banner' },
}));

const mockExtra: Record<string, unknown> = {};

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return { extra: mockExtra };
    },
    manifest: null,
  },
}));

const originalDev = (global as { __DEV__?: boolean }).__DEV__;

function setOS(os: 'ios' | 'android' | 'web') {
  // jest.resetModules 後に require すると react-native mock の Platform が再生成されるため、
  // 都度 require して同じサイクル内で adService が読む Platform を書き換える。
  const RN = require('react-native') as { Platform: { OS: string } };
  RN.Platform.OS = os;
}

function loadFreshAdService(): typeof import('@/src/services/adService') {
  return require('@/src/services/adService');
}

beforeEach(() => {
  jest.resetModules();
  setOS('ios');
  (global as { __DEV__?: boolean }).__DEV__ = true;
  Object.keys(mockExtra).forEach((k) => delete mockExtra[k]);
  mockGatherConsent.mockReset();
  mockGetConsentInfo.mockReset();
  mockShowPrivacyOptionsForm.mockReset();
  mockSetRequestConfiguration.mockReset();
  mockInitialize.mockReset();
  mockMobileAds.mockClear();
});

afterAll(() => {
  (global as { __DEV__?: boolean | undefined }).__DEV__ = originalDev;
});

describe('initializeAds (AC: app 起動 hook + Pro 不発火)', () => {
  test('non-native (web) では false 返却、mobileAds の初期化は走らない', async () => {
    setOS('web');
    const { initializeAds } = loadFreshAdService();
    await expect(initializeAds()).resolves.toBe(false);
    expect(mockSetRequestConfiguration).not.toHaveBeenCalled();
    expect(mockInitialize).not.toHaveBeenCalled();
    expect(mockGatherConsent).not.toHaveBeenCalled();
  });

  test('iOS で canRequestAds=true → setRequestConfiguration + initialize 呼ばれ true 返却', async () => {
    setOS('ios');
    mockGatherConsent.mockResolvedValueOnce({ canRequestAds: true });
    mockInitialize.mockResolvedValueOnce(undefined);
    const { initializeAds } = loadFreshAdService();
    await expect(initializeAds()).resolves.toBe(true);
    expect(mockSetRequestConfiguration).toHaveBeenCalledWith({
      tagForChildDirectedTreatment: false,
      maxAdContentRating: 'PG',
    });
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  test('Android でも同等動作', async () => {
    setOS('android');
    mockGatherConsent.mockResolvedValueOnce({ canRequestAds: true });
    mockInitialize.mockResolvedValueOnce(undefined);
    const { initializeAds } = loadFreshAdService();
    await expect(initializeAds()).resolves.toBe(true);
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  test('二回目呼出は idempotent (true 返却、initialize 再実行なし)', async () => {
    setOS('ios');
    mockGatherConsent.mockResolvedValue({ canRequestAds: true });
    mockInitialize.mockResolvedValue(undefined);
    const { initializeAds } = loadFreshAdService();
    await expect(initializeAds()).resolves.toBe(true);
    await expect(initializeAds()).resolves.toBe(true);
    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockGatherConsent).toHaveBeenCalledTimes(1);
  });

  test('gatherConsent throw + getConsentInfo.canRequestAds=true で fallback 動作 (true)', async () => {
    setOS('ios');
    mockGatherConsent.mockRejectedValueOnce(new Error('UMP transient'));
    mockGetConsentInfo.mockResolvedValueOnce({ canRequestAds: true });
    mockInitialize.mockResolvedValueOnce(undefined);
    const { initializeAds } = loadFreshAdService();
    await expect(initializeAds()).resolves.toBe(true);
    expect(mockGetConsentInfo).toHaveBeenCalledTimes(1);
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  test('gatherConsent と getConsentInfo 両方 canRequestAds=false → __DEV__ true 環境では true (開発 fallback)', async () => {
    setOS('ios');
    mockGatherConsent.mockResolvedValueOnce({ canRequestAds: false });
    mockGetConsentInfo.mockResolvedValueOnce({ canRequestAds: false });
    mockInitialize.mockResolvedValueOnce(undefined);
    (global as { __DEV__?: boolean }).__DEV__ = true;
    const { initializeAds } = loadFreshAdService();
    await expect(initializeAds()).resolves.toBe(true);
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  test('Production (__DEV__=false) で両 fallback 失敗 → false 返却 + initialize 呼ばれない', async () => {
    setOS('ios');
    (global as { __DEV__?: boolean }).__DEV__ = false;
    mockGatherConsent.mockResolvedValueOnce({ canRequestAds: false });
    mockGetConsentInfo.mockResolvedValueOnce({ canRequestAds: false });
    const { initializeAds } = loadFreshAdService();
    await expect(initializeAds()).resolves.toBe(false);
    expect(mockSetRequestConfiguration).not.toHaveBeenCalled();
    expect(mockInitialize).not.toHaveBeenCalled();
  });

  test('Production (__DEV__=false) で gatherConsent throw + getConsentInfo throw → false 返却', async () => {
    setOS('ios');
    (global as { __DEV__?: boolean }).__DEV__ = false;
    mockGatherConsent.mockRejectedValueOnce(new Error('network'));
    mockGetConsentInfo.mockRejectedValueOnce(new Error('cache miss'));
    const { initializeAds } = loadFreshAdService();
    await expect(initializeAds()).resolves.toBe(false);
    expect(mockInitialize).not.toHaveBeenCalled();
  });
});

describe('showAdPrivacyOptionsForm (AC: Settings → 広告のプライバシー設定)', () => {
  test('non-native では false 返却、AdsConsent.getConsentInfo を呼ばない', async () => {
    setOS('web');
    const { showAdPrivacyOptionsForm } = loadFreshAdService();
    await expect(showAdPrivacyOptionsForm()).resolves.toBe(false);
    expect(mockGetConsentInfo).not.toHaveBeenCalled();
    expect(mockShowPrivacyOptionsForm).not.toHaveBeenCalled();
  });

  test('NOT_REQUIRED (要件外リージョン) では false 返却 + showPrivacyOptionsForm を呼ばない', async () => {
    setOS('ios');
    mockGetConsentInfo.mockResolvedValueOnce({ privacyOptionsRequirementStatus: 2 });
    const { showAdPrivacyOptionsForm } = loadFreshAdService();
    await expect(showAdPrivacyOptionsForm()).resolves.toBe(false);
    expect(mockShowPrivacyOptionsForm).not.toHaveBeenCalled();
  });

  test('UNKNOWN でも false 返却 (REQUIRED 以外は無音)', async () => {
    setOS('ios');
    mockGetConsentInfo.mockResolvedValueOnce({ privacyOptionsRequirementStatus: 0 });
    const { showAdPrivacyOptionsForm } = loadFreshAdService();
    await expect(showAdPrivacyOptionsForm()).resolves.toBe(false);
    expect(mockShowPrivacyOptionsForm).not.toHaveBeenCalled();
  });

  test('REQUIRED (EEA など) で showPrivacyOptionsForm 呼ばれ true 返却', async () => {
    setOS('android');
    mockGetConsentInfo.mockResolvedValueOnce({ privacyOptionsRequirementStatus: 1 });
    mockShowPrivacyOptionsForm.mockResolvedValueOnce(undefined);
    const { showAdPrivacyOptionsForm } = loadFreshAdService();
    await expect(showAdPrivacyOptionsForm()).resolves.toBe(true);
    expect(mockShowPrivacyOptionsForm).toHaveBeenCalledTimes(1);
  });
});

describe('getBannerUnitId (AC: Free + canRequestAds 時のみ表示)', () => {
  test('non-native (web) では null', () => {
    setOS('web');
    const { getBannerUnitId } = loadFreshAdService();
    expect(getBannerUnitId()).toBeNull();
  });

  test('iOS __DEV__=true は TestIds.ADAPTIVE_BANNER (本番 ID 漏洩防止)', () => {
    setOS('ios');
    (global as { __DEV__?: boolean }).__DEV__ = true;
    mockExtra.ADMOB_IOS_BANNER_ID = 'ca-app-pub-real/should-not-leak';
    const { getBannerUnitId } = loadFreshAdService();
    expect(getBannerUnitId()).toBe('test-adaptive-banner');
  });

  test('Android __DEV__=true でも TestIds.ADAPTIVE_BANNER', () => {
    setOS('android');
    (global as { __DEV__?: boolean }).__DEV__ = true;
    const { getBannerUnitId } = loadFreshAdService();
    expect(getBannerUnitId()).toBe('test-adaptive-banner');
  });

  test('Production iOS で extra.ADMOB_IOS_BANNER_ID を返す', () => {
    setOS('ios');
    (global as { __DEV__?: boolean }).__DEV__ = false;
    mockExtra.ADMOB_IOS_BANNER_ID = 'ca-app-pub-1234/ios-prod';
    const { getBannerUnitId } = loadFreshAdService();
    expect(getBannerUnitId()).toBe('ca-app-pub-1234/ios-prod');
  });

  test('Production Android で extra.ADMOB_ANDROID_BANNER_ID を返す', () => {
    setOS('android');
    (global as { __DEV__?: boolean }).__DEV__ = false;
    mockExtra.ADMOB_ANDROID_BANNER_ID = 'ca-app-pub-1234/android-prod';
    const { getBannerUnitId } = loadFreshAdService();
    expect(getBannerUnitId()).toBe('ca-app-pub-1234/android-prod');
  });

  test('Production iOS で extra 値が空文字 → null', () => {
    setOS('ios');
    (global as { __DEV__?: boolean }).__DEV__ = false;
    mockExtra.ADMOB_IOS_BANNER_ID = '   ';
    const { getBannerUnitId } = loadFreshAdService();
    expect(getBannerUnitId()).toBeNull();
  });

  test('Production Android で extra キー不在 → null', () => {
    setOS('android');
    (global as { __DEV__?: boolean }).__DEV__ = false;
    const { getBannerUnitId } = loadFreshAdService();
    expect(getBannerUnitId()).toBeNull();
  });

  test('Production iOS で extra 値が string 以外 → null', () => {
    setOS('ios');
    (global as { __DEV__?: boolean }).__DEV__ = false;
    mockExtra.ADMOB_IOS_BANNER_ID = 12345;
    const { getBannerUnitId } = loadFreshAdService();
    expect(getBannerUnitId()).toBeNull();
  });
});
