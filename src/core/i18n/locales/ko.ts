import type { TranslationKey } from './en';

const ko: Partial<Record<TranslationKey, string>> = {
  // --- Common UI ---
  ok: '확인',
  cancel: '취소',
  save: '저장',
  delete: '삭제',
  create: '만들기',
  close: '닫기',
  done: '완료',
  loading: '로딩 중...',
  retry: '재시도',
  error: '오류',

  // --- Settings ---
  settings: '설정',
  language: '언어',
  theme: '테마',
  version: '앱 버전',
  haptics: '진동',
  sound: '사운드',

  // --- Language selector ---
  languageChange: '언어 변경',
  currentLanguage: '현재',
  languageNameEn: '영어',
  languageNameJa: '일본어',
  languageNameFr: '프랑스어',
  languageNameEs: '스페인어',
  languageNameDe: '독일어',
  languageNameIt: '이탈리아어',
  languageNamePt: '포르투갈어',
  languageNameRu: '러시아어',
  languageNameZhHans: '중국어 (간체)',
  languageNameZhHant: '중국어 (번체)',
  languageNameKo: '한국어',
  languageNameHi: '힌디어',
  languageNameId: '인도네시아어',
  languageNameTh: '태국어',
  languageNameVi: '베트남어',
  languageNameTr: '튀르키예어',
  languageNameNl: '네덜란드어',
  languageNamePl: '폴란드어',
  languageNameSv: '스웨덴어',

  // --- Purchase / Restore ---
  restore: '구매 복원',
  purchaseSuccess: 'Pro 플랜이 활성화되었습니다.',
  purchaseFailed: '결제에 실패했습니다. 나중에 다시 시도해 주세요.',
  restoreSuccess: '구매 기록이 복원되었습니다.',
  restoreNotFound: '복원할 구매 기록이 없습니다.',
  restoreFailed: '구매 복원에 실패했습니다.',
  restoreDesc: '이 계정으로 구매한 항목을 복원합니다.',

  // --- Pro / Paywall ---
  proTitle: 'Pro로 업그레이드',
  proPlanFreeTitle: '무료',
  proPlanMonthlyTitle: '월간',
  proPlanYearlyTitle: '연간',
  proPlanYearlyBadge: '최고의 선택',
  proBadgeShort: 'PRO',
  priceFree: '₩0 / 평생',
  priceLoading: '로딩 중...',
  priceUnavailable: '이용 불가',
  proCtaYearly: '연간 플랜 시작',
  proCtaMonthly: '월간 플랜 시작',
  proCtaStayFree: '무료로 계속 사용',
  proFinePrint: '구독은 자동으로 갱신됩니다. 계정 설정에서 언제든지 해지할 수 있습니다.',

  proPlanLifetimeTitle: '평생',
  proPlanLifetimeBadge: '일회성 결제',
  proCtaLifetime: '평생 구매',
  proLifetimeFinePrint: '일회성 구매입니다. 자동 갱신이 없습니다.',

  // --- Legal ---
  legalSectionTitle: '법적 정보',
  legalPrivacyPolicyLabel: '개인정보 처리방침',
  legalTermsOfUseLabel: '이용약관 (EULA)',

  // --- Errors ---
  errorLoadFailed: '데이터를 불러오지 못했습니다.',
  errorSaveFailed: '저장에 실패했습니다.',
  errorDeleteFailed: '삭제에 실패했습니다.',

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
  settingsTitle: '설정',
  settingsBackupSection: '이사',
  backupTitle: '이사',
  backupExportTitle: '백업 만들기',
  backupExportDesc:
    '분재 기록, 사진, 관리 기록을 하나의 ZIP 파일로 저장합니다. 공유 메뉴를 사용하여 iCloud Drive, Google Drive, 이메일 또는 메신저로 보낼 수 있습니다.',
  backupExportAction: '백업 만들기',
  backupExportSuccess: '백업이 생성되었습니다.',
  backupExportFailed: '백업 생성에 실패했습니다.',
  backupImportTitle: '백업에서 복원',
  backupImportDesc:
    '이전에 만든 ZIP 파일에서 복원합니다. 새 기록은 추가되며 기존 기록은 변경되지 않습니다.',
  backupImportAction: '복원',
  backupImportWarningTitle: '백업에서 복원하시겠습니까?',
  backupImportWarningBody:
    '기존 데이터에 새 기록이 추가됩니다. 기존 기록은 덮어쓰거나 삭제되지 않습니다.',
  backupImportSuccess: '복원이 완료되었습니다.',
  backupImportSuccessDetail:
    '분재 {bonsai}건, 관리 기록 {events}건, 사진 {photos}장을 추가했습니다.',
  backupImportFailed: '백업에서 복원하지 못했습니다.',
  backupSchemaMismatchTitle: '지원되지 않는 백업 버전',
  backupSchemaMismatchBody:
    '이 백업은 다른 버전에서 만들어졌습니다. 같은 버전의 앱으로 복원하세요.',
  backupInvalidTitle: '백업 파일이 손상되었습니다',
  backupInvalidBody:
    '선택한 파일이 올바른 백업이 아니거나 데이터가 누락되었습니다. 다른 파일을 선택해 주세요.',
  backupSizeLimitTitle: '백업이 너무 큽니다',
  backupSizeLimitBody:
    '200MB가 넘는 백업은 공유할 수 없습니다. 사진 수를 줄이고 다시 시도해 주세요.',
  backupShareUnavailableTitle: '공유를 사용할 수 없습니다',
  backupShareUnavailableBody:
    '이 기기에서는 공유를 사용할 수 없습니다. OS를 업데이트한 후 다시 시도하세요.',
  backupUnsupportedTitle: '지원되지 않음',
  backupUnsupportedBody: '이 플랫폼에서는 백업 기능을 사용할 수 없습니다.',
  backupEncryptionWarning:
    '백업은 암호화되지 않습니다. 클라우드 서비스에 저장할 때는 사용자가 관리할 수 있는 안전한 폴더에 보관하세요.',

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
  attExplainerTitle: 'About ad personalization',
  attExplainerBody:
    'You can choose whether to allow the use of an identifier to help measure ad performance.',
  attExplainerAllow: 'If allowed: ads may be more relevant to you.',
  attExplainerDeny: 'If not allowed: general ads will be shown. No app features are restricted.',
  settingsExportListPdfTitle: 'Export full list PDF',
  settingsExportListPdfDesc: 'A4 PDF with cover, list and stats',
  exportListPdfTitle: 'Full list PDF',
  exportListPdfDesc: 'Generates an A4 PDF with cover, full bonsai list and statistics.',
  exportListPdfAction: 'Generate',
  exportListPdfFailedBody: 'Failed to generate the list PDF. Please try again later.',
  exportListPdfShareTitle: 'Share full list PDF',
  exportListPdfCoverTitle: 'BonsaiLog Full Records',
  exportListPdfCoverSubtitle: '{count} bonsai total',
  exportListPdfGeneratedAt: 'Generated:',
  exportListPdfListSection: 'Bonsai List',
  exportListPdfStatsSection: 'Statistics',
  exportListPdfTotal: 'Total events: {count}',
  exportListPdfTypeBreakdown: 'By type',
  exportListPdfSpeciesBreakdown: 'By species',
  exportListPdfFooter: 'Generated by BonsaiLog',
};
export default ko;
