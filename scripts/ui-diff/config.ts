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
  'bonsai-detail': {
    id: 'bonsai-detail',
    description:
      '盆栽詳細 (Hero 280h photo + gradient + name overlay + DetailHeader + 3 Tabs: 作業履歴 / 予定タイムライン / 基本情報)',
    appFlow: 'maestro/flows/ui-diff/bonsai-detail.yml',
    designHtml: '02-Home.html',
    designSelector: '[data-screen-label="05 詳細 作業履歴（初期タブ）"]',
    notes:
      'ADR-0020 §Notes Amended (2026-05-09、写真タブ廃止 + basic タブ追加) / detail-screens.jsx BonsaiDetailScreen / app/(tabs)/bonsai/[id]/index.tsx / mockups v1.0 (PR #269)。前提: テスト盆栽 1 件以上登録済 (新規インストールでは盆栽カード無し → flow timeout)。Detail Tabs 名は A4 リファクタ完了後 (作業履歴 / 予定タイムライン / 基本情報) を可視待ちアンカーに使用。',
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
  // PoC 安定後にユーザーと相談して順次追加 (ADR-0020 §Decision §3-§10):
  // 'find-tab':           care-screens.jsx SearchScreen
  // 'settings-tab':       monetization-screens.jsx Settings*
  // 'paywall':            monetization-screens.jsx PaywallScreen
  // 'work-log-confirm':   care-screens.jsx WorkLogConfirmSheet
};

// OpenDesign 採用版モックアップ (mockups v1.0、PR #269 取り込み、本リポジトリ内、凍結保管)。
// 旧: '/mnt/c/Users/doooo/Downloads/BonsaiLog_template' (ClaudeDesign、ADR-0020 ベース)。
// 新: docs/mockups/v1.0/wireframes/ (OpenDesign、ADR-0021 Notes Amended で切替、PR #269)。
export const DESIGN_ROOT = path.join(REPO_ROOT, 'docs/mockups/v1.0/wireframes');

// 出力ルート (リポジトリルートからの相対パス、.gitignore 済)
export const OUT_ROOT = 'scripts/ui-diff/out';
