import type { TranslationKey } from './en';

const fr: Partial<Record<TranslationKey, string>> = {
  // --- Common UI ---
  ok: 'OK',
  cancel: 'Annuler',
  save: 'Enregistrer',
  delete: 'Supprimer',
  create: 'Créer',
  close: 'Fermer',
  done: 'Terminé',
  loading: 'Chargement...',
  retry: 'Réessayer',
  error: 'Erreur',

  // --- Settings ---
  settings: 'Paramètres',
  language: 'Langue',
  theme: 'Thème',
  version: "Version de l'app",
  haptics: 'Vibrations',
  sound: 'Son',

  // --- Language selector ---
  languageChange: 'Changer de langue',
  currentLanguage: 'Actuel',
  languageNameEn: 'Anglais',
  languageNameJa: 'Japonais',
  languageNameFr: 'Français',
  languageNameEs: 'Espagnol',
  languageNameDe: 'Allemand',
  languageNameIt: 'Italien',
  languageNamePt: 'Portugais',
  languageNameRu: 'Russe',
  languageNameZhHans: 'Chinois (simplifié)',
  languageNameZhHant: 'Chinois (traditionnel)',
  languageNameKo: 'Coréen',
  languageNameHi: 'Hindi',
  languageNameId: 'Indonésien',
  languageNameTh: 'Thaï',
  languageNameVi: 'Vietnamien',
  languageNameTr: 'Turc',
  languageNameNl: 'Néerlandais',
  languageNamePl: 'Polonais',
  languageNameSv: 'Suédois',

  // --- Purchase / Restore ---
  restore: 'Restaurer les achats',
  purchaseSuccess: 'Le plan Pro est maintenant actif.',
  purchaseFailed: "L'achat a échoué. Veuillez réessayer plus tard.",
  restoreSuccess: "Historique d'achat restauré.",
  restoreNotFound: 'Aucun achat trouvé à restaurer.',
  restoreFailed: 'Échec de la restauration des achats.',
  restoreDesc: 'Restaurer les achats effectués sur ce compte.',

  // --- Pro / Paywall ---
  proTitle: 'Passer à Pro',
  proPlanFreeTitle: 'Gratuit',
  proPlanMonthlyTitle: 'Mensuel',
  proPlanYearlyTitle: 'Annuel',
  proPlanYearlyBadge: 'Meilleure offre',
  proBadgeShort: 'PRO',
  priceFree: '0 € / pour toujours',
  priceLoading: 'Chargement...',
  priceUnavailable: 'Indisponible',
  proCtaYearly: 'Choisir le plan annuel',
  proCtaMonthly: 'Choisir le plan mensuel',
  proCtaStayFree: 'Rester en gratuit',
  proFinePrint:
    "L'abonnement se renouvelle automatiquement. Vous pouvez annuler à tout moment dans les paramètres de votre compte.",

  proPlanLifetimeTitle: 'À vie',
  proPlanLifetimeBadge: 'Paiement unique',
  proCtaLifetime: 'Acheter à vie',
  proLifetimeFinePrint: 'Achat unique. Pas de renouvellement automatique.',

  // --- Legal ---
  legalSectionTitle: 'Mentions légales',
  legalPrivacyPolicyLabel: 'Politique de confidentialité',
  legalTermsOfUseLabel: "Conditions d'utilisation (EULA)",

  // --- Errors ---
  errorLoadFailed: 'Échec du chargement des données.',
  errorSaveFailed: "Échec de l'enregistrement.",
  errorDeleteFailed: 'Échec de la suppression.',
};

export default fr;
