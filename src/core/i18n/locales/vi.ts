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
};
export default vi;
