import type { TranslationKey } from './en';

const zhHant: Partial<Record<TranslationKey, string>> = {
  // --- Common UI ---
  ok: '好',
  cancel: '取消',
  save: '儲存',
  delete: '刪除',
  create: '建立',
  close: '關閉',
  done: '完成',
  loading: '載入中...',
  retry: '重試',
  error: '錯誤',

  // --- Settings ---
  settings: '設定',
  language: '語言',
  theme: '主題',
  version: '應用程式版本',
  haptics: '觸覺回饋',
  sound: '音效',

  // --- Language selector ---
  languageChange: '更改語言',
  currentLanguage: '目前',
  languageNameEn: '英語',
  languageNameJa: '日語',
  languageNameFr: '法語',
  languageNameEs: '西班牙語',
  languageNameDe: '德語',
  languageNameIt: '義大利語',
  languageNamePt: '葡萄牙語',
  languageNameRu: '俄語',
  languageNameZhHans: '簡體中文',
  languageNameZhHant: '繁體中文',
  languageNameKo: '韓語',
  languageNameHi: '印地語',
  languageNameId: '印尼語',
  languageNameTh: '泰語',
  languageNameVi: '越南語',
  languageNameTr: '土耳其語',
  languageNameNl: '荷蘭語',
  languageNamePl: '波蘭語',
  languageNameSv: '瑞典語',

  // --- Purchase / Restore ---
  restore: '恢復購買',
  purchaseSuccess: 'Pro 方案已啟用。',
  purchaseFailed: '購買失敗，請稍後再試。',
  restoreSuccess: '購買紀錄已恢復。',
  restoreNotFound: '找不到可恢復的購買紀錄。',
  restoreFailed: '恢復購買失敗。',
  restoreDesc: '恢復此帳號的購買紀錄。',

  // --- Pro / Paywall ---
  proTitle: '升級至 Pro',
  proPlanFreeTitle: '免費',
  proPlanMonthlyTitle: '月付',
  proPlanYearlyTitle: '年付',
  proPlanYearlyBadge: '最划算',
  proBadgeShort: 'PRO',
  priceFree: '$0 / 永久',
  priceLoading: '載入中...',
  priceUnavailable: '暫不可用',
  proCtaYearly: '開始年度方案',
  proCtaMonthly: '開始月度方案',
  proCtaStayFree: '繼續免費使用',
  proFinePrint: '訂閱將自動續費。您可以隨時在帳號設定中取消。',

  proPlanLifetimeTitle: '永久版',
  proPlanLifetimeBadge: '一次付費',
  proCtaLifetime: '購買永久版',
  proLifetimeFinePrint: '一次性購買，永久使用。無自動續訂。',

  // --- Legal ---
  legalSectionTitle: '法律資訊',
  legalPrivacyPolicyLabel: '隱私權政策',
  legalTermsOfUseLabel: '使用條款 (EULA)',

  // --- Errors ---
  errorLoadFailed: '資料載入失敗。',
  errorSaveFailed: '儲存失敗。',
  errorDeleteFailed: '刪除失敗。',

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
  settingsTitle: '設定',
  settingsBackupSection: '搬家',
  backupTitle: '搬家',
  backupExportTitle: '建立備份',
  backupExportDesc:
    '將盆栽紀錄、相片和養護紀錄儲存為單一 ZIP 檔案。可透過分享選單傳送至 iCloud Drive、Google Drive、電子郵件或通訊軟體。',
  backupExportAction: '建立備份',
  backupExportSuccess: '已建立備份。',
  backupExportFailed: '建立備份失敗。',
  backupImportTitle: '從備份還原',
  backupImportDesc: '從先前建立的 ZIP 檔案還原。新紀錄會被新增，現有紀錄不會被變更。',
  backupImportAction: '還原',
  backupImportWarningTitle: '從備份還原？',
  backupImportWarningBody: '新紀錄將會被新增到現有資料中。現有紀錄不會被覆寫或刪除。',
  backupImportSuccess: '還原完成。',
  backupImportSuccessDetail: '已新增 {bonsai} 盆栽、{events} 養護紀錄、{photos} 張相片。',
  backupImportFailed: '從備份還原失敗。',
  backupSchemaMismatchTitle: '不支援的備份版本',
  backupSchemaMismatchBody: '此備份由不同版本建立。請使用對應版本的應用程式還原。',
  backupInvalidTitle: '備份檔案已損毀',
  backupInvalidBody: '所選檔案不是有效的備份，或部分資料缺失。請選擇其他檔案。',
  backupSizeLimitTitle: '備份過大',
  backupSizeLimitBody: '超過 200 MB 的備份無法分享。請減少相片數量後重試。',
  backupShareUnavailableTitle: '無法使用分享',
  backupShareUnavailableBody: '此裝置無法使用分享功能。請更新作業系統後再試。',
  backupUnsupportedTitle: '暫不支援',
  backupUnsupportedBody: '此平台不支援備份功能。',
  backupEncryptionWarning: '備份不會加密。儲存至雲端服務時，請存放在您可控管的安全資料夾。',

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
export default zhHant;
