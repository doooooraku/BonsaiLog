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
};
export default th;
