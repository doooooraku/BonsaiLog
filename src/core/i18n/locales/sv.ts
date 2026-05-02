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

export default sv;
