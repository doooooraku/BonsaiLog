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

## Claude Code の所見 (TODO)

> ここに Claude Code が両画像を Read で読んだ結果の差分を文章化する。
> 例:
> - 設計ではヘッダーが「盆栽手帳」(Noto Serif 22pt) だが、実機では Inter 18pt になっている
> - 設計のフィルタタブには「@ベランダ / #展示会候補 / #要注意 / @師匠から」があるが、実機ではタブが無い
> - FAB の位置 / 色は一致しているように見える
> - タブバーは設計の 4 タブ (盆栽 / 予定 / 探す / 設定) と一致

## Reference

- ADR-0021 §Decision §6-§7 (本パイプラインの比較ペア定義)
- ADR-0020 §Decision §3-§10 (Claude Design 全面採用 / 画面マッピング表)
- ClaudeDesign 正本: \`C:\\Users\\doooo\\Downloads\\BonsaiLog_template\\\`
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
