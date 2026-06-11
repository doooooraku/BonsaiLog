// scripts/mockups/generate-mockup-screenshots.ts
// T1-2 (Tier 1a) + Issue #366 (撮影方式改善): mockup v1.0 全画面のスクショ事前生成スクリプト。
// MOCKUP_SCREENSHOTS で定義した 41 画面 (4 HTML × 全 PhoneShell) を chromium-headless で撮影し、
// docs/mockups/v1.0/screenshots/<id>.png (static) または `<id>-01.png` `<id>-02.png` ... (scrollable) に保存。
// 生成後 git commit、開発中いつでも Read で参照可能。
//
// 使い方:
//   PATH=/home/doooo/.local/bin:/home/doooo/.nvm/versions/node/v22.22.2/bin:/usr/bin:/bin \
//     corepack pnpm exec tsx scripts/mockups/generate-mockup-screenshots.ts
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
import { fileURLToPath } from 'node:url';

import { chromium, type Browser, type Locator } from 'playwright';

import { MOCKUP_SCREENSHOTS, type MockupScreenshot } from './mockup-screenshots-config.js';

// mockup HTML の置き場 (旧 scripts/ui-diff/config.ts から inline 化、ADR-0059 退役時に移設)
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DESIGN_ROOT = path.join(REPO_ROOT, 'docs/mockups/v1.0/wireframes');

const SCREENSHOTS_DIR = path.join(DESIGN_ROOT, '..', 'screenshots');

/**
 * scrollable モード: PhoneShell 内の overflow:auto 領域を scrollTop で動かして複数撮影。
 * - target 内の `overflow*: auto` を持つ最大の div (scrollable container) を Playwright で動的検出
 * - clientHeight / scrollHeight から分割数を計算 (1 ページ overlap 8px で見切れ防止)
 * - 各 page で scrollTop を進め、設定後 250ms 待機して描画沈静 → screenshot
 * - 出力 ファイル名: `<id>-01.png` `<id>-02.png` ... (suffix 2 桁 0 詰め)
 */
async function captureScrollable(target: Locator, screen: MockupScreenshot): Promise<string[]> {
  const scrollEl = await target.evaluateHandle((el) => {
    const all = (el as HTMLElement).querySelectorAll('div');
    let best: HTMLElement | null = null;
    let bestScrollSpan = 0;
    for (const d of all) {
      const style = window.getComputedStyle(d);
      const overflowY = style.overflowY;
      if (overflowY !== 'auto' && overflowY !== 'scroll') continue;
      const span = d.scrollHeight - d.clientHeight;
      if (span > bestScrollSpan) {
        bestScrollSpan = span;
        best = d;
      }
    }
    return best;
  });

  const handle = scrollEl.asElement();
  if (handle == null) {
    // overflow:auto が無い (誤分類)、static fallback
    console.warn(
      `[mockup-ss] ${screen.id}: scrollable mode but no scroll container found, falling back to static`,
    );
    const outPath = path.join(SCREENSHOTS_DIR, `${screen.id}.png`);
    await target.screenshot({ path: outPath });
    return [outPath];
  }

  const dims = await handle.evaluate((d) => ({
    scrollHeight: (d as HTMLElement).scrollHeight,
    clientHeight: (d as HTMLElement).clientHeight,
  }));

  const overlap = 8; // 連続撮影で見切れないように 8px overlap
  const step = Math.max(dims.clientHeight - overlap, 1);
  const pages = Math.max(Math.ceil((dims.scrollHeight - overlap) / step), 1);
  const outPaths: string[] = [];

  for (let i = 0; i < pages; i++) {
    const top = Math.min(i * step, dims.scrollHeight - dims.clientHeight);
    await handle.evaluate((d, t) => {
      (d as HTMLElement).scrollTop = t;
    }, top);
    await target.page().waitForTimeout(250);
    const suffix = String(i + 1).padStart(2, '0');
    const outPath = path.join(SCREENSHOTS_DIR, `${screen.id}-${suffix}.png`);
    await target.screenshot({ path: outPath });
    outPaths.push(outPath);
  }

  return outPaths;
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
        const mode = screen.mode ?? 'static';

        if (mode === 'scrollable') {
          // 旧 `<id>.png` (single-shot 残骸) があれば削除して、`-01.png` 系のみが正となるようにする
          const stalePath = path.join(SCREENSHOTS_DIR, `${screen.id}.png`);
          await fs.rm(stalePath, { force: true });

          const outPaths = await captureScrollable(target, screen);
          for (const outPath of outPaths) {
            const stat = await fs.stat(outPath);
            console.log(
              `[mockup-ss] saved: ${path.basename(outPath)} (${Math.round(stat.size / 1024)} KB) — ${screen.description}`,
            );
          }
          results.push({ id: screen.id, path: outPaths[0] ?? null });
        } else {
          const outPath = path.join(SCREENSHOTS_DIR, `${screen.id}.png`);
          await target.screenshot({ path: outPath });
          const stat = await fs.stat(outPath);
          console.log(
            `[mockup-ss] saved: ${screen.id}.png (${Math.round(stat.size / 1024)} KB) — ${screen.description}`,
          );
          results.push({ id: screen.id, path: outPath });
        }
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
