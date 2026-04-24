import type { TranslationKey } from './en';

const id: Partial<Record<TranslationKey, string>> = {
  // --- Common UI ---
  ok: 'OK',
  cancel: 'Batal',
  save: 'Simpan',
  delete: 'Hapus',
  create: 'Buat',
  close: 'Tutup',
  done: 'Selesai',
  loading: 'Memuat...',
  retry: 'Coba lagi',
  error: 'Kesalahan',

  // --- Settings ---
  settings: 'Pengaturan',
  language: 'Bahasa',
  theme: 'Tema',
  version: 'Versi Aplikasi',
  haptics: 'Getaran',
  sound: 'Suara',

  // --- Language selector ---
  languageChange: 'Ganti bahasa',
  currentLanguage: 'Saat ini',
  languageNameEn: 'Inggris',
  languageNameJa: 'Jepang',
  languageNameFr: 'Prancis',
  languageNameEs: 'Spanyol',
  languageNameDe: 'Jerman',
  languageNameIt: 'Italia',
  languageNamePt: 'Portugis',
  languageNameRu: 'Rusia',
  languageNameZhHans: 'Tionghoa (Sederhana)',
  languageNameZhHant: 'Tionghoa (Tradisional)',
  languageNameKo: 'Korea',
  languageNameHi: 'Hindi',
  languageNameId: 'Indonesia',
  languageNameTh: 'Thailand',
  languageNameVi: 'Vietnam',
  languageNameTr: 'Turki',
  languageNameNl: 'Belanda',
  languageNamePl: 'Polandia',
  languageNameSv: 'Swedia',

  // --- Purchase / Restore ---
  restore: 'Pulihkan pembelian',
  purchaseSuccess: 'Paket Pro kini aktif.',
  purchaseFailed: 'Pembelian gagal. Silakan coba lagi nanti.',
  restoreSuccess: 'Riwayat pembelian dipulihkan.',
  restoreNotFound: 'Tidak ada pembelian untuk dipulihkan.',
  restoreFailed: 'Gagal memulihkan pembelian.',
  restoreDesc: 'Pulihkan pembelian yang dilakukan dengan akun ini.',

  // --- Pro / Paywall ---
  proTitle: 'Upgrade ke Pro',
  proPlanFreeTitle: 'Gratis',
  proPlanMonthlyTitle: 'Bulanan',
  proPlanYearlyTitle: 'Tahunan',
  proPlanYearlyBadge: 'Paling hemat',
  proBadgeShort: 'PRO',
  priceFree: 'Rp0 / selamanya',
  priceLoading: 'Memuat...',
  priceUnavailable: 'Tidak tersedia',
  proCtaYearly: 'Mulai paket tahunan',
  proCtaMonthly: 'Mulai paket bulanan',
  proCtaStayFree: 'Tetap gratis',
  proFinePrint:
    'Langganan diperpanjang secara otomatis. Batalkan kapan saja di pengaturan akun Anda.',

  proPlanLifetimeTitle: 'Seumur Hidup',
  proPlanLifetimeBadge: 'Bayar sekali',
  proCtaLifetime: 'Beli Seumur Hidup',
  proLifetimeFinePrint: 'Pembelian sekali. Tidak ada perpanjangan otomatis.',

  // --- Legal ---
  legalSectionTitle: 'Hukum',
  legalPrivacyPolicyLabel: 'Kebijakan Privasi',
  legalTermsOfUseLabel: 'Ketentuan Penggunaan (EULA)',

  // --- Errors ---
  errorLoadFailed: 'Gagal memuat data.',
  errorSaveFailed: 'Gagal menyimpan.',
  errorDeleteFailed: 'Gagal menghapus.',
};

export default id;
