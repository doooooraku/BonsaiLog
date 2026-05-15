// scripts/ui-diff/config.ts
// 比較ペア定義 (ADR-0020 §Decision §3-§10 マッピング表 + ADR-0021 Notes Amended で
// OpenDesign 出力 = docs/mockups/v1.0/wireframes/ を Source of Reference として参照)。
// PoC は 'bonsai-tab' のみ。安定後にユーザーと相談して 1 画面ずつ追加する。

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(import.meta.url);
const hereDir = path.dirname(here);
const REPO_ROOT = path.resolve(hereDir, '../..');

export type ScreenPair = {
  id: string;
  description: string;
  appFlow: string; // maestro/flows/ui-diff/<id>.yml
  designHtml: string; // OpenDesign 採用版 HTML のファイル名 (DESIGN_ROOT 直下)
  designSelector: string; // PhoneShell の data-screen-label
  /**
   * mockup PNG ファイル名の override (docs/mockups/v1.0/screenshots/ 直下、拡張子込み)。
   * 省略時は capture-design.ts が `<id>.png` → `<id>-01.png` の順に解決する。
   * flow id と mockup ファイル名が一致しない場合に明示指定する (例: bonsai-detail → bonsai-detail-history-01.png)。
   */
  mockupFile?: string;
  notes?: string;
};

export const SCREEN_PAIRS: Record<string, ScreenPair> = {
  'bonsai-tab': {
    id: 'bonsai-tab',
    description:
      '盆栽タブ (盆栽手帳ヘッダー + フィルタタブ + BonsaiCard リスト + FAB + 4 タブバー)',
    appFlow: 'maestro/flows/ui-diff/bonsai-tab.yml',
    designHtml: '02-Home.html',
    designSelector: '[data-screen-label="01 Home"]',
    notes:
      'ADR-0020 §Decision §3 / home-screens.jsx HomeScreen / 4 タブ構成の起動時 redirect 先 (#249) / mockups v1.0 (PR #269、ADR-0021 Notes Amended で OpenDesign 出力を比較対象として参照)',
  },
  'onboarding-welcome': {
    id: 'onboarding-welcome',
    description:
      'オンボーディング Welcome 画面 (タイトル「鉢 1 本ずつ、一生分。」+ 3 価値訴求 + 「はじめる」CTA + アカウント不要補助)',
    appFlow: 'maestro/flows/ui-diff/onboarding-welcome.yml',
    designHtml: '01-Onboarding.html',
    designSelector: '[data-screen-label="02 Welcome"]',
    notes:
      'ADR-0020 §Notes §画面マップ / ADR-0018 (オンボ統合フロー、Welcome 文言採用) / screens.jsx WelcomeScreen / app/onboarding/welcome.tsx / mockups v1.0 (PR #269、ADR-0021 Notes Amended で OpenDesign 出力を比較対象として参照)。前提: アプリ onboarding.completed=false 状態 (新規インストール / 「チュートリアルを再表示」reset 済)。',
  },
  'onboarding-language': {
    id: 'onboarding-language',
    description:
      'オンボーディング 言語選択画面 (Welcome → 「はじめる」 tap で表示、19 言語 picker)',
    appFlow: 'maestro/flows/ui-diff/onboarding-language.yml',
    designHtml: '01-Onboarding.html',
    designSelector: '[data-screen-label="03 言語"]',
    mockupFile: 'onboarding-language-01.png',
    notes:
      'ADR-0018 / app/onboarding/language.tsx / mockups v1.0。前提: Welcome 完了後の言語選択画面、testID e2e_onboarding_lang_ja + e2e_onboarding_lang_next で可視待ち。',
  },
  'onboarding-notification': {
    id: 'onboarding-notification',
    description:
      'オンボーディング 通知 (tut5) 画面 (Welcome → Language → Next で表示、bell icon + 文言 + 通知を有効にする CTA + あとで skip)',
    appFlow: 'maestro/flows/ui-diff/onboarding-notification.yml',
    designHtml: '01-Onboarding.html',
    designSelector: '[data-screen-label="06 NOTIFICATION"]',
    mockupFile: 'onboarding-notification.png',
    notes:
      'ADR-0018 / ADR-0020 §10 (Onboarding 6 画面) / screens.jsx NotificationScreen / app/onboarding/tut/[step].tsx (tut5、ADR-0020 v1.x-1 改訂で TUTORIAL_STEPS 順序を tut5 → tut1 → tut2 に再編、Issue #526 真因確定済)。前提: Welcome 完了 + Language ja 選択完了 → tut5 (Notification) 画面、testID e2e_onboarding_tut_next_tut5 + e2e_onboarding_tut_skip_tut5 で可視待ち。',
  },
  'bonsai-detail': {
    id: 'bonsai-detail',
    description:
      '盆栽詳細 (Hero 280h photo + gradient + name overlay + DetailHeader + 3 Tabs: 作業履歴 / 予定タイムライン / 基本情報)',
    appFlow: 'maestro/flows/ui-diff/bonsai-detail.yml',
    designHtml: '02-Home.html',
    designSelector: '[data-screen-label="05 詳細 作業履歴（初期タブ）"]',
    mockupFile: 'bonsai-detail-history-01.png',
    notes:
      'ADR-0020 §Notes Amended (2026-05-09、写真タブ廃止 + basic タブ追加) / detail-screens.jsx BonsaiDetailScreen / app/(tabs)/bonsai/[id]/index.tsx / mockups v1.0 (PR #269)。前提: テスト盆栽 1 件以上登録済 (新規インストールでは盆栽カード無し → flow timeout)。Detail Tabs 名は A4 リファクタ完了後 (作業履歴 / 予定タイムライン / 基本情報) を可視待ちアンカーに使用。',
  },
  'bonsai-detail-basic': {
    id: 'bonsai-detail-basic',
    description: '盆栽詳細 基本情報タブ (default 作業履歴 → 基本情報切替後の form 表示)',
    appFlow: 'maestro/flows/ui-diff/bonsai-detail-basic.yml',
    designHtml: '02-Home.html',
    designSelector: '[data-screen-label="06 詳細 基本情報"]',
    mockupFile: 'bonsai-detail-basic-01.png',
    notes:
      'Issue #510 Phase 1 (bonsai-detail 他タブ R-25 評価) / detail-screens.jsx BonsaiDetailScreen 基本情報タブ / app/(tabs)/bonsai/[id]/index.tsx の activeTab=basic 状態 / mockups v1.0。前提: bonsai-detail.yml と同経路 + 末尾で e2e_detail_tab_basic tap で切替、testID 経由で 2 回反復 2/2 PASS。',
  },
  'bonsai-detail-timeline': {
    id: 'bonsai-detail-timeline',
    description: '盆栽詳細 作業予定タブ (default 作業履歴 → 作業予定切替後の timeline list)',
    appFlow: 'maestro/flows/ui-diff/bonsai-detail-timeline.yml',
    designHtml: '02-Home.html',
    designSelector: '[data-screen-label="07 詳細 作業予定"]',
    mockupFile: 'bonsai-detail-timeline-01.png',
    notes:
      'Issue #510 Phase 2 (bonsai-detail 他タブ R-25 評価) / detail-screens.jsx BonsaiDetailScreen 作業予定タブ / app/(tabs)/bonsai/[id]/index.tsx の activeTab=timeline 状態 / mockups v1.0。前提: bonsai-detail.yml と同経路 + 末尾で e2e_detail_tab_timeline tap で切替、testID 経由で 2 回反復 2/2 PASS。',
  },
  'species-picker': {
    id: 'species-picker',
    description: '樹種選択 modal (ADR-0024 Notes Amended 2026-05-15 で formSheet → modal 化)',
    appFlow: 'maestro/flows/ui-diff/species-picker.yml',
    designHtml: '02-Home.html',
    designSelector: '[data-screen-label="03b 樹種を選ぶ"]',
    mockupFile: 'species-picker.png',
    notes:
      'ADR-0024 Notes Amended 2026-05-15 / SpeciesPickerScreen / app/(modals)/species-picker.tsx (modal、formSheet 全廃) / mockups v1.0。前提: 盆栽タブ Empty CTA → BonsaiCreate → 樹種 row tap で modal 表示、Issue #522 完全解消。',
  },
  'work-picker': {
    id: 'work-picker',
    description:
      '作業選択 formSheet (bonsai detail 履歴タブ FAB tap で表示、ADR-0024 g2 PoC flow 転用)',
    appFlow: 'maestro/flows/ui-diff/work-picker.yml',
    designHtml: '02-Home.html',
    designSelector: '[data-screen-label="04 作業を選ぶ"]',
    mockupFile: 'work-picker-01.png',
    notes:
      'ADR-0024 g2 / WorkPickerScreen / app/(modals)/work-picker.tsx (formSheet、modal 親なし、Issue #522 影響なし想定) / mockups v1.0。前提: bonsai detail → 履歴タブ FAB tap で formSheet 表示、testID e2e_work_picker_screen + e2e_work_picker_grid で可視待ち。',
  },
  'work-log-confirm': {
    id: 'work-log-confirm',
    description: '作業記録確認 formSheet (work-picker → 水やり tap で表示、formSheet → formSheet)',
    appFlow: 'maestro/flows/ui-diff/work-log-confirm.yml',
    designHtml: '02-Home.html',
    designSelector: '[data-screen-label="05 作業を記録"]',
    mockupFile: 'work-log-confirm-01.png',
    notes:
      'ADR-0024 g2 / WorkLogConfirmScreen / app/(modals)/work-log-confirm.tsx / mockups v1.0。前提: work-picker → e2e_work_picker_watering tap で formSheet 表示、formSheet → formSheet で Issue #522 影響なし想定。',
  },
  'plan-tab': {
    id: 'plan-tab',
    description:
      '予定タブ (TabBar「予定」遷移先、SearchHeader + 月選択 + DOW header + 5〜6 週カレンダーグリッド + 当日/選択日リスト + 針金がけ一覧リンク)',
    appFlow: 'maestro/flows/ui-diff/plan-tab.yml',
    designHtml: '02-Home.html',
    designSelector: '[data-screen-label="10 ケア 作業予定カレンダー"]',
    notes:
      'ADR-0020 §Notes §画面マップ row 14 / care-screens.jsx CalendarScreen / app/(tabs)/plan/index.tsx (Phase 5 整合実装済) / mockups v1.0 (PR #269、ADR-0021 Notes Amended で OpenDesign 出力を比較対象として参照)。前提: 盆栽タブ起動完了後 TabBar「予定」をタップして遷移、testID e2e_plan_screen で可視待ち。',
  },
  'wiring-list': {
    id: 'wiring-list',
    description:
      '針金がけ一覧 (装着中の wiring event 一覧 + 装着期間 + scheduled unwire 週数、PR #322-#324 で mockup v1.0 整合済)',
    appFlow: 'maestro/flows/ui-diff/wiring-list.yml',
    designHtml: '02-Home.html',
    designSelector: '[data-screen-label="11 ケア 針金がけ一覧"]',
    notes:
      'ADR-0020 §Notes §画面マップ row 15 (整合済) / care-screens.jsx WiringListScreen / app/(tabs)/plan/wiring.tsx / mockups v1.0 (PR #269)。前提: 盆栽タブ → 予定タブ → 針金がけ一覧リンクで遷移、testID e2e_wiring_list_screen で可視待ち。',
  },
  'watering-heatmap': {
    id: 'watering-heatmap',
    description:
      '個別盆栽の水やり履歴ヒートマップ (30/90/365 切替セグメント + ヒートマップ 4 段階濃淡 + 4 サマリー: 連続記録 / 過去 N 日記録日数 / 過去 N 日記録回数 / 2 回の日)',
    appFlow: 'maestro/flows/ui-diff/watering-heatmap.yml',
    designHtml: '02-Home.html',
    designSelector: '[data-screen-label="09 ケア 水やり履歴ヒートマップ"]',
    notes:
      'ADR-0020 §Notes §画面マップ row 13 / care-screens-v2.jsx HeatmapScreen / app/(tabs)/bonsai/[id]/watering.tsx (Phase 3 SS 222921 整合実装済) / mockups v1.0 (PR #269)。前提: 盆栽タブ → 盆栽カードタップ → 詳細画面 → 水やり履歴リンク (testID e2e_open_watering_history) で遷移、testID e2e_bonsai_watering_screen で可視待ち。テスト盆栽 1 件以上必要。',
  },
  'settings-tab': {
    id: 'settings-tab',
    description:
      '設定タブ (TabBar「設定」遷移先、テーマ / Pro / 通知 / バックアップ / アーカイブ / 削除 / 法令 / バージョン の 8 セクション、PR #308/#329 で部分整合済、本格 8 セクションは Issue #330)',
    appFlow: 'maestro/flows/ui-diff/settings-tab.yml',
    designHtml: '05-Monetization.html',
    designSelector: '[data-screen-label="02 設定"]',
    notes:
      'ADR-0020 §Notes §画面マップ row 18 / monetization-screens.jsx SettingsScreen / app/(tabs)/settings/index.tsx (Phase 7 部分整合済 PR #308/#329、本格 8 セクション分離は Issue #330) / mockups v1.0 (PR #269)。前提: 盆栽タブ起動完了後 TabBar「設定」をタップして遷移、testID e2e_settings_screen で可視待ち。データ依存なし。',
  },
  paywall: {
    id: 'paywall',
    description:
      'Paywall モーダル (Header「BonsaiLog Pro」中央 + 比較表 + プラン CTA、PR #332-#334 で部分整合済、比較表 8 行 + プラン CTA は Issue #335)',
    appFlow: 'maestro/flows/ui-diff/paywall.yml',
    designHtml: '05-Monetization.html',
    designSelector: '[data-screen-label="01 Paywall Modal"]',
    notes:
      'ADR-0020 §Notes §画面マップ row 17 / monetization-screens.jsx PaywallScreen / src/features/pro/PaywallScreen.tsx + app/pro.tsx (薄ラッパー) / mockups v1.0 (PR #269)。前提: 盆栽タブ起動完了後 TabBar「設定」→「Proにアップグレード」(testID e2e_open_paywall) をタップして遷移、testID e2e_paywall_screen で可視待ち。R-28 ADR-0009 課金ロジック (RevenueCat 月額/年額/Lifetime) 維持厳守。',
  },
  'look-back-tab': {
    id: 'look-back-tab',
    description:
      'ふりかえりタブ Hub (TabBar「ふりかえり」遷移先、CareHub 3 カード: 水やり履歴 / 針金がけ一覧 / 盆栽を検索)',
    appFlow: 'maestro/flows/ui-diff/look-back-tab.yml',
    designHtml: '02-Home.html',
    designSelector: '[data-screen-label="08 ふりかえり Hub"]',
    mockupFile: 'care-hub.png',
    notes:
      'ADR-0020 §Decision §7 Notes Amended (2026-05-10、PR #358) / care-screens.jsx CareHubScreen L1576-1719 / app/(tabs)/look-back/index.tsx (T1-8c PR #362) / mockups v1.0 (PR #269)。前提: 盆栽タブ起動完了後 TabBar「ふりかえり」をタップして遷移、testID e2e_look_back_hub で可視待ち。データ依存なし。',
  },
  'look-back-search': {
    id: 'look-back-search',
    description:
      'ふりかえり > 盆栽検索 sub-route (検索 input + 検索履歴 chip + タグ chip + 全盆栽から検索結果ハイライト)',
    appFlow: 'maestro/flows/ui-diff/look-back-search.yml',
    designHtml: '02-Home.html',
    designSelector: '[data-screen-label="12 ケア 検索"]',
    mockupFile: 'care-search.png',
    notes:
      'ADR-0020 §Notes §画面マップ row 16 / care-screens.jsx SearchScreen / app/(tabs)/look-back/search.tsx (T1-8c PR #362、旧 find/index.tsx 385 行を sub-route 化) / mockups v1.0 (PR #269)。動線: TabBar ふりかえり → CareHub → 盆栽を検索カード → search 画面 (3 タップ、経路 2)。testID e2e_find_screen は移植時に維持。データ依存は検索結果のみ。',
  },
  'home-bulk-sched-work': {
    id: 'home-bulk-sched-work',
    description:
      '一括予定追加・作業選択 BottomSheet (盆栽カード長押し → SelectionToolbar「予定追加」→ BulkWorkPickerSheet、speciesOnly 除外、mode=schedule 専用)',
    appFlow: 'maestro/flows/ui-diff/home-bulk-sched-work.yml',
    designHtml: '02-Home.html',
    designSelector: '[data-screen-label="01c 一括予定・作業選択"]',
    notes:
      'ADR-0020 §Notes §画面マップ row 5 (HomeScreen) / care-screens-v2.jsx BulkWorkPickerSheet (mode=schedule) / src/features/event/BulkWorkPickerSheet.tsx (Phase 2 PR 実装) / mockups v1.0 (PR #269)。前提: テスト盆栽 1 件以上登録済 + 起動完了後に盆栽カード 1 件目を長押し → SelectionToolbar の「予定追加」をタップ、testID e2e_bulk_work_picker_sheet で可視待ち。',
  },
  'home-bulk-sched-date': {
    id: 'home-bulk-sched-date',
    description:
      '一括予定追加・日付選択 BottomSheet (BulkWorkPickerSheet で作業選択 → BulkScheduleDateSheet、カレンダー grid + 通知トグル + N件にまとめて予定追加 CTA)',
    appFlow: 'maestro/flows/ui-diff/home-bulk-sched-date.yml',
    designHtml: '02-Home.html',
    designSelector: '[data-screen-label="01d 一括予定・日付"]',
    notes:
      'ADR-0020 §Notes §画面マップ row 5 (HomeScreen) / care-screens-v2.jsx BulkScheduleDateSheet / src/features/event/BulkScheduleDateSheet.tsx (Phase 2 PR 実装) / mockups v1.0 (PR #269)。R-28 通知デフォルト OFF (principles.md v1.1 / ADR-0011 整合、mockup useState(true) は哲学逆走の残存と判断)。前提: 上記 home-bulk-sched-work から「肥料」(fertilizing) 等の作業を選択して遷移、testID e2e_bulk_schedule_date_sheet で可視待ち。calendar-grid-saturday-overflow.md (PR #318) の罠回避のため週行 + flex:1 採用。',
  },
  // 本セッション Tier 2 / photo UX / 横断水やり 主要 3 flow (Phase 4)
  'bonsai-create-sheet': {
    id: 'bonsai-create-sheet',
    description:
      '新規盆栽登録 BottomSheet (PR #377 Footer 固定 + PR #381 写真複数枚、写真 strip + 名前 + 樹種 + 樹形 + 取得日 + 樹齢 + 購入日 + タグ + メモ)',
    appFlow: 'maestro/flows/ui-diff/bonsai-create-sheet.yml',
    designHtml: '02-Home.html',
    designSelector: '[data-screen-label="03 新規登録 / 編集"]',
    mockupFile: 'bonsai-create-01.png',
    notes:
      'ADR-0020 §画面マップ row 4 / create-screens.jsx CreateBonsaiScreen / src/features/bonsai/BonsaiCreateSheet.tsx (PR #368 BottomSheet 化 → #370/#371 写真 → #372-#376 樹齢/メモ/購入日/Picker/タグ → #377 Footer 固定 → #381 写真複数枚) / mockups v1.0 「03 新規登録 / 編集」。前提: 盆栽タブ起動完了後 FAB タップで sheet open。',
  },
  'bonsai-detail-edit-sheet': {
    id: 'bonsai-detail-edit-sheet',
    description: '盆栽編集 BottomSheet (PR #378 編集モード対応、prefill 済 BonsaiCreateSheet)',
    appFlow: 'maestro/flows/ui-diff/bonsai-detail-edit-sheet.yml',
    designHtml: '02-Home.html',
    designSelector: '[data-screen-label="03 新規登録 / 編集"]',
    mockupFile: 'bonsai-create-01.png',
    notes:
      'ADR-0020 §画面マップ row 4 / create-screens.jsx CreateBonsaiScreen prefill モード / src/features/bonsai/BonsaiCreateSheet.tsx editingBonsai prop (PR #378) / mockups v1.0 「03 新規登録 / 編集」 (create / edit 兼用、mockup PNG は create と同じ) / 前提: テスト盆栽 1 件以上登録済 + 詳細画面 → 基本情報タブ → 編集ボタン (e2e_detail_basic_edit_button) で sheet open。',
  },
  'look-back-watering-history': {
    id: 'look-back-watering-history',
    description:
      '横断水やり履歴画面 (PR #379 ヒートマップ + PR #383 月別 Calendar + PR #384 日付タップ詳細、Issue #361)',
    appFlow: 'maestro/flows/ui-diff/look-back-watering-history.yml',
    designHtml: '02-Home.html',
    designSelector: '[data-screen-label="09 ケア 水やり履歴ヒートマップ"]',
    mockupFile: 'watering-heatmap.png',
    notes:
      'ADR-0021 / Issue #361 / app/(tabs)/look-back/watering-history.tsx (PR #379/#383/#384) / mockup HTML には横断版の対応 PhoneShell が無いため、暫定で個別盆栽 HeatmapScreen を比較対象に流用 (整合度低いが画面構造は近い)。【Phase 1.5-T2 確定】横断版 mockup HTML 追加までは「整合判定対象外」= skip-list.skipped 維持 (achieved に移動しない)。完全整合は将来の mockup HTML 追加 or 横断版 mockup 作成依頼で対応。ADR-0020 §画面マップ row 16 Notes Amended 参照。前提: watering events 1 件以上 (seed 済) + ふりかえりタブ → 水やり履歴カード tap で遷移。',
  },
  // PoC 安定後にユーザーと相談して順次追加 (ADR-0020 §Decision §3-§10):
  // 'work-log-confirm':   care-screens.jsx WorkLogConfirmSheet
};

// OpenDesign 採用版モックアップ (mockups v1.0、PR #269 取り込み、本リポジトリ内、凍結保管)。
// 旧: '/mnt/c/Users/doooo/Downloads/BonsaiLog_template' (ClaudeDesign、ADR-0020 ベース)。
// 新: docs/mockups/v1.0/wireframes/ (OpenDesign、ADR-0021 Notes Amended で切替、PR #269)。
export const DESIGN_ROOT = path.join(REPO_ROOT, 'docs/mockups/v1.0/wireframes');

// 出力ルート (リポジトリルートからの相対パス、.gitignore 済)
export const OUT_ROOT = 'scripts/ui-diff/out';
