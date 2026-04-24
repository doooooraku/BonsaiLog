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
};

export default zhHans;
