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
};

export default hi;
