// scripts/ui-diff/mockup-screenshots-config.ts
// T1-2 (Tier 1a): mockup v1.0 全画面のスクショ事前生成用 config。
// docs/mockups/v1.0/wireframes/<html> の各 PhoneShell ([data-screen-label="..."]) を
// chromium-headless でレンダリングし、docs/mockups/v1.0/screenshots/<id>.png に保存。
// git commit して再生成不要 (mockup は凍結保管、PR #269)。
//
// Related:
// - ADR-0020 §Notes §画面マップ (整合性レベル 2 判定の根拠スクショ)
// - docs/reference/integration-criteria.md (整合済 = レベル 2 以上)
// - .claude/recurrence-prevention.md R-29 (写経駆動開発 5 段階)

export type MockupScreenshot = {
  /** 出力ファイル名 (拡張子 .png は自動付与)、commit 後の path: docs/mockups/v1.0/screenshots/<id>.png */
  id: string;
  /** mockup HTML ファイル名 (DESIGN_ROOT 直下) */
  html: string;
  /** PhoneShell の data-screen-label 属性値 (mockup 02-Home.html の FLOW 配列の label と一致) */
  selector: string;
  /** 用途 (PR で参照する画面 ID と一致させる) */
  description: string;
  /**
   * 撮影モード (Issue #366 で追加):
   * - 'static' (default): PhoneShell 全体を 1 枚撮影 (内部 scroll なし or 短い画面)
   * - 'scrollable': PhoneShell 内の overflow:auto 領域 (BottomSheet 内 grid / Calendar / 8 セクション等) を
   *   scrollTop で順次動かして上端 / 中段 / 下端で複数撮影、出力 `<id>-01.png` `<id>-02.png` ...
   */
  mode?: 'static' | 'scrollable';
};

/**
 * mockup v1.0 全画面の撮影リスト (Issue #366 で「主要画面」→「全画面」に拡張)。
 *
 * 4 HTML × 全 PhoneShell (FLOW 配列の全 entry) を網羅:
 * - 02-Home.html: 23 画面 (Home / 詳細 / Care / Search / Calendar / 一括予定 / 作業記録 等)
 * - 01-Onboarding.html: 6 画面 (Splash / Welcome / Language / ATT / UMP / Notification)
 * - 04-Export.html: 6 画面 (Hub / Options / Generating / Share / PDF Single / PDF List)
 * - 05-Monetization.html: 6 画面 (Paywall / Settings / Backup / Archive / Archive Delete / Home+Ads)
 * 合計 41 画面。
 *
 * 撮影モード (Issue #366 で追加):
 * - 'static' (default): 短い画面、PhoneShell 全体を 1 枚撮影
 * - 'scrollable': BottomSheet 内 grid / Calendar / 8 セクション等で scrollTop を動かして複数撮影
 *   (出力 `<id>-01.png` `<id>-02.png` ...、generate-mockup-screenshots.ts captureScrollable 参照)
 *   scroll container が見つからない場合は static fallback で 1 枚撮影 (誤分類対策、警告ログ出力)。
 */
export const MOCKUP_SCREENSHOTS: readonly MockupScreenshot[] = [
  // === 02-Home.html (Home / 詳細 / Care 専用画面) ===
  {
    id: 'bonsai-tab',
    html: '02-Home.html',
    selector: '[data-screen-label="01 Home"]',
    description: '盆栽タブ通常表示 (BonsaiCard リスト + フィルタタブ + FAB)',
  },
  // ADR-0025 案 X 後 Sess8 PR-5 (2026-05-18): bonsai-select-mode 完全廃止 (user 真意「実機上不要」)
  {
    id: 'bonsai-tag-add',
    html: '02-Home.html',
    selector: '[data-screen-label="01b タグ追加モーダル"]',
    description: 'タグ追加モーダル',
    mode: 'scrollable',
  },
  {
    id: 'home-bulk-sched-work',
    html: '02-Home.html',
    selector: '[data-screen-label="01c 一括予定・作業選択"]',
    description: '一括予定追加 作業選択 BottomSheet',
    mode: 'scrollable',
  },
  {
    id: 'bonsai-empty',
    html: '02-Home.html',
    selector: '[data-screen-label="02 Home Empty"]',
    description: '盆栽タブ Empty State (盆栽 0 件)',
  },
  {
    id: 'bonsai-create',
    html: '02-Home.html',
    selector: '[data-screen-label="03 新規登録 / 編集"]',
    description: '新規盆栽登録 BottomSheet (写真 + 必須/任意 + 全 10 項目)',
    mode: 'scrollable',
  },
  {
    id: 'species-picker',
    html: '02-Home.html',
    selector: '[data-screen-label="04 樹種ピッカー"]',
    description: '樹種ピッカー BottomSheet',
    mode: 'scrollable',
  },
  {
    id: 'style-picker',
    html: '02-Home.html',
    selector: '[data-screen-label="04b 樹形ピッカー"]',
    description: '樹形ピッカー BottomSheet',
    mode: 'scrollable',
  },
  {
    id: 'bonsai-detail-history',
    html: '02-Home.html',
    selector: '[data-screen-label="05 詳細 作業履歴（初期タブ）"]',
    description: '盆栽詳細 作業履歴タブ (Hero + 3 Tabs 初期表示)',
    mode: 'scrollable',
  },
  {
    id: 'work-picker',
    html: '02-Home.html',
    selector: '[data-screen-label="05a 作業記録・種別選択（FAB）"]',
    description: '作業記録 種別選択 BottomSheet (14 作業 grid)',
    mode: 'scrollable',
  },
  {
    id: 'work-log-confirm',
    html: '02-Home.html',
    selector: '[data-screen-label="05b 作業記録・入力"]',
    description: '作業記録 詳細入力 BottomSheet',
    mode: 'scrollable',
  },
  {
    id: 'bonsai-detail-timeline',
    html: '02-Home.html',
    selector: '[data-screen-label="06 詳細 作業予定（水やり折りたたみ）"]',
    description: '盆栽詳細 作業予定タブ (連続水やり折りたたみ)',
    mode: 'scrollable',
  },
  {
    id: 'bonsai-detail-add-action',
    html: '02-Home.html',
    selector: '[data-screen-label="06a 予定追加・作業選択"]',
    description: '予定追加 作業選択 BottomSheet',
    mode: 'scrollable',
  },
  {
    id: 'bonsai-detail-add-date',
    html: '02-Home.html',
    selector: '[data-screen-label="06b 予定追加・日付"]',
    description: '予定追加 日付選択 BottomSheet',
    mode: 'scrollable',
  },
  {
    id: 'bonsai-detail-menu',
    html: '02-Home.html',
    selector: '[data-screen-label="06c 詳細 ・・・メニュー"]',
    description: '盆栽詳細 ・・・メニュー (Edit / PDF / Archive)',
  },
  {
    id: 'bonsai-detail-pdf-lock',
    html: '02-Home.html',
    selector: '[data-screen-label="06d PDF Pro ロック"]',
    description: 'PDF Pro ロックモーダル',
  },
  {
    id: 'bonsai-detail-basic',
    html: '02-Home.html',
    selector: '[data-screen-label="07 詳細 基本情報（編集兼用）"]',
    description: '盆栽詳細 基本情報タブ (CreateBonsai embed)',
    mode: 'scrollable',
  },
  {
    id: 'care-hub',
    html: '02-Home.html',
    selector: '[data-screen-label="08 ふりかえり Hub"]',
    description: 'ふりかえり Hub (3 カード: 水やり履歴 / 針金がけ一覧 / 盆栽を検索)',
  },
  {
    id: 'watering-heatmap',
    html: '02-Home.html',
    selector: '[data-screen-label="09 ケア 水やり履歴ヒートマップ"]',
    description: '水やり履歴ヒートマップ (30/90/365 + 4 サマリー)',
    mode: 'scrollable',
  },
  {
    id: 'plan-tab',
    html: '02-Home.html',
    selector: '[data-screen-label="10 ケア 作業予定カレンダー"]',
    description: '予定タブ Calendar (月選択 + Day grid + 当日リスト)',
    mode: 'scrollable',
  },
  {
    id: 'wiring-list',
    html: '02-Home.html',
    selector: '[data-screen-label="11 ケア 針金がけ一覧"]',
    description: '針金がけ一覧 (装着中 wiring + 外し予定週数)',
    mode: 'scrollable',
  },
  {
    id: 'care-search',
    html: '02-Home.html',
    selector: '[data-screen-label="12 ケア 検索"]',
    description: '盆栽検索 (Search-as-Header + tag chip + match highlight)',
  },

  // === 01-Onboarding.html (6 画面: Splash / Welcome / Language / ATT / UMP / Notification) ===
  {
    id: 'onboarding-splash',
    html: '01-Onboarding.html',
    selector: '[data-screen-label="01 Splash"]',
    description: 'オンボーディング Splash (起動時の盆栽手帳ロゴ画面)',
  },
  {
    id: 'onboarding-welcome',
    html: '01-Onboarding.html',
    selector: '[data-screen-label="02 Welcome"]',
    description: 'オンボーディング Welcome (3 価値訴求 + はじめる CTA)',
  },
  {
    id: 'onboarding-language',
    html: '01-Onboarding.html',
    selector: '[data-screen-label="03 Language Picker"]',
    description: 'オンボーディング 言語選択 (19 言語リスト)',
    mode: 'scrollable',
  },
  {
    id: 'onboarding-att',
    html: '01-Onboarding.html',
    selector: '[data-screen-label="04 ATT 説明（追跡について）"]',
    description: 'オンボーディング ATT 説明 (iOS 追跡許可ダイアログ前の説明画面)',
    mode: 'scrollable',
  },
  {
    id: 'onboarding-ump',
    html: '01-Onboarding.html',
    selector: '[data-screen-label="05 UMP 同意（EU/UK/CH のみ）"]',
    description: 'オンボーディング UMP 同意 (GDPR / EU/UK/CH のみ)',
    mode: 'scrollable',
  },
  {
    id: 'onboarding-notification',
    html: '01-Onboarding.html',
    selector: '[data-screen-label="06 Notification"]',
    description: 'オンボーディング 通知許可説明 (Bell + 文言)',
    mode: 'scrollable',
  },

  // === 04-Export.html (6 画面: Hub / Options / Generating / Share / PDF Single / PDF List) ===
  {
    id: 'export-hub',
    html: '04-Export.html',
    selector: '[data-screen-label="01 Export Hub"]',
    description: 'Export Hub (PDF / CSV / バックアップの選択画面)',
    mode: 'scrollable',
  },
  {
    id: 'export-options',
    html: '04-Export.html',
    selector: '[data-screen-label="02 Options Sheet"]',
    description: 'Export オプション BottomSheet (期間 / 範囲指定)',
    mode: 'scrollable',
  },
  {
    id: 'export-progress',
    html: '04-Export.html',
    selector: '[data-screen-label="03 Generating"]',
    description: 'Export 生成中 (progress 表示)',
  },
  {
    id: 'export-share',
    html: '04-Export.html',
    selector: '[data-screen-label="04 Share Sheet"]',
    description: 'Export 共有シート',
  },
  {
    id: 'export-pdf-single',
    html: '04-Export.html',
    selector: '[data-screen-label="05 PDF · Single"]',
    description: 'PDF 出力 (個別盆栽、Pro 機能)',
    mode: 'scrollable',
  },
  {
    id: 'export-pdf-list',
    html: '04-Export.html',
    selector: '[data-screen-label="06 PDF · List"]',
    description: 'PDF 出力 (盆栽一覧、Pro 機能)',
    mode: 'scrollable',
  },

  // === 05-Monetization.html (6 画面: Paywall / Settings / Backup / Archive / Archive Delete / Home+Ads) ===
  {
    id: 'paywall',
    html: '05-Monetization.html',
    selector: '[data-screen-label="01 Paywall Modal"]',
    description: 'Paywall モーダル (Header BonsaiLog Pro + 比較表 + プラン CTA)',
    mode: 'scrollable',
  },
  {
    id: 'settings-tab',
    html: '05-Monetization.html',
    selector: '[data-screen-label="02 設定"]',
    description: '設定タブ (8 セクション: テーマ/Pro/通知/バックアップ/...)',
    mode: 'scrollable',
  },
  {
    id: 'monetization-backup',
    html: '05-Monetization.html',
    selector: '[data-screen-label="03 バックアップ"]',
    description: 'バックアップ画面 (Free 提供、GDPR Art.20 整合)',
    mode: 'scrollable',
  },
  {
    id: 'monetization-archive',
    html: '05-Monetization.html',
    selector: '[data-screen-label="04 アーカイブ一覧"]',
    description: 'アーカイブ一覧 (削除した盆栽の復元 / 完全削除)',
    mode: 'scrollable',
  },
  {
    id: 'monetization-archive-delete',
    html: '05-Monetization.html',
    selector: '[data-screen-label="04a 完全削除 確認モーダル"]',
    description: '完全削除 確認モーダル (アーカイブ長押し → 確認)',
  },
  {
    id: 'monetization-home-ads',
    html: '05-Monetization.html',
    selector: '[data-screen-label="05 Home + 広告バナー"]',
    description: 'Home + AdBanner (Free プラン、最下部 INLINE_ADAPTIVE_BANNER)',
    mode: 'scrollable',
  },
];
