import type { TranslationKey } from './en';

const ru: Partial<Record<TranslationKey, string>> = {
  // --- Common UI ---
  ok: 'ОК',
  cancel: 'Отмена',
  save: 'Сохранить',
  delete: 'Удалить',
  create: 'Создать',
  close: 'Закрыть',
  done: 'Готово',
  loading: 'Загрузка...',
  retry: 'Повторить',
  error: 'Ошибка',

  // --- Settings ---
  settings: 'Настройки',
  language: 'Язык',
  theme: 'Тема',
  version: 'Версия приложения',
  haptics: 'Вибрация',
  sound: 'Звук',

  // --- Language selector ---
  languageChange: 'Сменить язык',
  currentLanguage: 'Текущий',
  languageNameEn: 'Английский',
  languageNameJa: 'Японский',
  languageNameFr: 'Французский',
  languageNameEs: 'Испанский',
  languageNameDe: 'Немецкий',
  languageNameIt: 'Итальянский',
  languageNamePt: 'Португальский',
  languageNameRu: 'Русский',
  languageNameZhHans: 'Китайский (упрощённый)',
  languageNameZhHant: 'Китайский (традиционный)',
  languageNameKo: 'Корейский',
  languageNameHi: 'Хинди',
  languageNameId: 'Индонезийский',
  languageNameTh: 'Тайский',
  languageNameVi: 'Вьетнамский',
  languageNameTr: 'Турецкий',
  languageNameNl: 'Нидерландский',
  languageNamePl: 'Польский',
  languageNameSv: 'Шведский',

  // --- Purchase / Restore ---
  restore: 'Восстановить покупки',
  purchaseSuccess: 'Pro-план активирован.',
  purchaseFailed: 'Ошибка покупки. Попробуйте позже.',
  restoreSuccess: 'История покупок восстановлена.',
  restoreNotFound: 'Покупки для восстановления не найдены.',
  restoreFailed: 'Не удалось восстановить покупки.',
  restoreDesc: 'Восстановить покупки, совершённые с этого аккаунта.',

  // --- Pro / Paywall ---
  proTitle: 'Перейти на Pro',
  proPlanFreeTitle: 'Бесплатно',
  proPlanMonthlyTitle: 'Ежемесячно',
  proPlanYearlyTitle: 'Ежегодно',
  proPlanYearlyBadge: 'Лучшая цена',
  proBadgeShort: 'PRO',
  priceFree: '$0 / навсегда',
  priceLoading: 'Загрузка...',
  priceUnavailable: 'Недоступно',
  proCtaYearly: 'Начать годовой план',
  proCtaMonthly: 'Начать месячный план',
  proCtaStayFree: 'Остаться на бесплатном',
  proFinePrint:
    'Подписки продлеваются автоматически. Отменить можно в любое время в настройках аккаунта.',

  proPlanLifetimeTitle: 'Навсегда',
  proPlanLifetimeBadge: 'Разовый платёж',
  proCtaLifetime: 'Купить навсегда',
  proLifetimeFinePrint: 'Разовая покупка. Без автоматического продления.',

  // --- Legal ---
  legalSectionTitle: 'Правовая информация',
  legalPrivacyPolicyLabel: 'Политика конфиденциальности',
  legalTermsOfUseLabel: 'Условия использования (EULA)',

  // --- Errors ---
  errorLoadFailed: 'Ошибка загрузки данных.',
  errorSaveFailed: 'Ошибка сохранения.',
  errorDeleteFailed: 'Ошибка удаления.',
};

export default ru;
