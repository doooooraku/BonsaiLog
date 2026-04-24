import type { ConfigContext, ExpoConfig } from 'expo/config';

import 'dotenv/config';

// ---------------------------------------------------------------------------
// Env helpers — fail fast on missing identity vars
// ---------------------------------------------------------------------------

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}  (see .env.example)`);
  }
  return value;
}

function optional(key: string, fallback = ''): string {
  return process.env[key] || fallback;
}

const toBoolean = (value?: string) => value === '1' || value === 'true' || value === 'TRUE';

// ---------------------------------------------------------------------------
// Identity (from .env — REQUIRED)
// ---------------------------------------------------------------------------

const APP_NAME = required('APP_NAME');
const APP_SLUG = required('APP_SLUG');
const IOS_BUNDLE_IDENTIFIER = required('IOS_BUNDLE_IDENTIFIER');
const ANDROID_PACKAGE = required('ANDROID_PACKAGE');

// ---------------------------------------------------------------------------
// EAS
// ---------------------------------------------------------------------------

const EAS_PROJECT_ID = optional('EAS_PROJECT_ID');
const EAS_OWNER = optional('EAS_OWNER');

// ---------------------------------------------------------------------------
// AdMob (fallback to Google test IDs for development)
// ---------------------------------------------------------------------------

const ADMOB_TEST_APP_ID_ANDROID = 'ca-app-pub-3940256099942544~3347511713';
const ADMOB_TEST_APP_ID_IOS = 'ca-app-pub-3940256099942544~1458002511';

const admobAndroidAppId = optional('ADMOB_ANDROID_APP_ID', ADMOB_TEST_APP_ID_ANDROID);
const admobIosAppId = optional('ADMOB_IOS_APP_ID', ADMOB_TEST_APP_ID_IOS);

// ---------------------------------------------------------------------------
// Localization
// ---------------------------------------------------------------------------

const SUPPORTED_LOCALES = [
  'en',
  'ja',
  'fr',
  'es',
  'de',
  'it',
  'pt',
  'ru',
  'zh-Hans',
  'zh-Hant',
  'ko',
  'hi',
  'id',
  'th',
  'vi',
  'tr',
  'nl',
  'pl',
  'sv',
];

const toAndroidLocaleQualifier = (locale: string): string => {
  if (locale === 'zh-Hans') return 'b+zh+Hans';
  if (locale === 'zh-Hant') return 'b+zh+Hant';
  return locale;
};

// ---------------------------------------------------------------------------
// Plugin helpers
// ---------------------------------------------------------------------------

const BILLING_PERMISSION = 'com.android.vending.BILLING';

type PluginList = NonNullable<ExpoConfig['plugins']>;
type PluginEntry = PluginList[number];

const ensurePlugin = (plugins: PluginList = [], name: string, cfg?: unknown): PluginList => {
  const exists = plugins.some((p) => (Array.isArray(p) ? p[0] === name : p === name));
  if (exists) return plugins;
  if (cfg === undefined) return [...plugins, name];
  const entry: PluginEntry = [name, cfg];
  return [...plugins, entry];
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export default ({ config }: ConfigContext): ExpoConfig => {
  const permissions = config.android?.permissions ?? [];
  const nextPermissions = permissions.includes(BILLING_PERMISSION)
    ? permissions
    : [...permissions, BILLING_PERMISSION];

  const supportsRTL = toBoolean(process.env.SUPPORTS_RTL);
  const forcesRTL = toBoolean(process.env.FORCES_RTL);

  // --- Plugins ---
  let plugins = config.plugins ?? [];

  plugins = ensurePlugin(plugins, 'expo-localization', {
    supportedLocales: {
      ios: SUPPORTED_LOCALES,
      android: SUPPORTED_LOCALES.map(toAndroidLocaleQualifier),
    },
  });

  plugins = ensurePlugin(plugins, 'expo-build-properties', {
    ios: { deploymentTarget: '15.5' },
  });

  plugins = ensurePlugin(plugins, 'expo-font');
  plugins = ensurePlugin(plugins, 'expo-image');
  plugins = ensurePlugin(plugins, 'expo-secure-store');
  plugins = ensurePlugin(plugins, 'expo-sqlite');
  plugins = ensurePlugin(plugins, 'expo-web-browser');

  plugins = ensurePlugin(plugins, 'react-native-google-mobile-ads', {
    androidAppId: admobAndroidAppId,
    iosAppId: admobIosAppId,
    delayAppMeasurementInit: true,
    userTrackingUsageDescription:
      'This identifier will be used to deliver relevant ads to Free plan users.',
  });

  return {
    ...config,
    name: APP_NAME,
    slug: APP_SLUG,
    ios: {
      ...config.ios,
      bundleIdentifier: IOS_BUNDLE_IDENTIFIER,
      config: {
        usesNonExemptEncryption: false,
      },
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
            NSPrivacyAccessedAPITypeReasons: ['E174.1'],
          },
          {
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
            NSPrivacyAccessedAPITypeReasons: ['C617.1'],
          },
          {
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
            NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
          },
          {
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
            NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
          },
        ],
      },
    },
    android: {
      ...config.android,
      package: ANDROID_PACKAGE,
      permissions: nextPermissions,
      blockedPermissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.SYSTEM_ALERT_WINDOW',
      ],
    },
    extra: {
      ...config.extra,
      eas: {
        ...(EAS_PROJECT_ID ? { projectId: EAS_PROJECT_ID } : {}),
      },
      REVENUECAT_IOS_API_KEY: optional('REVENUECAT_IOS_API_KEY'),
      REVENUECAT_ANDROID_API_KEY: optional('REVENUECAT_ANDROID_API_KEY'),
      IAP_DEBUG: optional('IAP_DEBUG', '0'),
      ADMOB_ANDROID_BANNER_ID: optional('ADMOB_ANDROID_BANNER_ID'),
      ADMOB_IOS_BANNER_ID: optional('ADMOB_IOS_BANNER_ID'),
      ADMOB_CONSENT_DEBUG_GEOGRAPHY: optional('ADMOB_CONSENT_DEBUG_GEOGRAPHY'),
      ADMOB_CONSENT_TEST_DEVICE_IDS: optional('ADMOB_CONSENT_TEST_DEVICE_IDS'),
      LEGAL_PRIVACY_URL: optional('LEGAL_PRIVACY_URL'),
      LEGAL_TERMS_URL: optional('LEGAL_TERMS_URL'),
      supportsRTL,
      forcesRTL,
    },
    owner: EAS_OWNER || undefined,
    plugins,
  };
};
