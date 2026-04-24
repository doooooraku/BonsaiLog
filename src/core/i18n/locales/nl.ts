import type { TranslationKey } from './en';

const nl: Partial<Record<TranslationKey, string>> = {
  // --- Common UI ---
  ok: 'OK',
  cancel: 'Annuleren',
  save: 'Opslaan',
  delete: 'Verwijderen',
  create: 'Aanmaken',
  close: 'Sluiten',
  done: 'Klaar',
  loading: 'Laden...',
  retry: 'Opnieuw proberen',
  error: 'Fout',

  // --- Settings ---
  settings: 'Instellingen',
  language: 'Taal',
  theme: 'Thema',
  version: 'App-versie',
  haptics: 'Trillen',
  sound: 'Geluid',

  // --- Language selector ---
  languageChange: 'Taal wijzigen',
  currentLanguage: 'Huidig',
  languageNameEn: 'Engels',
  languageNameJa: 'Japans',
  languageNameFr: 'Frans',
  languageNameEs: 'Spaans',
  languageNameDe: 'Duits',
  languageNameIt: 'Italiaans',
  languageNamePt: 'Portugees',
  languageNameRu: 'Russisch',
  languageNameZhHans: 'Chinees (vereenvoudigd)',
  languageNameZhHant: 'Chinees (traditioneel)',
  languageNameKo: 'Koreaans',
  languageNameHi: 'Hindi',
  languageNameId: 'Indonesisch',
  languageNameTh: 'Thais',
  languageNameVi: 'Vietnamees',
  languageNameTr: 'Turks',
  languageNameNl: 'Nederlands',
  languageNamePl: 'Pools',
  languageNameSv: 'Zweeds',

  // --- Purchase / Restore ---
  restore: 'Aankopen herstellen',
  purchaseSuccess: 'Pro-abonnement is nu actief.',
  purchaseFailed: 'Aankoop mislukt. Probeer het later opnieuw.',
  restoreSuccess: 'Aankoopgeschiedenis hersteld.',
  restoreNotFound: 'Geen aankopen gevonden om te herstellen.',
  restoreFailed: 'Herstellen van aankopen mislukt.',
  restoreDesc: 'Herstel aankopen die met dit account zijn gedaan.',

  // --- Pro / Paywall ---
  proTitle: 'Upgraden naar Pro',
  proPlanFreeTitle: 'Gratis',
  proPlanMonthlyTitle: 'Maandelijks',
  proPlanYearlyTitle: 'Jaarlijks',
  proPlanYearlyBadge: 'Beste keuze',
  proBadgeShort: 'PRO',
  priceFree: '€0 / voor altijd',
  priceLoading: 'Laden...',
  priceUnavailable: 'Niet beschikbaar',
  proCtaYearly: 'Start jaarplan',
  proCtaMonthly: 'Start maandplan',
  proCtaStayFree: 'Gratis blijven',
  proFinePrint:
    'Abonnementen worden automatisch verlengd. Annuleer op elk moment in je accountinstellingen.',

  proPlanLifetimeTitle: 'Levenslang',
  proPlanLifetimeBadge: 'Eenmalige betaling',
  proCtaLifetime: 'Levenslang kopen',
  proLifetimeFinePrint: 'Eenmalige aankoop. Geen automatische verlenging.',

  // --- Legal ---
  legalSectionTitle: 'Juridisch',
  legalPrivacyPolicyLabel: 'Privacybeleid',
  legalTermsOfUseLabel: 'Gebruiksvoorwaarden (EULA)',

  // --- Errors ---
  errorLoadFailed: 'Gegevens laden mislukt.',
  errorSaveFailed: 'Opslaan mislukt.',
  errorDeleteFailed: 'Verwijderen mislukt.',
};

export default nl;
