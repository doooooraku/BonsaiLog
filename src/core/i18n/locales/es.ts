import type { TranslationKey } from './en';

const es: Partial<Record<TranslationKey, string>> = {
  // --- Common UI ---
  ok: 'OK',
  cancel: 'Cancelar',
  save: 'Guardar',
  delete: 'Eliminar',
  create: 'Crear',
  close: 'Cerrar',
  done: 'Listo',
  loading: 'Cargando...',
  retry: 'Reintentar',
  error: 'Error',

  // --- Settings ---
  settings: 'Ajustes',
  language: 'Idioma',
  theme: 'Tema',
  version: 'Versión de la app',
  haptics: 'Respuesta háptica',
  sound: 'Sonido',

  // --- Language selector ---
  languageChange: 'Cambiar idioma',
  currentLanguage: 'Actual',
  languageNameEn: 'Inglés',
  languageNameJa: 'Japonés',
  languageNameFr: 'Francés',
  languageNameEs: 'Español',
  languageNameDe: 'Alemán',
  languageNameIt: 'Italiano',
  languageNamePt: 'Portugués',
  languageNameRu: 'Ruso',
  languageNameZhHans: 'Chino (simplificado)',
  languageNameZhHant: 'Chino (tradicional)',
  languageNameKo: 'Coreano',
  languageNameHi: 'Hindi',
  languageNameId: 'Indonesio',
  languageNameTh: 'Tailandés',
  languageNameVi: 'Vietnamita',
  languageNameTr: 'Turco',
  languageNameNl: 'Holandés',
  languageNamePl: 'Polaco',
  languageNameSv: 'Sueco',

  // --- Purchase / Restore ---
  restore: 'Restaurar compras',
  purchaseSuccess: 'El plan Pro está activo.',
  purchaseFailed: 'Error en la compra. Inténtalo más tarde.',
  restoreSuccess: 'Historial de compras restaurado.',
  restoreNotFound: 'No se encontraron compras para restaurar.',
  restoreFailed: 'Error al restaurar las compras.',
  restoreDesc: 'Restaurar compras realizadas con esta cuenta.',

  // --- Pro / Paywall ---
  proTitle: 'Actualizar a Pro',
  proPlanFreeTitle: 'Gratis',
  proPlanMonthlyTitle: 'Mensual',
  proPlanYearlyTitle: 'Anual',
  proPlanYearlyBadge: 'Mejor opción',
  proBadgeShort: 'PRO',
  priceFree: '0 € / para siempre',
  priceLoading: 'Cargando...',
  priceUnavailable: 'No disponible',
  proCtaYearly: 'Iniciar plan anual',
  proCtaMonthly: 'Iniciar plan mensual',
  proCtaStayFree: 'Continuar gratis',
  proFinePrint:
    'Las suscripciones se renuevan automáticamente. Puedes cancelar en cualquier momento desde los ajustes de tu cuenta.',

  proPlanLifetimeTitle: 'De por vida',
  proPlanLifetimeBadge: 'Pago único',
  proCtaLifetime: 'Comprar de por vida',
  proLifetimeFinePrint: 'Compra única. Sin renovación automática.',

  // --- Legal ---
  legalSectionTitle: 'Legal',
  legalPrivacyPolicyLabel: 'Política de privacidad',
  legalTermsOfUseLabel: 'Términos de uso (EULA)',

  // --- Errors ---
  errorLoadFailed: 'Error al cargar los datos.',
  errorSaveFailed: 'Error al guardar.',
  errorDeleteFailed: 'Error al eliminar.',
};

export default es;
