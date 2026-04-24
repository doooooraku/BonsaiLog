import type { TranslationKey } from './en';

const tr: Partial<Record<TranslationKey, string>> = {
  // --- Common UI ---
  ok: 'Tamam',
  cancel: 'İptal',
  save: 'Kaydet',
  delete: 'Sil',
  create: 'Oluştur',
  close: 'Kapat',
  done: 'Bitti',
  loading: 'Yükleniyor...',
  retry: 'Tekrar dene',
  error: 'Hata',

  // --- Settings ---
  settings: 'Ayarlar',
  language: 'Dil',
  theme: 'Tema',
  version: 'Uygulama sürümü',
  haptics: 'Titreşim',
  sound: 'Ses',

  // --- Language selector ---
  languageChange: 'Dili değiştir',
  currentLanguage: 'Mevcut',
  languageNameEn: 'İngilizce',
  languageNameJa: 'Japonca',
  languageNameFr: 'Fransızca',
  languageNameEs: 'İspanyolca',
  languageNameDe: 'Almanca',
  languageNameIt: 'İtalyanca',
  languageNamePt: 'Portekizce',
  languageNameRu: 'Rusça',
  languageNameZhHans: 'Çince (Basitleştirilmiş)',
  languageNameZhHant: 'Çince (Geleneksel)',
  languageNameKo: 'Korece',
  languageNameHi: 'Hintçe',
  languageNameId: 'Endonezce',
  languageNameTh: 'Tayca',
  languageNameVi: 'Vietnamca',
  languageNameTr: 'Türkçe',
  languageNameNl: 'Felemenkçe',
  languageNamePl: 'Lehçe',
  languageNameSv: 'İsveççe',

  // --- Purchase / Restore ---
  restore: 'Satın alımları geri yükle',
  purchaseSuccess: 'Pro plan artık aktif.',
  purchaseFailed: 'Satın alma başarısız. Lütfen daha sonra tekrar deneyin.',
  restoreSuccess: 'Satın alma geçmişi geri yüklendi.',
  restoreNotFound: 'Geri yüklenecek satın alma bulunamadı.',
  restoreFailed: 'Satın alımlar geri yüklenemedi.',
  restoreDesc: 'Bu hesapla yapılan satın alımları geri yükleyin.',

  // --- Pro / Paywall ---
  proTitle: "Pro'ya yükselt",
  proPlanFreeTitle: 'Ücretsiz',
  proPlanMonthlyTitle: 'Aylık',
  proPlanYearlyTitle: 'Yıllık',
  proPlanYearlyBadge: 'En avantajlı',
  proBadgeShort: 'PRO',
  priceFree: '₺0 / sonsuza kadar',
  priceLoading: 'Yükleniyor...',
  priceUnavailable: 'Kullanılamıyor',
  proCtaYearly: 'Yıllık planı başlat',
  proCtaMonthly: 'Aylık planı başlat',
  proCtaStayFree: 'Ücretsiz kal',
  proFinePrint:
    'Abonelikler otomatik olarak yenilenir. Hesap ayarlarınızdan istediğiniz zaman iptal edebilirsiniz.',

  proPlanLifetimeTitle: 'Ömür boyu',
  proPlanLifetimeBadge: 'Tek seferlik',
  proCtaLifetime: 'Ömür Boyu Satın Al',
  proLifetimeFinePrint: 'Tek seferlik satın alma. Otomatik yenileme yok.',

  // --- Legal ---
  legalSectionTitle: 'Yasal',
  legalPrivacyPolicyLabel: 'Gizlilik Politikası',
  legalTermsOfUseLabel: 'Kullanım Koşulları (EULA)',

  // --- Errors ---
  errorLoadFailed: 'Veri yüklenemedi.',
  errorSaveFailed: 'Kaydedilemedi.',
  errorDeleteFailed: 'Silinemedi.',
};

export default tr;
