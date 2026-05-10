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
};

/**
 * mockup v1.0 全画面の撮影リスト。
 *
 * 02-Home.html (23 画面) + 01-Onboarding.html + 04-Export.html + 05-Monetization.html
 * の主要画面を網羅。
 *
 * 注: BottomSheet 内部スクロール (mockup `05A 作業記録・種別選択 (FAB)` 等で BottomSheet が
 * scrollable) は本実装では上端のスクショのみ取得。スクロール下半分の撮影は別 Issue で対応
 * (現状の Playwright element.screenshot は viewport 内のみ撮影、内部 scrollable 領域は
 * 動的な scrollTop 操作 + 複数撮影が必要)。
 */
export const MOCKUP_SCREENSHOTS: readonly MockupScreenshot[] = [
  // === 02-Home.html (Home / 詳細 / Care 専用画面) ===
  {
    id: 'bonsai-tab',
    html: '02-Home.html',
    selector: '[data-screen-label="01 Home"]',
    description: '盆栽タブ通常表示 (BonsaiCard リスト + フィルタタブ + FAB)',
  },
  {
    id: 'bonsai-select-mode',
    html: '02-Home.html',
    selector: '[data-screen-label="01a Home 選択モード"]',
    description: '盆栽タブ複数選択モード (チェックマーク + SelectionToolbar)',
  },
  {
    id: 'bonsai-tag-add',
    html: '02-Home.html',
    selector: '[data-screen-label="01b タグ追加モーダル"]',
    description: 'タグ追加モーダル',
  },
  {
    id: 'home-bulk-sched-work',
    html: '02-Home.html',
    selector: '[data-screen-label="01c 一括予定・作業選択"]',
    description: '一括予定追加 作業選択 BottomSheet',
  },
  {
    id: 'home-bulk-sched-date',
    html: '02-Home.html',
    selector: '[data-screen-label="01d 一括予定・日付"]',
    description: '一括予定追加 日付選択 BottomSheet',
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
  },
  {
    id: 'species-picker',
    html: '02-Home.html',
    selector: '[data-screen-label="04 樹種ピッカー"]',
    description: '樹種ピッカー BottomSheet',
  },
  {
    id: 'style-picker',
    html: '02-Home.html',
    selector: '[data-screen-label="04b 樹形ピッカー"]',
    description: '樹形ピッカー BottomSheet',
  },
  {
    id: 'bonsai-detail-history',
    html: '02-Home.html',
    selector: '[data-screen-label="05 詳細 作業履歴（初期タブ）"]',
    description: '盆栽詳細 作業履歴タブ (Hero + 3 Tabs 初期表示)',
  },
  {
    id: 'work-picker',
    html: '02-Home.html',
    selector: '[data-screen-label="05a 作業記録・種別選択（FAB）"]',
    description: '作業記録 種別選択 BottomSheet (14 作業 grid)',
  },
  {
    id: 'work-log-confirm',
    html: '02-Home.html',
    selector: '[data-screen-label="05b 作業記録・入力"]',
    description: '作業記録 詳細入力 BottomSheet',
  },
  {
    id: 'bonsai-detail-timeline',
    html: '02-Home.html',
    selector: '[data-screen-label="06 詳細 作業予定（水やり折りたたみ）"]',
    description: '盆栽詳細 作業予定タブ (連続水やり折りたたみ)',
  },
  {
    id: 'bonsai-detail-add-action',
    html: '02-Home.html',
    selector: '[data-screen-label="06a 予定追加・作業選択"]',
    description: '予定追加 作業選択 BottomSheet',
  },
  {
    id: 'bonsai-detail-add-date',
    html: '02-Home.html',
    selector: '[data-screen-label="06b 予定追加・日付"]',
    description: '予定追加 日付選択 BottomSheet',
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
  },
  {
    id: 'plan-tab',
    html: '02-Home.html',
    selector: '[data-screen-label="10 ケア 作業予定カレンダー"]',
    description: '予定タブ Calendar (月選択 + Day grid + 当日リスト)',
  },
  {
    id: 'wiring-list',
    html: '02-Home.html',
    selector: '[data-screen-label="11 ケア 針金がけ一覧"]',
    description: '針金がけ一覧 (装着中 wiring + 外し予定週数)',
  },
  {
    id: 'care-search',
    html: '02-Home.html',
    selector: '[data-screen-label="12 ケア 検索"]',
    description: '盆栽検索 (Search-as-Header + tag chip + match highlight)',
  },

  // === 01-Onboarding.html ===
  {
    id: 'onboarding-welcome',
    html: '01-Onboarding.html',
    selector: '[data-screen-label="02 Welcome"]',
    description: 'オンボーディング Welcome (3 価値訴求 + はじめる CTA)',
  },

  // === 05-Monetization.html ===
  {
    id: 'paywall',
    html: '05-Monetization.html',
    selector: '[data-screen-label="01 Paywall Modal"]',
    description: 'Paywall モーダル (Header BonsaiLog Pro + 比較表 + プラン CTA)',
  },
  {
    id: 'settings-tab',
    html: '05-Monetization.html',
    selector: '[data-screen-label="02 設定"]',
    description: '設定タブ (8 セクション: テーマ/Pro/通知/バックアップ/...)',
  },
];
