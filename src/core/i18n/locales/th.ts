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
};

export default th;
