import type { TranslationKey } from './en';

const de: Partial<Record<TranslationKey, string>> = {
  // --- Common UI ---
  ok: 'OK',
  cancel: 'Abbrechen',
  save: 'Speichern',
  delete: 'Löschen',
  create: 'Erstellen',
  close: 'Schließen',
  done: 'Fertig',
  loading: 'Laden...',
  retry: 'Erneut versuchen',
  error: 'Fehler',

  // --- Settings ---
  settings: 'Einstellungen',
  language: 'Sprache',
  theme: 'Design',
  version: 'App-Version',
  haptics: 'Haptik',
  sound: 'Ton',

  // --- Language selector ---
  languageChange: 'Sprache ändern',
  currentLanguage: 'Aktuell',
  languageNameEn: 'Englisch',
  languageNameJa: 'Japanisch',
  languageNameFr: 'Französisch',
  languageNameEs: 'Spanisch',
  languageNameDe: 'Deutsch',
  languageNameIt: 'Italienisch',
  languageNamePt: 'Portugiesisch',
  languageNameRu: 'Russisch',
  languageNameZhHans: 'Chinesisch (vereinfacht)',
  languageNameZhHant: 'Chinesisch (traditionell)',
  languageNameKo: 'Koreanisch',
  languageNameHi: 'Hindi',
  languageNameId: 'Indonesisch',
  languageNameTh: 'Thailändisch',
  languageNameVi: 'Vietnamesisch',
  languageNameTr: 'Türkisch',
  languageNameNl: 'Niederländisch',
  languageNamePl: 'Polnisch',
  languageNameSv: 'Schwedisch',

  // --- Purchase / Restore ---
  restore: 'Käufe wiederherstellen',
  purchaseSuccess: 'Pro-Plan ist jetzt aktiv.',
  purchaseFailed: 'Kauf fehlgeschlagen. Bitte später erneut versuchen.',
  restoreSuccess: 'Kaufhistorie wiederhergestellt.',
  restoreNotFound: 'Keine Käufe zum Wiederherstellen gefunden.',
  restoreFailed: 'Wiederherstellung fehlgeschlagen.',
  restoreDesc: 'Mit diesem Konto getätigte Käufe wiederherstellen.',

  // --- Pro / Paywall ---
  proTitle: 'Auf Pro upgraden',
  proPlanFreeTitle: 'Gratis',
  proPlanMonthlyTitle: 'Monatlich',
  proPlanYearlyTitle: 'Jährlich',
  proPlanYearlyBadge: 'Beste Wahl',
  proBadgeShort: 'PRO',
  priceFree: '0 € / für immer',
  priceLoading: 'Laden...',
  priceUnavailable: 'Nicht verfügbar',
  proCtaYearly: 'Jahresplan starten',
  proCtaMonthly: 'Monatsplan starten',
  proCtaStayFree: 'Gratis bleiben',
  proFinePrint:
    'Abonnements verlängern sich automatisch. Du kannst jederzeit in deinen Kontoeinstellungen kündigen.',

  proPlanLifetimeTitle: 'Lebenslang',
  proPlanLifetimeBadge: 'Einmalzahlung',
  proCtaLifetime: 'Lebenslang kaufen',
  proLifetimeFinePrint: 'Einmaliger Kauf. Keine automatische Verlängerung.',

  // --- Legal ---
  legalSectionTitle: 'Rechtliches',
  legalPrivacyPolicyLabel: 'Datenschutzrichtlinie',
  legalTermsOfUseLabel: 'Nutzungsbedingungen (EULA)',

  // --- Errors ---
  errorLoadFailed: 'Daten konnten nicht geladen werden.',
  errorSaveFailed: 'Speichern fehlgeschlagen.',
  errorDeleteFailed: 'Löschen fehlgeschlagen.',
};

export default de;
