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

  // --- F-02 Events (P2-03 PR-D, English fallback for v1.0) ---
  eventsTitle: 'Care log',
  eventLogCta: 'Log a care event',
  eventTypePickerDesc: 'Choose what you did:',
  eventEmpty: 'No events recorded yet.',
  eventDeleteConfirmTitle: 'Move this event to trash?',
  eventDeleteConfirmDesc: 'Trashed events are permanently removed after 30 days.',
  eventType_watering: 'Watering',
  eventType_pruning: 'Pruning',
  eventType_wiring: 'Wiring',
  eventType_unwiring: 'Unwiring',
  eventType_repotting: 'Repotting',
  eventType_fertilizing: 'Fertilizing',
  eventType_pest_control: 'Pest control',
  eventType_leaf_trimming: 'Leaf trimming',
  eventType_defoliation: 'Defoliation',
  eventType_deshoot: 'Bud removal',
  eventType_candle_cut: 'Candle cut',
  eventType_moss_care: 'Moss care',
  eventType_position_change: 'Position change',

  // --- F-11 Backup / Move (Issue #12, ADR-0007) ---
  settingsTitle: 'Settings',
  settingsBackupSection: 'Move data',
  backupTitle: 'Move data',
  backupExportTitle: 'Create a backup',
  backupExportDesc:
    'Save all your bonsai records, photos, and care log to a single ZIP file. Use the Share Sheet to send it to iCloud Drive, Google Drive, email, or messaging apps.',
  backupExportAction: 'Create backup',
  backupExportSuccess: 'Backup created.',
  backupExportFailed: 'Failed to create the backup.',
  backupImportTitle: 'Restore from a backup',
  backupImportDesc:
    'Restore from a previously created ZIP file. New records are added; existing records are not changed.',
  backupImportAction: 'Restore',
  backupImportWarningTitle: 'Restore from backup?',
  backupImportWarningBody:
    'New records will be added to the existing data. Existing records will not be overwritten or deleted.',
  backupImportSuccess: 'Restore complete.',
  backupImportSuccessDetail: 'Added {bonsai} bonsai, {events} care logs, and {photos} photos.',
  backupImportFailed: 'Failed to restore from the backup.',
  backupSchemaMismatchTitle: 'Unsupported backup version',
  backupSchemaMismatchBody:
    'This backup was created with a different app version. Please use the matching app version to restore.',
  backupInvalidTitle: 'The backup file is broken',
  backupInvalidBody:
    'The selected file is not a valid backup, or some data is missing. Please choose another file.',
  backupSizeLimitTitle: 'Backup is too large',
  backupSizeLimitBody:
    'Backup files larger than 200 MB cannot be shared. Please reduce the number of photos and try again.',
  backupShareUnavailableTitle: 'Sharing is not available',
  backupShareUnavailableBody:
    'Sharing is not available on this device. Please update the OS and try again.',
  backupUnsupportedTitle: 'Not supported',
  backupUnsupportedBody: 'Backup is not available on this platform.',
  backupEncryptionWarning:
    'Backups are not encrypted. When you save them to a cloud service, please keep them in a secure folder under your control.',
};
export default ru;
