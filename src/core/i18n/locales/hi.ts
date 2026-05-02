import type { TranslationKey } from './en';

const hi: Partial<Record<TranslationKey, string>> = {
  // --- Common UI ---
  ok: 'ठीक है',
  cancel: 'रद्द करें',
  save: 'सहेजें',
  delete: 'हटाएं',
  create: 'बनाएं',
  close: 'बंद करें',
  done: 'हो गया',
  loading: 'लोड हो रहा है...',
  retry: 'पुनः प्रयास करें',
  error: 'त्रुटि',

  // --- Settings ---
  settings: 'सेटिंग्स',
  language: 'भाषा',
  theme: 'थीम',
  version: 'ऐप संस्करण',
  haptics: 'हैप्टिक्स',
  sound: 'ध्वनि',

  // --- Language selector ---
  languageChange: 'भाषा बदलें',
  currentLanguage: 'वर्तमान',
  languageNameEn: 'अंग्रेज़ी',
  languageNameJa: 'जापानी',
  languageNameFr: 'फ़्रेंच',
  languageNameEs: 'स्पेनिश',
  languageNameDe: 'जर्मन',
  languageNameIt: 'इतालवी',
  languageNamePt: 'पुर्तगाली',
  languageNameRu: 'रूसी',
  languageNameZhHans: 'चीनी (सरलीकृत)',
  languageNameZhHant: 'चीनी (पारंपरिक)',
  languageNameKo: 'कोरियाई',
  languageNameHi: 'हिन्दी',
  languageNameId: 'इंडोनेशियाई',
  languageNameTh: 'थाई',
  languageNameVi: 'वियतनामी',
  languageNameTr: 'तुर्की',
  languageNameNl: 'डच',
  languageNamePl: 'पोलिश',
  languageNameSv: 'स्वीडिश',

  // --- Purchase / Restore ---
  restore: 'खरीदारी पुनर्स्थापित करें',
  purchaseSuccess: 'Pro प्लान अब सक्रिय है।',
  purchaseFailed: 'खरीदारी विफल रही। कृपया बाद में पुनः प्रयास करें।',
  restoreSuccess: 'खरीदारी इतिहास पुनर्स्थापित हो गया।',
  restoreNotFound: 'पुनर्स्थापित करने के लिए कोई खरीदारी नहीं मिली।',
  restoreFailed: 'खरीदारी पुनर्स्थापित करने में विफल।',
  restoreDesc: 'इस खाते से की गई खरीदारी पुनर्स्थापित करें।',

  // --- Pro / Paywall ---
  proTitle: 'Pro में अपग्रेड करें',
  proPlanFreeTitle: 'निःशुल्क',
  proPlanMonthlyTitle: 'मासिक',
  proPlanYearlyTitle: 'वार्षिक',
  proPlanYearlyBadge: 'सबसे किफायती',
  proBadgeShort: 'PRO',
  priceFree: '₹0 / हमेशा के लिए',
  priceLoading: 'लोड हो रहा है...',
  priceUnavailable: 'अनुपलब्ध',
  proCtaYearly: 'वार्षिक प्लान शुरू करें',
  proCtaMonthly: 'मासिक प्लान शुरू करें',
  proCtaStayFree: 'निःशुल्क जारी रखें',
  proFinePrint:
    'सदस्यता स्वचालित रूप से नवीनीकृत होती है। आप अपने खाता सेटिंग्स में कभी भी रद्द कर सकते हैं।',

  proPlanLifetimeTitle: 'आजीवन',
  proPlanLifetimeBadge: 'एकमुश्त',
  proCtaLifetime: 'आजीवन खरीदें',
  proLifetimeFinePrint: 'एकमुश्त खरीद। कोई स्वत: नवीकरण नहीं।',

  // --- Legal ---
  legalSectionTitle: 'कानूनी जानकारी',
  legalPrivacyPolicyLabel: 'गोपनीयता नीति',
  legalTermsOfUseLabel: 'उपयोग की शर्तें (EULA)',

  // --- Errors ---
  errorLoadFailed: 'डेटा लोड करने में विफल।',
  errorSaveFailed: 'सहेजने में विफल।',
  errorDeleteFailed: 'हटाने में विफल।',

  // --- F-01 Bonsai (P2-01 PR-D, English fallback for v1.0, localized in v1.x) ---
  bonsaiTab: 'Bonsai',
  bonsaiListEmptyTitle: 'No bonsai registered yet',
  bonsaiListEmptyDesc: 'Tap below to register your first bonsai.',
  bonsaiCreateNew: 'Add bonsai',
  bonsaiFieldName: 'Name',
  bonsaiFieldNamePlaceholder: 'Tree name (e.g., Black Pine in the corner)',
  bonsaiFieldSpecies: 'Species',
  bonsaiFieldSpeciesSearch: 'Search species…',
  bonsaiFieldStyle: 'Style',
  bonsaiFieldAcquiredAt: 'Acquired on',
  bonsaiFieldUpdatedAt: 'Last updated',
  bonsaiArchive: 'Archive',
  bonsaiArchiveConfirmTitle: 'Archive this bonsai?',
  bonsaiArchiveConfirmDesc: 'You can restore it later from Settings.',
  bonsaiStyle_chokkan: 'Formal upright (chokkan)',
  bonsaiStyle_moyogi: 'Informal upright (moyogi)',
  bonsaiStyle_shakan: 'Slanting (shakan)',
  bonsaiStyle_kengai: 'Cascade (kengai)',
  bonsaiStyle_han_kengai: 'Semi-cascade (han-kengai)',
  bonsaiStyle_bunjingi: 'Literati (bunjingi)',
  bonsaiStyle_fukinagashi: 'Windswept (fukinagashi)',
  bonsaiStyle_sokan: 'Twin-trunk (sokan)',
  bonsaiStyle_kabudachi: 'Multi-trunk (kabudachi)',
  bonsaiStyle_ishitsuki: 'On rock (ishitsuki)',

  // --- F-08 Photos (P2-02 PR-C, English fallback for v1.0) ---
  bonsaiFieldPhotos: 'Photos',
  photoAddCta: 'Add photo',
  photoAddTitle: 'Add a photo',
  photoAddCamera: 'Take a photo',
  photoAddLibrary: 'Choose from library',
  photoEmpty: 'No photos yet.',
  photoLimitTitle: 'Free limit reached',
  photoLimitDesc:
    'Free plan allows {count} photos per bonsai. Upgrade to Pro for unlimited photos.',
  photoPermissionTitle: 'Permission needed',
  photoPermissionDesc: 'Please allow camera and photo library access in Settings.',
  photoActionTitle: 'Photo actions',
  photoActionSetCover: 'Set as cover photo',
  photoActionDelete: 'Delete photo',
  photoDeleteConfirmTitle: 'Delete this photo?',
  photoDeleteConfirmDesc: 'This action cannot be undone.',
};

export default hi;
