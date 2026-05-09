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
  // PoC 安定後にユーザーと相談して順次追加 (ADR-0020 §Decision §3-§10):
  // 'plan-tab':           care-screens.jsx CalendarScreen + WiringListScreen
  // 'find-tab':           care-screens.jsx SearchScreen
  // 'settings-tab':       monetization-screens.jsx Settings*
  // 'paywall':            monetization-screens.jsx PaywallScreen
  // 'watering-heatmap':   care-screens-v2.jsx HeatmapScreen
  // 'work-log-confirm':   care-screens.jsx WorkLogConfirmSheet
};

// OpenDesign 採用版モックアップ (mockups v1.0、PR #269 取り込み、本リポジトリ内、凍結保管)。
// 旧: '/mnt/c/Users/doooo/Downloads/BonsaiLog_template' (ClaudeDesign、ADR-0020 ベース)。
// 新: docs/mockups/v1.0/wireframes/ (OpenDesign、ADR-0021 Notes Amended で切替、PR #269)。
export const DESIGN_ROOT = path.join(REPO_ROOT, 'docs/mockups/v1.0/wireframes');

// 出力ルート (リポジトリルートからの相対パス、.gitignore 済)
export const OUT_ROOT = 'scripts/ui-diff/out';
