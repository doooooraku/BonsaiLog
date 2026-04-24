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
};

export default pl;
