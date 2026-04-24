const baseEn = {
  // --- Common UI ---
  ok: 'OK',
  cancel: 'Cancel',
  save: 'Save',
  delete: 'Delete',
  create: 'Create',
  close: 'Close',
  done: 'Done',
  loading: 'Loading...',
  retry: 'Retry',
  error: 'Error',

  // --- Settings ---
  settings: 'Settings',
  language: 'Language',
  theme: 'Theme',
  version: 'App Version',
  haptics: 'Haptics',
  sound: 'Sound',

  // --- Language selector ---
  languageChange: 'Change language',
  currentLanguage: 'Current',
  languageNameEn: 'English',
  languageNameJa: 'Japanese',
  languageNameFr: 'French',
  languageNameEs: 'Spanish',
  languageNameDe: 'German',
  languageNameIt: 'Italian',
  languageNamePt: 'Portuguese',
  languageNameRu: 'Russian',
  languageNameZhHans: 'Chinese (Simplified)',
  languageNameZhHant: 'Chinese (Traditional)',
  languageNameKo: 'Korean',
  languageNameHi: 'Hindi',
  languageNameId: 'Indonesian',
  languageNameTh: 'Thai',
  languageNameVi: 'Vietnamese',
  languageNameTr: 'Turkish',
  languageNameNl: 'Dutch',
  languageNamePl: 'Polish',
  languageNameSv: 'Swedish',

  // --- Purchase / Restore ---
  restore: 'Restore Purchases',
  purchaseSuccess: 'Pro plan is now active.',
  purchaseFailed: 'Purchase failed. Please try again later.',
  restoreSuccess: 'Purchase history restored.',
  restoreNotFound: 'No purchases were found to restore.',
  restoreFailed: 'Failed to restore purchases.',
  restoreDesc: 'Restore purchases made with this account.',

  // --- Pro / Paywall ---
  proTitle: 'Upgrade to Pro',
  proPlanFreeTitle: 'Free',
  proPlanMonthlyTitle: 'Monthly',
  proPlanYearlyTitle: 'Yearly',
  proPlanLifetimeTitle: 'Lifetime',
  proPlanYearlyBadge: 'Best value',
  proPlanLifetimeBadge: 'One-time',
  proBadgeShort: 'PRO',
  priceFree: '$0 / forever',
  priceLoading: 'Loading...',
  priceUnavailable: 'Unavailable',
  proCtaYearly: 'Start Yearly Plan',
  proCtaMonthly: 'Start Monthly Plan',
  proCtaLifetime: 'Buy Lifetime',
  proCtaStayFree: 'Stay Free',
  proFinePrint: 'Subscriptions auto-renew. Cancel anytime in your account settings.',
  proLifetimeFinePrint: 'One-time purchase. No auto-renewal.',

  // --- Legal ---
  legalSectionTitle: 'Legal',
  legalPrivacyPolicyLabel: 'Privacy Policy',
  legalTermsOfUseLabel: 'Terms of Use (EULA)',

  // --- Errors ---
  errorLoadFailed: 'Failed to load data.',
  errorSaveFailed: 'Failed to save.',
  errorDeleteFailed: 'Failed to delete.',
};

export type TranslationKey = keyof typeof baseEn;

export default baseEn;
