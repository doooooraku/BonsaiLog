import type { TranslationKey } from './en';

const sv: Partial<Record<TranslationKey, string>> = {
  // --- Common UI ---
  ok: 'OK',
  cancel: 'Avbryt',
  save: 'Spara',
  delete: 'Ta bort',
  create: 'Skapa',
  close: 'Stäng',
  done: 'Klar',
  loading: 'Laddar...',
  retry: 'Försök igen',
  error: 'Fel',

  // --- Settings ---
  settings: 'Inställningar',
  language: 'Språk',
  theme: 'Tema',
  version: 'Appversion',
  haptics: 'Haptik',
  sound: 'Ljud',

  // --- Language selector ---
  languageChange: 'Byt språk',
  currentLanguage: 'Nuvarande',
  languageNameEn: 'Engelska',
  languageNameJa: 'Japanska',
  languageNameFr: 'Franska',
  languageNameEs: 'Spanska',
  languageNameDe: 'Tyska',
  languageNameIt: 'Italienska',
  languageNamePt: 'Portugisiska',
  languageNameRu: 'Ryska',
  languageNameZhHans: 'Kinesiska (förenklad)',
  languageNameZhHant: 'Kinesiska (traditionell)',
  languageNameKo: 'Koreanska',
  languageNameHi: 'Hindi',
  languageNameId: 'Indonesiska',
  languageNameTh: 'Thailändska',
  languageNameVi: 'Vietnamesiska',
  languageNameTr: 'Turkiska',
  languageNameNl: 'Holländska',
  languageNamePl: 'Polska',
  languageNameSv: 'Svenska',

  // --- Purchase / Restore ---
  restore: 'Återställ köp',
  purchaseSuccess: 'Pro-planen är nu aktiv.',
  purchaseFailed: 'Köpet misslyckades. Försök igen senare.',
  restoreSuccess: 'Köphistorik återställd.',
  restoreNotFound: 'Inga köp hittades att återställa.',
  restoreFailed: 'Misslyckades med att återställa köp.',
  restoreDesc: 'Återställ köp som gjorts med detta konto.',

  // --- Pro / Paywall ---
  proTitle: 'Uppgradera till Pro',
  proPlanFreeTitle: 'Gratis',
  proPlanMonthlyTitle: 'Månadsvis',
  proPlanYearlyTitle: 'Årsvis',
  proPlanYearlyBadge: 'Bästa värde',
  proBadgeShort: 'PRO',
  priceFree: '0 kr / för alltid',
  priceLoading: 'Laddar...',
  priceUnavailable: 'Ej tillgänglig',
  proCtaYearly: 'Starta årsplan',
  proCtaMonthly: 'Starta månadsplan',
  proCtaStayFree: 'Fortsätt gratis',
  proFinePrint:
    'Prenumerationer förnyas automatiskt. Avsluta när som helst i dina kontoinställningar.',

  proPlanLifetimeTitle: 'Livstid',
  proPlanLifetimeBadge: 'Engångsbetalning',
  proCtaLifetime: 'Köp livstid',
  proLifetimeFinePrint: 'Engångsköp. Ingen automatisk förnyelse.',

  // --- Legal ---
  legalSectionTitle: 'Juridiskt',
  legalPrivacyPolicyLabel: 'Integritetspolicy',
  legalTermsOfUseLabel: 'Användarvillkor (EULA)',

  // --- Errors ---
  errorLoadFailed: 'Kunde inte ladda data.',
  errorSaveFailed: 'Kunde inte spara.',
  errorDeleteFailed: 'Kunde inte ta bort.',
};

export default sv;
