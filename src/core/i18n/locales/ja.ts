import type { TranslationKey } from './en';

const ja: Partial<Record<TranslationKey, string>> = {
  // --- Common UI ---
  ok: 'OK',
  cancel: 'キャンセル',
  save: '保存',
  delete: '削除',
  create: '作成',
  close: '閉じる',
  done: '完了',
  loading: '読み込み中...',
  retry: 'リトライ',
  error: 'エラー',

  // --- Settings ---
  settings: '設定',
  language: '言語',
  theme: 'テーマ',
  version: 'アプリバージョン',
  haptics: '触覚フィードバック',
  sound: 'サウンド',

  // --- Language selector ---
  languageChange: '言語を変更',
  currentLanguage: '現在',
  languageNameEn: '英語',
  languageNameJa: '日本語',
  languageNameFr: 'フランス語',
  languageNameEs: 'スペイン語',
  languageNameDe: 'ドイツ語',
  languageNameIt: 'イタリア語',
  languageNamePt: 'ポルトガル語',
  languageNameRu: 'ロシア語',
  languageNameZhHans: '中国語（簡体字）',
  languageNameZhHant: '中国語（繁体字）',
  languageNameKo: '韓国語',
  languageNameHi: 'ヒンディー語',
  languageNameId: 'インドネシア語',
  languageNameTh: 'タイ語',
  languageNameVi: 'ベトナム語',
  languageNameTr: 'トルコ語',
  languageNameNl: 'オランダ語',
  languageNamePl: 'ポーランド語',
  languageNameSv: 'スウェーデン語',

  // --- Purchase / Restore ---
  restore: '購入を復元',
  purchaseSuccess: 'Proプランが有効になりました。',
  purchaseFailed: '購入に失敗しました。後でもう一度お試しください。',
  restoreSuccess: '購入履歴を復元しました。',
  restoreNotFound: '復元可能な購入が見つかりませんでした。',
  restoreFailed: '購入の復元に失敗しました。',
  restoreDesc: 'このアカウントで行った購入を復元します。',

  // --- Pro / Paywall ---
  proTitle: 'Proにアップグレード',
  proPlanFreeTitle: '無料',
  proPlanMonthlyTitle: '月額',
  proPlanYearlyTitle: '年額',
  proPlanYearlyBadge: '最もお得',
  proBadgeShort: 'PRO',
  priceFree: '¥0 / 永久',
  priceLoading: '読み込み中...',
  priceUnavailable: '利用不可',
  proCtaYearly: '年額プランを開始',
  proCtaMonthly: '月額プランを開始',
  proCtaStayFree: '無料で続ける',
  proFinePrint:
    'サブスクリプションは自動更新されます。アカウント設定からいつでもキャンセルできます。',

  proPlanLifetimeTitle: '買い切り',
  proPlanLifetimeBadge: '一度払い',
  proCtaLifetime: '買い切りで購入',
  proLifetimeFinePrint: '一度の購入で永久に利用できます。自動更新はありません。',

  // --- Legal ---
  legalSectionTitle: '法的情報',
  legalPrivacyPolicyLabel: 'プライバシーポリシー',
  legalTermsOfUseLabel: '利用規約（EULA）',

  // --- Errors ---
  errorLoadFailed: 'データの読み込みに失敗しました。',
  errorSaveFailed: '保存に失敗しました。',
  errorDeleteFailed: '削除に失敗しました。',
};

export default ja;
