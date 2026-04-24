import type { TranslationKey } from './en';

const pt: Partial<Record<TranslationKey, string>> = {
  // --- Common UI ---
  ok: 'OK',
  cancel: 'Cancelar',
  save: 'Salvar',
  delete: 'Excluir',
  create: 'Criar',
  close: 'Fechar',
  done: 'Concluído',
  loading: 'Carregando...',
  retry: 'Tentar novamente',
  error: 'Erro',

  // --- Settings ---
  settings: 'Configurações',
  language: 'Idioma',
  theme: 'Tema',
  version: 'Versão do app',
  haptics: 'Vibração',
  sound: 'Som',

  // --- Language selector ---
  languageChange: 'Mudar idioma',
  currentLanguage: 'Atual',
  languageNameEn: 'Inglês',
  languageNameJa: 'Japonês',
  languageNameFr: 'Francês',
  languageNameEs: 'Espanhol',
  languageNameDe: 'Alemão',
  languageNameIt: 'Italiano',
  languageNamePt: 'Português',
  languageNameRu: 'Russo',
  languageNameZhHans: 'Chinês (simplificado)',
  languageNameZhHant: 'Chinês (tradicional)',
  languageNameKo: 'Coreano',
  languageNameHi: 'Hindi',
  languageNameId: 'Indonésio',
  languageNameTh: 'Tailandês',
  languageNameVi: 'Vietnamita',
  languageNameTr: 'Turco',
  languageNameNl: 'Holandês',
  languageNamePl: 'Polonês',
  languageNameSv: 'Sueco',

  // --- Purchase / Restore ---
  restore: 'Restaurar compras',
  purchaseSuccess: 'O plano Pro está ativo.',
  purchaseFailed: 'Falha na compra. Tente novamente mais tarde.',
  restoreSuccess: 'Histórico de compras restaurado.',
  restoreNotFound: 'Nenhuma compra encontrada para restaurar.',
  restoreFailed: 'Falha ao restaurar compras.',
  restoreDesc: 'Restaurar compras realizadas com esta conta.',

  // --- Pro / Paywall ---
  proTitle: 'Atualizar para Pro',
  proPlanFreeTitle: 'Grátis',
  proPlanMonthlyTitle: 'Mensal',
  proPlanYearlyTitle: 'Anual',
  proPlanYearlyBadge: 'Melhor opção',
  proBadgeShort: 'PRO',
  priceFree: '$0 / para sempre',
  priceLoading: 'Carregando...',
  priceUnavailable: 'Indisponível',
  proCtaYearly: 'Iniciar plano anual',
  proCtaMonthly: 'Iniciar plano mensal',
  proCtaStayFree: 'Continuar grátis',
  proFinePrint:
    'As assinaturas são renovadas automaticamente. Cancele a qualquer momento nas configurações da sua conta.',

  proPlanLifetimeTitle: 'Vitalício',
  proPlanLifetimeBadge: 'Pagamento único',
  proCtaLifetime: 'Comprar vitalício',
  proLifetimeFinePrint: 'Compra única. Sem renovação automática.',

  // --- Legal ---
  legalSectionTitle: 'Jurídico',
  legalPrivacyPolicyLabel: 'Política de privacidade',
  legalTermsOfUseLabel: 'Termos de uso (EULA)',

  // --- Errors ---
  errorLoadFailed: 'Falha ao carregar dados.',
  errorSaveFailed: 'Falha ao salvar.',
  errorDeleteFailed: 'Falha ao excluir.',
};

export default pt;
