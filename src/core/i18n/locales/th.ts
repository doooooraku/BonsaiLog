import type { TranslationKey } from './en';

const th: Partial<Record<TranslationKey, string>> = {
  // --- Common UI ---
  ok: 'ตกลง',
  cancel: 'ยกเลิก',
  save: 'บันทึก',
  delete: 'ลบ',
  create: 'สร้าง',
  close: 'ปิด',
  done: 'เสร็จสิ้น',
  loading: 'กำลังโหลด...',
  retry: 'ลองอีกครั้ง',
  error: 'ข้อผิดพลาด',

  // --- Settings ---
  settings: 'การตั้งค่า',
  language: 'ภาษา',
  theme: 'ธีม',
  version: 'เวอร์ชันแอป',
  haptics: 'การสั่น',
  sound: 'เสียง',

  // --- Language selector ---
  languageChange: 'เปลี่ยนภาษา',
  currentLanguage: 'ปัจจุบัน',
  languageNameEn: 'อังกฤษ',
  languageNameJa: 'ญี่ปุ่น',
  languageNameFr: 'ฝรั่งเศส',
  languageNameEs: 'สเปน',
  languageNameDe: 'เยอรมัน',
  languageNameIt: 'อิตาลี',
  languageNamePt: 'โปรตุเกส',
  languageNameRu: 'รัสเซีย',
  languageNameZhHans: 'จีน (ตัวย่อ)',
  languageNameZhHant: 'จีน (ตัวเต็ม)',
  languageNameKo: 'เกาหลี',
  languageNameHi: 'ฮินดี',
  languageNameId: 'อินโดนีเซีย',
  languageNameTh: 'ไทย',
  languageNameVi: 'เวียดนาม',
  languageNameTr: 'ตุรกี',
  languageNameNl: 'ดัตช์',
  languageNamePl: 'โปแลนด์',
  languageNameSv: 'สวีเดน',

  // --- Purchase / Restore ---
  restore: 'กู้คืนการซื้อ',
  purchaseSuccess: 'แพ็กเกจ Pro ใช้งานได้แล้ว',
  purchaseFailed: 'การซื้อล้มเหลว กรุณาลองใหม่ภายหลัง',
  restoreSuccess: 'กู้คืนประวัติการซื้อแล้ว',
  restoreNotFound: 'ไม่พบประวัติการซื้อที่จะกู้คืน',
  restoreFailed: 'กู้คืนการซื้อไม่สำเร็จ',
  restoreDesc: 'กู้คืนการซื้อที่ทำจากบัญชีนี้',

  // --- Pro / Paywall ---
  proTitle: 'อัปเกรดเป็น Pro',
  proPlanFreeTitle: 'ฟรี',
  proPlanMonthlyTitle: 'รายเดือน',
  proPlanYearlyTitle: 'รายปี',
  proPlanYearlyBadge: 'คุ้มที่สุด',
  proBadgeShort: 'PRO',
  priceFree: '฿0 / ตลอดไป',
  priceLoading: 'กำลังโหลด...',
  priceUnavailable: 'ไม่พร้อมใช้งาน',
  proCtaYearly: 'เริ่มแพ็กเกจรายปี',
  proCtaMonthly: 'เริ่มแพ็กเกจรายเดือน',
  proCtaStayFree: 'ใช้งานฟรีต่อไป',
  proFinePrint: 'การสมัครสมาชิกจะต่ออายุอัตโนมัติ ยกเลิกได้ทุกเมื่อในการตั้งค่าบัญชี',

  proPlanLifetimeTitle: 'ตลอดชีพ',
  proPlanLifetimeBadge: 'จ่ายครั้งเดียว',
  proCtaLifetime: 'ซื้อตลอดชีพ',
  proLifetimeFinePrint: 'ซื้อครั้งเดียว ไม่มีการต่ออายุอัตโนมัติ',

  // --- Legal ---
  legalSectionTitle: 'ข้อกฎหมาย',
  legalPrivacyPolicyLabel: 'นโยบายความเป็นส่วนตัว',
  legalTermsOfUseLabel: 'เงื่อนไขการใช้งาน (EULA)',

  // --- Errors ---
  errorLoadFailed: 'โหลดข้อมูลไม่สำเร็จ',
  errorSaveFailed: 'บันทึกไม่สำเร็จ',
  errorDeleteFailed: 'ลบไม่สำเร็จ',

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

  // --- F-26 Onboarding (Phase A copy、English fallback) ---
  onboardingWelcomeTitle: 'A bonsai journal for a lifetime',
  onboardingWelcomeBody:
    'Record care, photos, and species for each pot — works fully offline, in 19 languages.',
  onboardingWelcomeCta: 'Get started',
  onboardingSkip: 'Later',

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
};
export default th;
