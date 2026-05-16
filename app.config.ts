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
  // expo-dev-client FAB (右上歯車 toggle) 非表示 (Sess1 PR-4、2026-05-17)
  // ADR-0021 (ui-diff pipeline) Notes Amended: Maestro ui-diff 撮影時に dev menu overlay が
  // 整合判定の客観性を下げるため、開発ビルドでも FAB を非表示化 (Expo 公式 GitHub Issue #44234 で導入された
  // expo-dev-client plugin config option `showFloatingButton`)。
  // - 3 本指タップ等の代替アクセス手段は維持 (Expo Dev Menu API、長押しでも開く)
  // - リリースビルドでは元から FAB 非表示、本設定で開発ビルドとリリースビルドの撮影品質を一致
  plugins = ensurePlugin(plugins, 'expo-dev-client', { showFloatingButton: false });
  // PR #186 で追加した Splash 制御プラグイン (Phase APK rebuild B-1d)
  // ADR-0020 §Notes §画面マップ row 1 整合 (B1 PR、mockup v1.0 screens.jsx SplashScreen):
  // backgroundColor=washi (#F7F3E8、BG_PRIMARY) で mockup の和紙背景に整合、
  // 画像は既存 assets/images/splash-icon.png 維持 (画像 mockup 完全整合は v1.x 別 Issue)。
  plugins = ensurePlugin(plugins, 'expo-splash-screen', {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#F7F3E8',
  });

  plugins = ensurePlugin(plugins, 'expo-image-picker', {
    cameraPermission: 'BonsaiLog uses your camera to take photos of your bonsai.',
    photosPermission:
      'BonsaiLog accesses your photo library so you can attach existing photos to your bonsai.',
    microphonePermission: false,
  });

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
        // ADR-0017 §⑤ 21 — iOS 17+ Privacy Manifest required reasons + AdMob tracking
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
        // ADR-0017 §⑤ 21 — AdMob 利用のため tracking 有効、UMP 同意で最終的に on/off が決まる
        NSPrivacyTracking: true,
        // AdMob / Google Mobile Ads SDK が接続するトラッキングドメイン
        // SDK 同梱の PrivacyInfo.xcprivacy は app 側にマージされない仕様のため、アプリで明示宣言する必要がある
        // (Apple Developer Documentation: each bundle declares its own domains)
        NSPrivacyTrackingDomains: [
          'doubleclick.net',
          'googleadservices.com',
          'googlesyndication.com',
          'google-analytics.com',
          'googletagmanager.com',
          'app-measurement.com',
          '2mdn.net',
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
      LEGAL_PRIVACY_URL: optional(
        'LEGAL_PRIVACY_URL',
        'https://doooooraku.github.io/BonsaiLog/legal/privacy-policy.html',
      ),
      LEGAL_TERMS_URL: optional(
        'LEGAL_TERMS_URL',
        'https://doooooraku.github.io/BonsaiLog/legal/terms-of-use.html',
      ),
      supportsRTL,
      forcesRTL,
    },
    owner: EAS_OWNER || undefined,
    plugins,
  };
};
