import type { TranslationKey } from './en';

const pl: Partial<Record<TranslationKey, string>> = {
  // --- Common UI ---
  ok: 'OK',
  cancel: 'Anuluj',
  save: 'Zapisz',
  delete: 'Usuń',
  create: 'Utwórz',
  close: 'Zamknij',
  done: 'Gotowe',
  loading: 'Ładowanie...',
  retry: 'Ponów',
  error: 'Błąd',

  // --- Settings ---
  settings: 'Ustawienia',
  language: 'Język',
  theme: 'Motyw',
  version: 'Wersja aplikacji',
  haptics: 'Wibracje',
  sound: 'Dźwięk',

  // --- Language selector ---
  languageChange: 'Zmień język',
  currentLanguage: 'Bieżący',
  languageNameEn: 'Angielski',
  languageNameJa: 'Japoński',
  languageNameFr: 'Francuski',
  languageNameEs: 'Hiszpański',
  languageNameDe: 'Niemiecki',
  languageNameIt: 'Włoski',
  languageNamePt: 'Portugalski',
  languageNameRu: 'Rosyjski',
  languageNameZhHans: 'Chiński (uproszczony)',
  languageNameZhHant: 'Chiński (tradycyjny)',
  languageNameKo: 'Koreański',
  languageNameHi: 'Hindi',
  languageNameId: 'Indonezyjski',
  languageNameTh: 'Tajski',
  languageNameVi: 'Wietnamski',
  languageNameTr: 'Turecki',
  languageNameNl: 'Holenderski',
  languageNamePl: 'Polski',
  languageNameSv: 'Szwedzki',

  // --- Purchase / Restore ---
  restore: 'Przywróć zakupy',
  purchaseSuccess: 'Plan Pro jest teraz aktywny.',
  purchaseFailed: 'Zakup nie powiódł się. Spróbuj ponownie później.',
  restoreSuccess: 'Historia zakupów przywrócona.',
  restoreNotFound: 'Nie znaleziono zakupów do przywrócenia.',
  restoreFailed: 'Przywracanie nie powiodło się.',
  restoreDesc: 'Przywróć zakupy dokonane na tym koncie.',

  // --- Pro / Paywall ---
  proTitle: 'Przejdź na Pro',
  proPlanFreeTitle: 'Bezpłatny',
  proPlanMonthlyTitle: 'Miesięczny',
  proPlanYearlyTitle: 'Roczny',
  proPlanYearlyBadge: 'Najlepsza wartość',
  proBadgeShort: 'PRO',
  priceFree: '0 zł / na zawsze',
  priceLoading: 'Ładowanie...',
  priceUnavailable: 'Niedostępne',
  proCtaYearly: 'Rozpocznij plan roczny',
  proCtaMonthly: 'Rozpocznij plan miesięczny',
  proCtaStayFree: 'Pozostań za darmo',
  proFinePrint:
    'Subskrypcje odnawiają się automatycznie. Możesz anulować w dowolnym momencie w ustawieniach konta.',

  proPlanLifetimeTitle: 'Dożywotnio',
  proPlanLifetimeBadge: 'Płatność jednorazowa',
  proCtaLifetime: 'Kup dożywotnio',
  proLifetimeFinePrint: 'Zakup jednorazowy. Brak automatycznego odnowienia.',

  // --- Legal ---
  legalSectionTitle: 'Informacje prawne',
  legalPrivacyPolicyLabel: 'Polityka prywatności',
  legalTermsOfUseLabel: 'Regulamin (EULA)',

  // --- Errors ---
  errorLoadFailed: 'Nie udało się załadować danych.',
  errorSaveFailed: 'Nie udało się zapisać.',
  errorDeleteFailed: 'Nie udało się usunąć.',

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

export default pl;
