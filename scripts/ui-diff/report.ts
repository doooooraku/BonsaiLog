// scripts/ui-diff/report.ts
// Markdown レポートを生成する (Claude Code が Read で読む形式)。

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { SCREEN_PAIRS } from './config.js';

async function writeReport(screenId: string, outDir: string, metric: string): Promise<string> {
  const pair = SCREEN_PAIRS[screenId];
  if (!pair) {
    throw new Error(`Unknown screen: ${screenId}`);
  }

  const reportPath = path.join(outDir, 'report.md');

  const md = `# UI Diff Report — ${screenId}

- **Generated**: ${new Date().toISOString()}
- **Screen**: ${pair.description}
- **App flow**: \`${pair.appFlow}\`
- **Design HTML**: \`${pair.designHtml}\`
- **Design selector**: \`${pair.designSelector}\`
- **Notes**: ${pair.notes ?? '(none)'}

## Images

### お手本 (Design / ClaudeDesign)
![design](./design/${screenId}.png)

### 実機 (App / Android device, raw)
![app](./app/${screenId}.png)

### 実機 リサイズ (デザインサイズに揃えたもの)
![app-resized](./app/${screenId}-resized.png)

### 差分画像 (ImageMagick \`compare -metric RMSE\`)
![diff](./diff/${screenId}.png)

### Side-by-side (左: 設計 / 中: 実機リサイズ / 右: 差分)
![side](./diff/${screenId}-side-by-side.png)

## Numbers

- **RMSE (raw)**: \`${metric}\`
  - 数値が小さいほど似ている (0 = 完全一致)
  - 実機 (Android 任意解像度) と デザイン (iPhone 15 Pro 393×852) は元々解像度が違うため、
    絶対値より「差分画像のどこが赤い (= 違う) か」の位置情報のほうが有用

## データ問題 vs 実装問題 の判別 (本セッション学び A11)

差分を発見したら、以下のフローで「**実装の修正が必要か / データの補強で解消するか**」を判別する。
データ問題なら Issue 起票しない (実装は OK、サンプルデータ追加で再 PoC)。

\`\`\`
[差分発見]
   ↓
[該当コンポーネント / DAO を Explore で確認] (R-27 適用)
   ↓
   ├─ 既存実装あり、ロジック OK
   │     ↓
   │   [DB データに該当フィールド入力済?]
   │     ├─ いいえ → **データ問題** (Issue 起票せず、テスト盆栽追加で再 PoC)
   │     └─ はい  → **設定/環境問題** (環境変数 / props / 状態管理を確認)
   │
   ├─ 既存実装あり、ロジック未実装 (TODO コメント等)
   │     → **拡張 Issue** 起票 (#253 のような「既存 UI + 未実装ロジック」型)
   │
   └─ 既存実装なし
         → **新規実装 Issue** 起票
\`\`\`

## Claude Code の所見 (TODO)

> ここに Claude Code が両画像を Read で読んだ結果の差分を文章化する。
> 各差分について上記フローで分類すること。
> 例:
> - 設計のフィルタタブには「@ベランダ / #展示会候補」等があるが、実機ではタブが無い
>   → Explore: HomeFilterTabs 実装あり、getRecentTags(8) も実装あり
>   → DB データに tags 関連付けゼロ → **データ問題** (Issue 起票せず)

## Reference

- ADR-0021 §Decision §6-§7 (本パイプラインの比較ペア定義)
- ADR-0020 §Decision §3-§10 (Claude Design 全面採用 / 画面マッピング表)
- ClaudeDesign 正本: \`C:\\Users\\doooo\\Downloads\\BonsaiLog_template\\\`
- 本セッション lessons: \`docs/reference/tasks/lessons/wsl2-mobile.md\` §5-§6
- R-27 (Issue 起票前 Explore 必須): \`.claude/recurrence-prevention.md\`
`;

  await fs.writeFile(reportPath, md);
  console.log(`[report] saved: ${reportPath}`);

  return reportPath;
}

const screenId = process.argv[2];
const outDir = process.argv[3];
const metric = process.argv[4] ?? '(unknown)';

if (!screenId || !outDir) {
  console.error('Usage: tsx report.ts <screenId> <outDir> [metric]');
  process.exit(1);
}

writeReport(screenId, outDir, metric).catch((err) => {
  console.error('[report]', err);
  process.exit(1);
});
