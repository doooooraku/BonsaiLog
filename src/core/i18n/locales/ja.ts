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

  // --- F-01 Bonsai (P2-01 PR-D) ---
  bonsaiTab: '盆栽',
  bonsaiListEmptyTitle: 'まだ盆栽が登録されていません',
  bonsaiListEmptyDesc: '下のボタンから最初の盆栽を登録しましょう。',
  bonsaiCreateNew: '盆栽を登録',
  bonsaiFieldName: '名前',
  bonsaiFieldNamePlaceholder: '木の名前 (例: 玄関の黒松)',
  bonsaiFieldSpecies: '樹種',
  bonsaiFieldSpeciesSearch: '樹種を検索…',
  bonsaiFieldStyle: '樹形',
  bonsaiFieldAcquiredAt: '取得日',
  bonsaiFieldUpdatedAt: '最終更新',
  bonsaiArchive: 'アーカイブ',
  bonsaiArchiveConfirmTitle: 'この盆栽をアーカイブしますか?',
  bonsaiArchiveConfirmDesc: '設定から後で復元できます。',
  bonsaiStyle_chokkan: '直幹',
  bonsaiStyle_moyogi: '模様木',
  bonsaiStyle_shakan: '斜幹',
  bonsaiStyle_kengai: '懸崖',
  bonsaiStyle_han_kengai: '半懸崖',
  bonsaiStyle_bunjingi: '文人木',
  bonsaiStyle_fukinagashi: '吹き流し',
  bonsaiStyle_sokan: '双幹',
  bonsaiStyle_kabudachi: '株立ち',
  bonsaiStyle_ishitsuki: '石付き',

  // --- F-08 Photos (P2-02 PR-C) ---
  bonsaiFieldPhotos: '写真',
  photoAddCta: '写真を追加',
  photoAddTitle: '写真を追加',
  photoAddCamera: 'カメラで撮影',
  photoAddLibrary: 'ライブラリから選ぶ',
  photoEmpty: 'まだ写真がありません。',
  photoLimitTitle: 'Free プランの上限です',
  photoLimitDesc: 'Free プランは盆栽 1 つにつき {count} 枚まで。Pro にすると無制限になります。',
  photoPermissionTitle: '許可が必要です',
  photoPermissionDesc: '設定からカメラと写真の利用を許可してください。',
  photoActionTitle: '写真の操作',
  photoActionSetCover: 'カバー写真にする',
  photoActionDelete: '写真を削除',
  photoDeleteConfirmTitle: 'この写真を削除しますか?',
  photoDeleteConfirmDesc: 'この操作は取り消せません。',

  // --- F-02 Events (P2-03 PR-D) ---
  eventsTitle: '作業履歴',
  eventLogCta: '作業を記録',
  eventTypePickerDesc: '何をしましたか?',
  eventEmpty: 'まだ記録がありません。',
  eventDeleteConfirmTitle: 'この記録をゴミ箱に移しますか?',
  eventDeleteConfirmDesc: 'ゴミ箱の記録は 30 日後に自動的に削除されます。',

  // --- F-05 気遣い型ポップアップ (Issue #25、ADR-0011) ---
  eventOverloadTitle: 'お知らせ',
  eventOverloadBody: 'この日は既に {count} 件の予定があります。無理のない範囲で進めてくださいね。',
  eventOverloadActionConfirm: 'そのまま登録',
  eventOverloadActionViewList: '一覧を見る',
  eventOverloadActionNeverShow: '今後表示しない',
  eventType_watering: '水やり',
  eventType_pruning: '剪定',
  eventType_wiring: '針金がけ',
  eventType_unwiring: '針金外し',
  eventType_repotting: '植替え',
  eventType_fertilizing: '施肥',
  eventType_pest_control: '防除・消毒',
  eventType_leaf_trimming: '葉刈り',
  eventType_defoliation: '葉抜き',
  eventType_deshoot: '芽摘み',
  eventType_candle_cut: '芽切り',
  eventType_moss_care: '苔の手入れ',
  eventType_position_change: '配置変更',

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

  // --- 設定セクション (F-05 通知 + F-11 お引っ越し) ---
  settingsNotificationSection: '通知設定',
  settingsEventOverloadToggle: '予定が多い時の確認ポップアップ',
  settingsEventOverloadToggleDesc:
    'ON にすると、同じ日に 6 件目の作業を記録するときに、無理のない範囲を確認するメッセージが出ます。',

  // --- F-11 Backup / Move (Issue #12, ADR-0007) ---
  settingsTitle: '設定',
  settingsBackupSection: 'お引っ越し',
  backupTitle: 'お引っ越し',
  backupExportTitle: 'バックアップを作成',
  backupExportDesc:
    '盆栽の記録・写真・作業履歴をひとつの ZIP ファイルにまとめます。共有メニューから iCloud Drive / Google Drive / メール / メッセージアプリへ送れます。',
  backupExportAction: 'バックアップを作成',
  backupExportSuccess: 'バックアップを作成しました。',
  backupExportFailed: 'バックアップの作成に失敗しました。',
  backupImportTitle: 'バックアップから復元',
  backupImportDesc:
    '以前作成した ZIP ファイルから復元します。新しい記録は追加されますが、既存の記録は変更されません。',
  backupImportAction: '復元する',
  backupImportWarningTitle: 'バックアップから復元しますか?',
  backupImportWarningBody:
    '新しい記録が既存のデータに追加されます。既存の記録は上書き・削除されません。',
  backupImportSuccess: '復元が完了しました。',
  backupImportSuccessDetail:
    '盆栽 {bonsai} 件、作業履歴 {events} 件、写真 {photos} 件を追加しました。',
  backupImportFailed: 'バックアップからの復元に失敗しました。',
  backupSchemaMismatchTitle: '対応していないバックアップ形式',
  backupSchemaMismatchBody:
    'このバックアップは別のバージョンで作成されています。同じバージョンのアプリで復元してください。',
  backupInvalidTitle: 'バックアップファイルが壊れています',
  backupInvalidBody:
    '選択したファイルは正しいバックアップではないか、データが欠けています。別のファイルを選んでください。',
  backupSizeLimitTitle: 'バックアップが大きすぎます',
  backupSizeLimitBody:
    '200 MB を超えるバックアップは共有できません。写真の枚数を減らして、もう一度お試しください。',
  backupShareUnavailableTitle: '共有を利用できません',
  backupShareUnavailableBody:
    'この端末では共有機能を利用できません。OS を最新にしてお試しください。',
  backupUnsupportedTitle: 'ご利用いただけません',
  backupUnsupportedBody: 'このプラットフォームではバックアップ機能はご利用いただけません。',
  backupEncryptionWarning:
    'バックアップは暗号化されません。クラウドに保存する場合は、ご自身で管理できる安全なフォルダに保管してください。',

  // --- F-10 エクスポート Phase A (events CSV、Pro 限定、ADR-0016) ---
  settingsExportSection: 'エクスポート',
  exportCsvTitle: '作業ログを CSV で出力',
  exportCsvDesc: 'すべての作業ログを CSV ファイルにエクスポートします (Pro 機能)。',
  exportCsvAction: 'CSV を出力',
  exportCsvSuccess: 'エクスポートが完了しました。',
  exportCsvSuccessDetail: '{count} 件の作業ログを書き出しました。',
  exportCsvFailed: 'エクスポートに失敗しました。',
  exportCsvShareTitle: 'BonsaiLog 作業ログ CSV',
  exportProRequiredTitle: 'Pro 機能',
  exportProRequiredBody:
    'CSV エクスポートは Pro メンバー向けの機能です。Pro にアップグレードするとご利用いただけます。',
  exportShareUnavailableTitle: '共有を利用できません',
  exportShareUnavailableBody:
    'この端末では共有を利用できません。OS をアップデートしてからお試しください。',

  // --- F-09 検索 (Phase A、ADR-0008 改訂) ---
  settingsSearchSection: '検索',
  searchAction: '検索する',
  searchDesc: '盆栽の名前と作業ログのメモを検索します。',
  searchPlaceholder: '検索...',
  searchEmpty: '見つかりませんでした。',
  searchBonsaiSection: '盆栽',
  searchEventSection: '作業ログ',

  // --- F-15 テーマ設定 (Phase A、ADR-0015) ---
  settingsThemeSection: '表示',
  settingsThemeSystem: 'システム',
  settingsThemeLight: 'ライト',
  settingsThemeDark: 'ダーク',

  // --- F-04 水やり履歴 (Phase A、ADR-0013) ---
  wateringSectionTitle: '水やり',
  wateringLastNoRecord: 'まだ水やりの記録がありません',
  wateringLastToday: '今日、水やりしました',
  wateringLastOneDay: '最後の水やりから 1 日',
  wateringLastSeveralDays: '最後の水やりから {days} 日',
  wateringLastManyDays: '最後の水やりから {days} 日',
  wateringLastOverYear: '最後の水やりから 1 年以上',
};

export default ja;
