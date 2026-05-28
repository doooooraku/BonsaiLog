import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
  PermissionStatus,
} from 'expo-tracking-transparency';
import mobileAds, {
  AdsConsent,
  AdsConsentDebugGeography,
  AdsConsentPrivacyOptionsRequirementStatus,
  MaxAdContentRating,
  type AdsConsentInfoOptions,
  TestIds,
} from 'react-native-google-mobile-ads';

let initialized = false;

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

type ExtraValues = Record<string, unknown>;

function getExtraValues(): ExtraValues {
  const expoConfig = Constants.expoConfig ?? Constants.manifest;
  const extra = (expoConfig as any)?.extra ?? {};
  return extra as ExtraValues;
}

function getExtraValue(key: string) {
  return getExtraValues()?.[key];
}

function normalizeToken(value: string): string {
  return value.trim().toUpperCase().replace(/-/g, '_');
}

export function parseConsentDebugGeography(value: unknown): AdsConsentDebugGeography | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = normalizeToken(value);
  if (!normalized) return undefined;

  switch (normalized) {
    case 'DISABLED':
      return AdsConsentDebugGeography.DISABLED;
    case 'EEA':
      return AdsConsentDebugGeography.EEA;
    case 'NOT_EEA':
      return AdsConsentDebugGeography.NOT_EEA;
    case 'REGULATED_US_STATE':
      return AdsConsentDebugGeography.REGULATED_US_STATE;
    case 'OTHER':
      return AdsConsentDebugGeography.OTHER;
    default:
      return undefined;
  }
}

export function parseConsentTestDeviceIdentifiers(value: unknown): string[] | undefined {
  if (typeof value !== 'string') return undefined;
  const ids = Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
  return ids.length > 0 ? ids : undefined;
}

export function buildAdsConsentInfoOptions(
  extraValues: ExtraValues = getExtraValues(),
): AdsConsentInfoOptions {
  const options: AdsConsentInfoOptions = {};

  const debugGeography = parseConsentDebugGeography(extraValues.ADMOB_CONSENT_DEBUG_GEOGRAPHY);
  if (debugGeography !== undefined) {
    options.debugGeography = debugGeography;
  }

  const testDeviceIdentifiers = parseConsentTestDeviceIdentifiers(
    extraValues.ADMOB_CONSENT_TEST_DEVICE_IDS,
  );
  if (testDeviceIdentifiers) {
    options.testDeviceIdentifiers = testDeviceIdentifiers;
  }

  return options;
}

async function canRequestAdsAfterConsent(): Promise<boolean> {
  try {
    const consentInfo = await AdsConsent.gatherConsent(buildAdsConsentInfoOptions());
    if (consentInfo.canRequestAds) return true;
  } catch {
    // If UMP fails transiently, fall back to last known consent state.
  }

  try {
    const consentInfo = await AdsConsent.getConsentInfo();
    if (consentInfo.canRequestAds) return true;
  } catch {
    // Ignore and fall through.
  }

  return __DEV__;
}

export function getBannerUnitId(): string | null {
  if (!isNative) return null;
  if (__DEV__) return TestIds.ADAPTIVE_BANNER;

  const key = Platform.OS === 'android' ? 'ADMOB_ANDROID_BANNER_ID' : 'ADMOB_IOS_BANNER_ID';
  const value = getExtraValue(key);
  if (!value || typeof value !== 'string') return null;
  if (!value.trim()) return null;
  return value;
}

export async function initializeAds(): Promise<boolean> {
  if (!isNative) return false;
  if (initialized) return true;

  const canRequestAds = await canRequestAdsAfterConsent();
  if (!canRequestAds) return false;

  // F-14 Phase C (Issue #22, ADR-0010 AC8-2): MaxAdContentRating を G → PG に変更
  // 配信カテゴリを「全年齢」から「保護者同伴可」相当に拡大、収益性とポリシー両立。
  void mobileAds().setRequestConfiguration({
    tagForChildDirectedTreatment: false,
    maxAdContentRating: MaxAdContentRating.PG,
  });

  await mobileAds().initialize();
  initialized = true;
  return true;
}

export async function showAdPrivacyOptionsForm(): Promise<boolean> {
  if (!isNative) return false;

  const consentInfo = await AdsConsent.getConsentInfo();
  if (
    consentInfo.privacyOptionsRequirementStatus !==
    AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
  ) {
    return false;
  }

  await AdsConsent.showPrivacyOptionsForm();
  return true;
}

/**
 * F-14 Phase E (Issue #22, ADR-0010 AC7 + AC9): 広告配信モード判定 純関数。
 *
 * UI 層 (BannerAd) で `requestNonPersonalizedAdsOnly` フラグの値を決定する用途。
 *
 * 判定優先度:
 * 1. Pro 加入者 → 'none' (広告非表示、AC9-1)
 * 2. UMP `canRequestAds === false` → 'none' (UMP 拒否時、AC7-3)
 * 3. ATT 拒否 (`attAuthorized === false`) → 'non_personalized' (Apple 5.1.2(i) 準拠、AC7-2)
 * 4. それ以外 → 'personalized' (通常配信)
 *
 * `attAuthorized === null` は「pre-iOS-14 端末」「未確認」を意味し、personalized として扱う
 * (AdMob SDK 内部で Android / 古い iOS では NPA 強制されない)。
 */
export type AdServingMode = 'personalized' | 'non_personalized' | 'none';

export function resolveAdServingMode(params: {
  isPro: boolean;
  attAuthorized: boolean | null;
  umpCanRequestAds: boolean;
}): AdServingMode {
  if (params.isPro === true) return 'none';
  if (params.umpCanRequestAds === false) return 'none';
  if (params.attAuthorized === false) return 'non_personalized';
  return 'personalized';
}

/**
 * F-LEGAL-001 Phase E (Issue #37、ADR-0017 §④ ATT)。
 *
 * iOS で ATT (App Tracking Transparency) 状態を取得する。
 * - iOS 14.5+: 標準ダイアログ発火 → 結果を boolean で返す
 * - iOS 14.4 以下 / Android / Web: ATT 概念なし → null (personalized 扱い)
 *
 * 既に許可/拒否済の場合は再ダイアログを出さず即返却 (OS 動作)。
 */
export async function getAttStatus(): Promise<boolean | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const current = await getTrackingPermissionsAsync();
    if (current.status === PermissionStatus.GRANTED) return true;
    if (current.status === PermissionStatus.DENIED) return false;
    // UNDETERMINED → 標準ダイアログ発火
    const result = await requestTrackingPermissionsAsync();
    if (result.status === PermissionStatus.GRANTED) return true;
    if (result.status === PermissionStatus.DENIED) return false;
    return null;
  } catch {
    return null;
  }
}
