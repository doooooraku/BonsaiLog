// scripts/ui-diff/capture-design.ts
// mockups v1.0 (OpenDesign、docs/mockups/v1.0/wireframes/、PR #269 取り込み) の HTML を
// chromium-headless でレンダリングし、該当画面ノードのみスクショ取得する。
// ADR-0021 Notes Amended (PR #267) で OpenDesign 出力を比較対象として参照に切替済。
// Babel standalone が file:// 経由で JSX を fetch するため、
// --allow-file-access-from-files フラグが必要。

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { chromium } from 'playwright';

import { DESIGN_ROOT, SCREEN_PAIRS } from './config.js';

async function captureDesign(screenId: string, outDir: string): Promise<string> {
  const pair = SCREEN_PAIRS[screenId];
  if (!pair) {
    throw new Error(
      `Unknown screen: ${screenId}. Available: ${Object.keys(SCREEN_PAIRS).join(', ')}`,
    );
  }

  const htmlPath = path.join(DESIGN_ROOT, pair.designHtml);
  await fs.access(htmlPath);

  await fs.mkdir(path.join(outDir, 'design'), { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security'],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1600, height: 1400 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    page.on('pageerror', (err) => console.error('[capture-design] page error:', err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('[capture-design] console error:', msg.text());
      }
    });

    const fileUrl = `file://${htmlPath}`;
    console.log(`[capture-design] open: ${fileUrl}`);
    await page.goto(fileUrl, { waitUntil: 'networkidle', timeout: 30_000 });

    // Babel standalone が JSX をコンパイル → React が描画されるまで待つ
    console.log(`[capture-design] wait for selector: ${pair.designSelector}`);
    await page.waitForSelector(pair.designSelector, { timeout: 20_000 });

    // フォントロード完了 + レイアウト沈静化
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(500);

    const target = page.locator(pair.designSelector).first();
    const outPath = path.join(outDir, 'design', `${screenId}.png`);
    await target.screenshot({ path: outPath });

    const stat = await fs.stat(outPath);
    console.log(`[capture-design] saved: ${outPath} (${Math.round(stat.size / 1024)} KB)`);

    return outPath;
  } finally {
    await browser.close();
  }
}

const screenId = process.argv[2];
const outDir = process.argv[3];

if (!screenId || !outDir) {
  console.error('Usage: tsx capture-design.ts <screenId> <outDir>');
  process.exit(1);
}

captureDesign(screenId, outDir).catch((err) => {
  console.error('[capture-design]', err);
  process.exit(1);
});
