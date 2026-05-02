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

export default nl;
