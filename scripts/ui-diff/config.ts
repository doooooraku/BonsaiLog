// scripts/ui-diff/config.ts
// 比較ペア定義 (ADR-0020 §Decision §3-§10 マッピング表)。
// PoC は 'bonsai-tab' のみ。安定後にユーザーと相談して 1 画面ずつ追加する。

export type ScreenPair = {
  id: string;
  description: string;
  appFlow: string; // maestro/flows/ui-diff/<id>.yml
  designHtml: string; // ClaudeDesign 正本のファイル名 (DESIGN_ROOT 直下)
  designSelector: string; // PhoneShell の data-screen-label
  notes?: string;
};

export const SCREEN_PAIRS: Record<string, ScreenPair> = {
  'bonsai-tab': {
    id: 'bonsai-tab',
    description:
      '盆栽タブ (盆栽手帳ヘッダー + フィルタタブ + BonsaiCard リスト + FAB + 4 タブバー)',
    appFlow: 'maestro/flows/ui-diff/bonsai-tab.yml',
    designHtml: 'Home and Management Wireframes.html',
    designSelector: '[data-screen-label="01 Home"]',
    notes:
      'ADR-0020 §Decision §3 / home-screens.jsx HomeScreen / 4 タブ構成の起動時 redirect 先 (#249)',
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

// ClaudeDesign 正本の WSL パス (Windows: C:\Users\doooo\Downloads\BonsaiLog_template\)
export const DESIGN_ROOT = '/mnt/c/Users/doooo/Downloads/BonsaiLog_template';

// 出力ルート (リポジトリルートからの相対パス、.gitignore 済)
export const OUT_ROOT = 'scripts/ui-diff/out';
