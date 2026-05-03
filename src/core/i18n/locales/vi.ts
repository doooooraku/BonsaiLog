import type { TranslationKey } from './en';

const vi: Partial<Record<TranslationKey, string>> = {
  // --- Common UI ---
  ok: 'OK',
  cancel: 'Hủy',
  save: 'Lưu',
  delete: 'Xóa',
  create: 'Tạo',
  close: 'Đóng',
  done: 'Xong',
  loading: 'Đang tải...',
  retry: 'Thử lại',
  error: 'Lỗi',

  // --- Settings ---
  settings: 'Cài đặt',
  language: 'Ngôn ngữ',
  theme: 'Giao diện',
  version: 'Phiên bản ứng dụng',
  haptics: 'Rung',
  sound: 'Âm thanh',

  // --- Language selector ---
  languageChange: 'Đổi ngôn ngữ',
  currentLanguage: 'Hiện tại',
  languageNameEn: 'Tiếng Anh',
  languageNameJa: 'Tiếng Nhật',
  languageNameFr: 'Tiếng Pháp',
  languageNameEs: 'Tiếng Tây Ban Nha',
  languageNameDe: 'Tiếng Đức',
  languageNameIt: 'Tiếng Ý',
  languageNamePt: 'Tiếng Bồ Đào Nha',
  languageNameRu: 'Tiếng Nga',
  languageNameZhHans: 'Tiếng Trung (Giản thể)',
  languageNameZhHant: 'Tiếng Trung (Phồn thể)',
  languageNameKo: 'Tiếng Hàn',
  languageNameHi: 'Tiếng Hindi',
  languageNameId: 'Tiếng Indonesia',
  languageNameTh: 'Tiếng Thái',
  languageNameVi: 'Tiếng Việt',
  languageNameTr: 'Tiếng Thổ Nhĩ Kỳ',
  languageNameNl: 'Tiếng Hà Lan',
  languageNamePl: 'Ba Lan',
  languageNameSv: 'Tiếng Thụy Điển',

  // --- Purchase / Restore ---
  restore: 'Khôi phục mua hàng',
  purchaseSuccess: 'Gói Pro đã được kích hoạt.',
  purchaseFailed: 'Giao dịch thất bại. Vui lòng thử lại sau.',
  restoreSuccess: 'Đã khôi phục lịch sử mua hàng.',
  restoreNotFound: 'Không tìm thấy giao dịch nào để khôi phục.',
  restoreFailed: 'Khôi phục mua hàng thất bại.',
  restoreDesc: 'Khôi phục các giao dịch mua hàng từ tài khoản này.',

  // --- Pro / Paywall ---
  proTitle: 'Nâng cấp lên Pro',
  proPlanFreeTitle: 'Miễn phí',
  proPlanMonthlyTitle: 'Hàng tháng',
  proPlanYearlyTitle: 'Hàng năm',
  proPlanYearlyBadge: 'Tốt nhất',
  proBadgeShort: 'PRO',
  priceFree: '0đ / vĩnh viễn',
  priceLoading: 'Đang tải...',
  priceUnavailable: 'Không khả dụng',
  proCtaYearly: 'Bắt đầu gói năm',
  proCtaMonthly: 'Bắt đầu gói tháng',
  proCtaStayFree: 'Tiếp tục miễn phí',
  proFinePrint: 'Gói đăng ký tự động gia hạn. Hủy bất cứ lúc nào trong cài đặt tài khoản.',

  proPlanLifetimeTitle: 'Trọn đời',
  proPlanLifetimeBadge: 'Thanh toán một lần',
  proCtaLifetime: 'Mua trọn đời',
  proLifetimeFinePrint: 'Mua một lần. Không tự động gia hạn.',

  // --- Legal ---
  legalSectionTitle: 'Pháp lý',
  legalPrivacyPolicyLabel: 'Chính sách bảo mật',
  legalTermsOfUseLabel: 'Điều khoản sử dụng (EULA)',

  // --- Errors ---
  errorLoadFailed: 'Tải dữ liệu thất bại.',
  errorSaveFailed: 'Lưu thất bại.',
  errorDeleteFailed: 'Xóa thất bại.',

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
  // --- F-05 Event overload popup (Issue #25, ADR-0011, English fallback for v1.0) ---
  eventOverloadTitle: 'A quick note',
  eventOverloadBody: 'You already have {count} entries on this day. Take it at your own pace.',
  eventOverloadActionConfirm: 'Save anyway',
  eventOverloadActionViewList: 'See the list',
  eventOverloadActionNeverShow: 'Don’t show again',
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

  // --- Settings sections (F-05 notification + F-11 move, English fallback for v1.0) ---
  settingsNotificationSection: 'Notifications',
  settingsEventOverloadToggle: 'Confirm when there are many entries',
  settingsEventOverloadToggleDesc:
    'When this is on, a gentle confirmation appears when you log the 6th entry on the same day.',

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

  // --- F-04 Watering history (Phase A、English fallback for now) ---
  wateringSectionTitle: 'Watering',
  wateringLastNoRecord: 'No watering records yet',
  wateringLastToday: 'Watered today',
  wateringLastOneDay: '1 day since last watering',
  wateringLastSeveralDays: '{days} days since last watering',
  wateringLastManyDays: '{days} days since last watering',
  wateringLastOverYear: 'Over a year since last watering',

  // --- F-15 Theme settings (Phase A、English fallback) ---
  settingsThemeSection: 'Appearance',
  settingsThemeSystem: 'System',
  settingsThemeLight: 'Light',
  settingsThemeDark: 'Dark',

  // --- F-09 Search (Phase A、English fallback) ---
  settingsSearchSection: 'Search',
  searchAction: 'Search',
  searchDesc: 'Search bonsai by name and care logs by note text.',
  searchPlaceholder: 'Search...',
  searchEmpty: 'No results found.',
  searchBonsaiSection: 'Bonsai',
  searchEventSection: 'Care logs',

  // --- F-10 Export Phase A (events CSV、English fallback) ---
  settingsExportSection: 'Export',
  exportCsvTitle: 'Export care logs to CSV',
  exportCsvDesc: 'Export all care logs to a CSV file (Pro feature).',
  exportCsvAction: 'Export CSV',
  exportCsvSuccess: 'Export complete.',
  exportCsvSuccessDetail: 'Exported {count} care logs.',
  exportCsvFailed: 'Export failed.',
  exportCsvShareTitle: 'BonsaiLog care logs CSV',
  exportProRequiredTitle: 'Pro feature',
  exportProRequiredBody: 'CSV export is available for Pro members. Upgrade to unlock.',
  exportShareUnavailableTitle: 'Sharing is not available',
  exportShareUnavailableBody:
    'Sharing is not available on this device. Please update the OS and try again.',

  // --- F-07 Wiring duration (Phase A、English fallback) ---
  wiringDurationOverdueWeeks: 'Wire on for {weeks} weeks',
  wiringScheduledUnwireSet: 'Scheduled unwire date: {date}',

  // --- F-13 Paywall comparison (Phase 1c、English fallback) ---
  proComparisonTitle: 'What you get with Pro',
  proComparisonPhotos: 'Unlimited photos per bonsai',
  proComparisonCsv: 'Export care logs to CSV',
  proComparisonPdf: 'Export bonsai records to PDF',
  proComparisonNoAds: 'No ads',

  // --- F-09 Tags manager (Phase C、English fallback) ---
  tagsManagerTitle: 'Manage tags',
  tagsManagerDesc: 'Tags help you organize care logs and find them in search.',
  tagsAddPlaceholder: 'New tag name',
  tagsAddAction: 'Add',
  tagsAddFailedBody: 'Could not add the tag.',
  tagsEmpty: 'No tags yet.',
  tagsDeleteConfirmTitle: 'Delete this tag?',
  tagsDeleteConfirmBody: 'Tag "{name}" and all of its links to care logs will be removed.',

  // --- F-16 Notification settings (Phase B、English fallback) ---
  settingsNotifSummaryToggle: 'Daily summary notification',
  settingsNotifSummaryToggleDesc:
    'Receive a single summary at {time} when you have planned events on that day.',
  settingsNotifWateringToggle: 'Watering notification',
  settingsNotifWateringToggleDesc: 'Receive a notification at {times}.',
  settingsNotifPermissionDeniedTitle: 'Notification permission needed',
  settingsNotifPermissionDeniedBody:
    'Notifications are disabled in your device settings. Enable them to use this feature.',

  // --- F-14 Ad banner label (Phase B、English fallback) ---
  adBannerLabel: 'Ad',

  // --- F-26 Onboarding (Phase A copy + Phase C language、English fallback) ---
  onboardingWelcomeTitle: 'A bonsai journal for a lifetime',
  onboardingWelcomeBody:
    'Record care, photos, and species for each pot — works fully offline, in 19 languages.',
  onboardingWelcomeCta: 'Get started',
  onboardingSkip: 'Later',
  onboardingLanguageTitle: 'Choose your language',
  onboardingLanguageDesc: 'Tap to preview. You can change this later in Settings.',
  onboardingLanguageOsBadge: 'Device',
  next: 'Next',

  // --- F-15 Outdoor mode (Phase B、English fallback) ---
  settingsOutdoorMode: 'Outdoor mode',
  settingsOutdoorModeDesc:
    'When on, the app uses a high-contrast palette for outdoor visibility (full implementation in next update).',

  // --- F-10 PDF export (Phase B、English fallback) ---
  exportPdfTitle: 'Export bonsai to PDF',
  exportPdfDesc: 'Generate a PDF report for each bonsai (Pro feature).',
  exportPdfAction: 'PDF',
  exportPdfHeaderDate: 'Date',
  exportPdfHeaderType: 'Type',
  exportPdfHeaderNote: 'Note',
  exportPdfFooterNote: 'Generated by BonsaiLog',
  exportPdfShareTitle: 'BonsaiLog bonsai PDF',
  exportPdfFailedBody: 'Failed to generate the PDF.',

  // --- F-09 Search recent tags chips (Phase B、English fallback) ---
  searchRecentTagsLabel: 'Recent tags',

  // --- F-13 Settings → Account / Paywall entry (Phase 1b、English fallback) ---
  settingsAccountSection: 'Account',
  settingsAccountProActive: 'Pro member',
  settingsAccountProActiveDesc: 'Manage your subscription from here.',
  settingsAccountProInactiveDesc: 'See plans and upgrade.',

  // --- F-04 Watering heatmap (Phase B、English fallback) ---
  wateringHeatmapLegendLabel: 'Watering counts (last 12 weeks)',
  wateringHeatmapLegend0: '0',
  wateringHeatmapLegend1: '1',
  wateringHeatmapLegend2: '2',
  wateringHeatmapLegend3: '3+',

  // --- F-07 Wiring duration in-app display (Phase B、English fallback) ---
  wiringDurationWithinWeeks: 'Wire on for {weeks} weeks',
  wiringDurationOverdueLabel: 'Wire on for {weeks} weeks (overdue)',

  // --- F-LEGAL-001 Ad privacy (Phase A、English fallback) ---
  settingsAdPrivacySection: 'Ad privacy',
  settingsAdPrivacyOptionsTitle: 'Ad privacy settings',
  settingsAdPrivacyOptionsDesc:
    'Reopen the consent dialog if you live in the EU, UK, Switzerland, or a regulated US state.',
  settingsAdPrivacyOptionsUnavailableTitle: 'Not required in your region',
  settingsAdPrivacyOptionsUnavailableBody: 'Ad consent settings are not required in your region.',
  settingsAdPrivacyOptionsFailedBody: 'Could not open the ad privacy settings.',
  purchaseErrorNetwork: 'Connection error. Please check your network and try again.',
  purchaseErrorAlreadyPurchased: 'You already own this product. Tap Restore to retrieve it.',
  purchaseErrorStoreProblem: 'There was a problem with the store. Please try again later.',
  purchaseErrorNotAllowed:
    'Purchases are not allowed on this device. Please check your device settings.',
  purchasePending:
    'Your purchase is pending approval. We will activate Pro automatically once approved.',
  settingsRestoreTitle: 'Restore purchases',
  settingsRestoreDesc: 'Already paid on another device? Restore here.',
  lifetimeWarningTitle: 'Confirm Lifetime purchase',
  lifetimeWarningBody:
    'Existing subscriptions are not auto-cancelled. Please manage them in your Apple ID or Google Play settings.',
  confirm: 'Confirm',
};
export default vi;
