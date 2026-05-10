// scripts/ui-diff/generate-mockup-screenshots.ts
// T1-2 (Tier 1a): mockup v1.0 全画面のスクショ事前生成スクリプト。
// MOCKUP_SCREENSHOTS で定義した 26 画面を chromium-headless で撮影し、
// docs/mockups/v1.0/screenshots/<id>.png に保存。
// 生成後 git commit、開発中いつでも Read で参照可能。
//
// 使い方:
//   PATH=/home/doooo/.local/bin:/home/doooo/.nvm/versions/node/v22.22.2/bin:/usr/bin:/bin \
//     corepack pnpm exec tsx scripts/ui-diff/generate-mockup-screenshots.ts
//
// 前提:
// - Playwright + chromium installed (`pnpm exec playwright install chromium`)
// - DESIGN_ROOT (docs/mockups/v1.0/wireframes/) に各 HTML が存在
//
// Related:
// - ADR-0020 §Notes §画面マップ (整合性レベル 2 判定の根拠スクショ)
// - docs/reference/integration-criteria.md (整合済 = レベル 2 以上)
// - .claude/recurrence-prevention.md R-29 (写経駆動開発 5 段階)

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { chromium, type Browser, type Page } from 'playwright';

import { DESIGN_ROOT } from './config.js';
import { MOCKUP_SCREENSHOTS, type MockupScreenshot } from './mockup-screenshots-config.js';

const SCREENSHOTS_DIR = path.join(DESIGN_ROOT, '..', 'screenshots');

async function captureOne(
  page: Page,
  screen: MockupScreenshot,
  htmlPath: string,
): Promise<string | null> {
  const fileUrl = `file://${htmlPath}`;
  console.log(`[mockup-ss] open: ${fileUrl} (screen=${screen.id})`);

  try {
    await page.goto(fileUrl, { waitUntil: 'networkidle', timeout: 30_000 });

    // Babel standalone が JSX をコンパイル → React が描画されるまで待つ
    await page.waitForSelector(screen.selector, { timeout: 20_000 });

    // フォントロード完了 + レイアウト沈静化
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(500);

    const target = page.locator(screen.selector).first();
    const outPath = path.join(SCREENSHOTS_DIR, `${screen.id}.png`);
    await target.screenshot({ path: outPath });

    const stat = await fs.stat(outPath);
    console.log(`[mockup-ss] saved: ${screen.id}.png (${Math.round(stat.size / 1024)} KB)`);
    return outPath;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[mockup-ss] FAILED: ${screen.id} (${screen.selector}): ${message}`);
    return null;
  }
}

async function main(): Promise<void> {
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });

  const browser: Browser = await chromium.launch({
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security'],
  });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 1400 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  page.on('pageerror', (err) => console.error('[mockup-ss] page error:', err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('[mockup-ss] console error:', msg.text());
    }
  });

  const results: { id: string; path: string | null }[] = [];

  // HTML ごとにグループ化して、一度開いたページを使い回す (高速化)
  const byHtml = new Map<string, MockupScreenshot[]>();
  for (const screen of MOCKUP_SCREENSHOTS) {
    const list = byHtml.get(screen.html) ?? [];
    list.push(screen);
    byHtml.set(screen.html, list);
  }

  for (const [html, screens] of byHtml.entries()) {
    const htmlPath = path.join(DESIGN_ROOT, html);
    try {
      await fs.access(htmlPath);
    } catch {
      console.error(`[mockup-ss] HTML not found, skipping: ${htmlPath}`);
      for (const s of screens) results.push({ id: s.id, path: null });
      continue;
    }

    // 同じ HTML を 1 度開いて、その中の各 selector を順次撮影
    const fileUrl = `file://${htmlPath}`;
    console.log(`[mockup-ss] === HTML: ${html} (${screens.length} screens) ===`);
    await page.goto(fileUrl, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(1000); // 全 PhoneShell のレイアウト沈静化

    for (const screen of screens) {
      try {
        await page.waitForSelector(screen.selector, { timeout: 10_000 });
        const target = page.locator(screen.selector).first();
        const outPath = path.join(SCREENSHOTS_DIR, `${screen.id}.png`);
        await target.screenshot({ path: outPath });
        const stat = await fs.stat(outPath);
        console.log(
          `[mockup-ss] saved: ${screen.id}.png (${Math.round(stat.size / 1024)} KB) — ${screen.description}`,
        );
        results.push({ id: screen.id, path: outPath });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[mockup-ss] FAILED: ${screen.id} (${screen.selector}): ${message}`);
        results.push({ id: screen.id, path: null });
      }
    }
  }

  await browser.close();

  // サマリ
  const ok = results.filter((r) => r.path != null).length;
  const fail = results.length - ok;
  console.log('');
  console.log(`[mockup-ss] ============================================`);
  console.log(`[mockup-ss] DONE: ${ok}/${results.length} screens captured`);
  if (fail > 0) {
    console.log(`[mockup-ss] FAILED: ${fail}`);
    for (const r of results.filter((x) => x.path == null)) {
      console.log(`[mockup-ss]   - ${r.id}`);
    }
  }
  console.log(`[mockup-ss] Output: ${SCREENSHOTS_DIR}`);
  console.log(`[mockup-ss] ============================================`);

  if (fail > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[mockup-ss] fatal:', err);
  process.exit(1);
});
