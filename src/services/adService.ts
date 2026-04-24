import { Platform } from 'react-native';
import Constants from 'expo-constants';
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

  mobileAds().setRequestConfiguration({
    tagForChildDirectedTreatment: false,
    maxAdContentRating: MaxAdContentRating.G,
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
