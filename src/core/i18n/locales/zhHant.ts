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
};

export default zhHant;
