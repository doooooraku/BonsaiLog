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
};

export default vi;
