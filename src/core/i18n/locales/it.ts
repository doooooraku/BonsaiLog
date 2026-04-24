import type { TranslationKey } from './en';

const it: Partial<Record<TranslationKey, string>> = {
  // --- Common UI ---
  ok: 'OK',
  cancel: 'Annulla',
  save: 'Salva',
  delete: 'Elimina',
  create: 'Crea',
  close: 'Chiudi',
  done: 'Fatto',
  loading: 'Caricamento...',
  retry: 'Riprova',
  error: 'Errore',

  // --- Settings ---
  settings: 'Impostazioni',
  language: 'Lingua',
  theme: 'Tema',
  version: 'Versione app',
  haptics: 'Vibrazione',
  sound: 'Suoni',

  // --- Language selector ---
  languageChange: 'Cambia lingua',
  currentLanguage: 'Attuale',
  languageNameEn: 'Inglese',
  languageNameJa: 'Giapponese',
  languageNameFr: 'Francese',
  languageNameEs: 'Spagnolo',
  languageNameDe: 'Tedesco',
  languageNameIt: 'Italiano',
  languageNamePt: 'Portoghese',
  languageNameRu: 'Russo',
  languageNameZhHans: 'Cinese (semplificato)',
  languageNameZhHant: 'Cinese (tradizionale)',
  languageNameKo: 'Coreano',
  languageNameHi: 'Hindi',
  languageNameId: 'Indonesiano',
  languageNameTh: 'Tailandese',
  languageNameVi: 'Vietnamita',
  languageNameTr: 'Turco',
  languageNameNl: 'Olandese',
  languageNamePl: 'Polacco',
  languageNameSv: 'Svedese',

  // --- Purchase / Restore ---
  restore: 'Ripristina acquisti',
  purchaseSuccess: 'Il piano Pro è ora attivo.',
  purchaseFailed: 'Acquisto fallito. Riprova più tardi.',
  restoreSuccess: 'Cronologia acquisti ripristinata.',
  restoreNotFound: 'Nessun acquisto trovato da ripristinare.',
  restoreFailed: 'Impossibile ripristinare gli acquisti.',
  restoreDesc: 'Ripristina gli acquisti effettuati con questo account.',

  // --- Pro / Paywall ---
  proTitle: 'Passa a Pro',
  proPlanFreeTitle: 'Gratis',
  proPlanMonthlyTitle: 'Mensile',
  proPlanYearlyTitle: 'Annuale',
  proPlanYearlyBadge: 'Migliore offerta',
  proBadgeShort: 'PRO',
  priceFree: '0 € / per sempre',
  priceLoading: 'Caricamento...',
  priceUnavailable: 'Non disponibile',
  proCtaYearly: 'Inizia il piano annuale',
  proCtaMonthly: 'Inizia il piano mensile',
  proCtaStayFree: 'Resta gratis',
  proFinePrint:
    'Gli abbonamenti si rinnovano automaticamente. Puoi annullare in qualsiasi momento dalle impostazioni del tuo account.',

  proPlanLifetimeTitle: 'A vita',
  proPlanLifetimeBadge: 'Pagamento unico',
  proCtaLifetime: 'Acquisto a vita',
  proLifetimeFinePrint: 'Acquisto unico. Nessun rinnovo automatico.',

  // --- Legal ---
  legalSectionTitle: 'Informazioni legali',
  legalPrivacyPolicyLabel: 'Informativa sulla privacy',
  legalTermsOfUseLabel: 'Termini di utilizzo (EULA)',

  // --- Errors ---
  errorLoadFailed: 'Caricamento dati fallito.',
  errorSaveFailed: 'Salvataggio fallito.',
  errorDeleteFailed: 'Eliminazione fallita.',
};

export default it;
