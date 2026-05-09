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
  // PoC 安定後にユーザーと相談して順次追加 (ADR-0020 §Decision §3-§10):
  // 'bonsai-detail':      detail-screens.jsx Detail* (Hero 280h + 3 Tabs)
  // 'plan-tab':           care-screens.jsx CalendarScreen + WiringListScreen
  // 'find-tab':           care-screens.jsx SearchScreen
  // 'settings-tab':       monetization-screens.jsx Settings*
  // 'paywall':            monetization-screens.jsx PaywallScreen
  // 'onboarding-welcome': screens.jsx Welcome
  // 'watering-heatmap':   care-screens-v2.jsx HeatmapScreen
  // 'work-log-confirm':   care-screens.jsx WorkLogConfirmSheet
};

// OpenDesign 採用版モックアップ (mockups v1.0、PR #269 取り込み、本リポジトリ内、凍結保管)。
// 旧: '/mnt/c/Users/doooo/Downloads/BonsaiLog_template' (ClaudeDesign、ADR-0020 ベース)。
// 新: docs/mockups/v1.0/wireframes/ (OpenDesign、ADR-0021 Notes Amended で切替、PR #269)。
export const DESIGN_ROOT = path.join(REPO_ROOT, 'docs/mockups/v1.0/wireframes');

// 出力ルート (リポジトリルートからの相対パス、.gitignore 済)
export const OUT_ROOT = 'scripts/ui-diff/out';
