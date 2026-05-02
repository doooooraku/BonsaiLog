import type { TranslationKey } from './en';

const zhHans: Partial<Record<TranslationKey, string>> = {
  // --- Common UI ---
  ok: '好',
  cancel: '取消',
  save: '保存',
  delete: '删除',
  create: '创建',
  close: '关闭',
  done: '完成',
  loading: '加载中...',
  retry: '重试',
  error: '错误',

  // --- Settings ---
  settings: '设置',
  language: '语言',
  theme: '主题',
  version: '应用版本',
  haptics: '触感反馈',
  sound: '音效',

  // --- Language selector ---
  languageChange: '更改语言',
  currentLanguage: '当前',
  languageNameEn: '英语',
  languageNameJa: '日语',
  languageNameFr: '法语',
  languageNameEs: '西班牙语',
  languageNameDe: '德语',
  languageNameIt: '意大利语',
  languageNamePt: '葡萄牙语',
  languageNameRu: '俄语',
  languageNameZhHans: '简体中文',
  languageNameZhHant: '繁体中文',
  languageNameKo: '韩语',
  languageNameHi: '印地语',
  languageNameId: '印尼语',
  languageNameTh: '泰语',
  languageNameVi: '越南语',
  languageNameTr: '土耳其语',
  languageNameNl: '荷兰语',
  languageNamePl: '波兰语',
  languageNameSv: '瑞典语',

  // --- Purchase / Restore ---
  restore: '恢复购买',
  purchaseSuccess: 'Pro 方案已激活。',
  purchaseFailed: '购买失败，请稍后重试。',
  restoreSuccess: '购买记录已恢复。',
  restoreNotFound: '未找到可恢复的购买记录。',
  restoreFailed: '恢复购买失败。',
  restoreDesc: '恢复此账户的购买记录。',

  // --- Pro / Paywall ---
  proTitle: '升级到 Pro',
  proPlanFreeTitle: '免费',
  proPlanMonthlyTitle: '月付',
  proPlanYearlyTitle: '年付',
  proPlanYearlyBadge: '最划算',
  proBadgeShort: 'PRO',
  priceFree: '¥0 / 永久',
  priceLoading: '加载中...',
  priceUnavailable: '暂不可用',
  proCtaYearly: '开始年度计划',
  proCtaMonthly: '开始月度计划',
  proCtaStayFree: '继续免费使用',
  proFinePrint: '订阅将自动续费。您可以随时在账户设置中取消。',

  proPlanLifetimeTitle: '永久版',
  proPlanLifetimeBadge: '一次付费',
  proCtaLifetime: '购买永久版',
  proLifetimeFinePrint: '一次性购买，永久使用。无自动续费。',

  // --- Legal ---
  legalSectionTitle: '法律信息',
  legalPrivacyPolicyLabel: '隐私政策',
  legalTermsOfUseLabel: '使用条款 (EULA)',

  // --- Errors ---
  errorLoadFailed: '数据加载失败。',
  errorSaveFailed: '保存失败。',
  errorDeleteFailed: '删除失败。',

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
  settingsTitle: '设置',
  settingsBackupSection: '搬家',
  backupTitle: '搬家',
  backupExportTitle: '创建备份',
  backupExportDesc:
    '将盆栽记录、照片和养护日志保存为单个 ZIP 文件。可通过共享菜单发送到 iCloud Drive、Google Drive、邮件或聊天应用。',
  backupExportAction: '创建备份',
  backupExportSuccess: '已创建备份。',
  backupExportFailed: '创建备份失败。',
  backupImportTitle: '从备份恢复',
  backupImportDesc: '从先前创建的 ZIP 文件恢复。新记录会被添加，现有记录不会被修改。',
  backupImportAction: '恢复',
  backupImportWarningTitle: '从备份恢复？',
  backupImportWarningBody: '新记录将被添加到现有数据中。现有记录不会被覆盖或删除。',
  backupImportSuccess: '恢复完成。',
  backupImportSuccessDetail: '已添加 {bonsai} 盆栽、{events} 养护日志、{photos} 张照片。',
  backupImportFailed: '从备份恢复失败。',
  backupSchemaMismatchTitle: '不支持的备份版本',
  backupSchemaMismatchBody: '此备份由不同版本创建。请使用相同版本的应用进行恢复。',
  backupInvalidTitle: '备份文件已损坏',
  backupInvalidBody: '所选文件不是有效的备份，或部分数据缺失。请选择其他文件。',
  backupSizeLimitTitle: '备份过大',
  backupSizeLimitBody: '超过 200 MB 的备份无法共享。请减少照片数量后重试。',
  backupShareUnavailableTitle: '共享不可用',
  backupShareUnavailableBody: '此设备无法使用共享功能。请更新操作系统后重试。',
  backupUnsupportedTitle: '暂不支持',
  backupUnsupportedBody: '此平台不支持备份功能。',
  backupEncryptionWarning: '备份未加密。保存到云服务时，请保管在您控制的安全文件夹内。',

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
export default zhHans;
