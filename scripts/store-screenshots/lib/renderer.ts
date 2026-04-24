import type { Browser } from 'playwright';
import type { StoreSize } from './config.js';

/**
 * Render an HTML string at the given viewport size and return the
 * resulting screenshot as a PNG buffer.
 *
 * A fresh page is created and closed for each render to avoid state leakage.
 * The caller should reuse a single Browser instance across all renders.
 */
export async function renderPage(browser: Browser, html: string, size: StoreSize): Promise<Buffer> {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  try {
    await page.setContent(html, { waitUntil: 'load' });

    // Wait for @font-face fonts to finish loading
    await page.waitForFunction(() => document.fonts.ready, null, {
      timeout: 30_000,
    });

    // Allow shrink-to-fit script + layout reflow to settle
    await page.waitForTimeout(200);

    const buffer = await page.screenshot({
      type: 'png',
      fullPage: false,
    });

    return Buffer.from(buffer);
  } finally {
    await context.close();
  }
}
