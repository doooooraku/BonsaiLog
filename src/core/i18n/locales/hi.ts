import type { TranslationKey } from './en';

const hi: Partial<Record<TranslationKey, string>> = {
  // --- Common UI ---
  ok: 'ठीक है',
  cancel: 'रद्द करें',
  save: 'सहेजें',
  delete: 'हटाएं',
  create: 'बनाएं',
  close: 'बंद करें',
  done: 'हो गया',
  loading: 'लोड हो रहा है...',
  retry: 'पुनः प्रयास करें',
  error: 'त्रुटि',

  // --- Settings ---
  settings: 'सेटिंग्स',
  language: 'भाषा',
  theme: 'थीम',
  version: 'ऐप संस्करण',
  haptics: 'हैप्टिक्स',
  sound: 'ध्वनि',

  // --- Language selector ---
  languageChange: 'भाषा बदलें',
  currentLanguage: 'वर्तमान',
  languageNameEn: 'अंग्रेज़ी',
  languageNameJa: 'जापानी',
  languageNameFr: 'फ़्रेंच',
  languageNameEs: 'स्पेनिश',
  languageNameDe: 'जर्मन',
  languageNameIt: 'इतालवी',
  languageNamePt: 'पुर्तगाली',
  languageNameRu: 'रूसी',
  languageNameZhHans: 'चीनी (सरलीकृत)',
  languageNameZhHant: 'चीनी (पारंपरिक)',
  languageNameKo: 'कोरियाई',
  languageNameHi: 'हिन्दी',
  languageNameId: 'इंडोनेशियाई',
  languageNameTh: 'थाई',
  languageNameVi: 'वियतनामी',
  languageNameTr: 'तुर्की',
  languageNameNl: 'डच',
  languageNamePl: 'पोलिश',
  languageNameSv: 'स्वीडिश',

  // --- Purchase / Restore ---
  restore: 'खरीदारी पुनर्स्थापित करें',
  purchaseSuccess: 'Pro प्लान अब सक्रिय है।',
  purchaseFailed: 'खरीदारी विफल रही। कृपया बाद में पुनः प्रयास करें।',
  restoreSuccess: 'खरीदारी इतिहास पुनर्स्थापित हो गया।',
  restoreNotFound: 'पुनर्स्थापित करने के लिए कोई खरीदारी नहीं मिली।',
  restoreFailed: 'खरीदारी पुनर्स्थापित करने में विफल।',
  restoreDesc: 'इस खाते से की गई खरीदारी पुनर्स्थापित करें।',

  // --- Pro / Paywall ---
  proTitle: 'Pro में अपग्रेड करें',
  proPlanFreeTitle: 'निःशुल्क',
  proPlanMonthlyTitle: 'मासिक',
  proPlanYearlyTitle: 'वार्षिक',
  proPlanYearlyBadge: 'सबसे किफायती',
  proBadgeShort: 'PRO',
  priceFree: '₹0 / हमेशा के लिए',
  priceLoading: 'लोड हो रहा है...',
  priceUnavailable: 'अनुपलब्ध',
  proCtaYearly: 'वार्षिक प्लान शुरू करें',
  proCtaMonthly: 'मासिक प्लान शुरू करें',
  proCtaStayFree: 'निःशुल्क जारी रखें',
  proFinePrint:
    'सदस्यता स्वचालित रूप से नवीनीकृत होती है। आप अपने खाता सेटिंग्स में कभी भी रद्द कर सकते हैं।',

  proPlanLifetimeTitle: 'आजीवन',
  proPlanLifetimeBadge: 'एकमुश्त',
  proCtaLifetime: 'आजीवन खरीदें',
  proLifetimeFinePrint: 'एकमुश्त खरीद। कोई स्वत: नवीकरण नहीं।',

  // --- Legal ---
  legalSectionTitle: 'कानूनी जानकारी',
  legalPrivacyPolicyLabel: 'गोपनीयता नीति',
  legalTermsOfUseLabel: 'उपयोग की शर्तें (EULA)',

  // --- Errors ---
  errorLoadFailed: 'डेटा लोड करने में विफल।',
  errorSaveFailed: 'सहेजने में विफल।',
  errorDeleteFailed: 'हटाने में विफल।',

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
export default hi;
