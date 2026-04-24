#!/usr/bin/env npx tsx
/**
 * Store Screenshot Compositing Generator
 *
 * Automates Phase 2 of the store screenshot pipeline:
 *   raw Maestro screenshots -> store-ready composites
 *   (white background + marketing text + rounded screenshot)
 *
 * Usage:
 *   pnpm store-screenshots                            # all locales, both stores
 *   pnpm store-screenshots --store apple              # Apple only
 *   pnpm store-screenshots --store google --lang ja   # Google, Japanese only
 */

import { parseArgs } from 'node:util';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { chromium } from 'playwright';

import { STORE_SIZES, LOCALE_DIR_MAP, SCREEN_MAP, RAW_DIR, STORE_DIR } from './lib/config.js';
import { cropToBase64 } from './lib/postprocess.js';
import { flattenAndVerify } from './lib/postprocess.js';
import { buildFontCss, getFontStack } from './lib/fonts.js';
import { buildHtml } from './lib/template.js';
import { renderPage } from './lib/renderer.js';
import { marketingTextMap } from './data/marketing-text.js';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const { values } = parseArgs({
  options: {
    store: { type: 'string', default: 'all' },
    lang: { type: 'string', default: '' },
  },
  strict: true,
});

const storeNames = values.store === 'all' ? Object.keys(STORE_SIZES) : [values.store!];

const locales = values.lang
  ? values.lang.split(',').map((s) => s.trim())
  : Object.keys(LOCALE_DIR_MAP);

// ---------------------------------------------------------------------------
// Validate inputs
// ---------------------------------------------------------------------------

for (const store of storeNames) {
  if (!STORE_SIZES[store]) {
    console.error(`Unknown store: ${store}. Use "apple", "google", or "all".`);
    process.exit(1);
  }
}

const missingLocales = locales.filter((l) => !LOCALE_DIR_MAP[l]);
if (missingLocales.length > 0) {
  console.error(`Unknown locale(s): ${missingLocales.join(', ')}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Check that raw screenshots exist
  const missingFiles: string[] = [];
  for (const locale of locales) {
    const dir = LOCALE_DIR_MAP[locale];
    for (const screen of SCREEN_MAP) {
      const rawPath = path.join(RAW_DIR, dir, screen.filename);
      try {
        await fs.access(rawPath);
      } catch {
        missingFiles.push(rawPath);
      }
    }
  }

  if (missingFiles.length > 0) {
    console.error(
      `\n${missingFiles.length} raw screenshot(s) missing:\n` +
        missingFiles.map((f) => `  - ${f}`).join('\n') +
        '\n\nRun the Maestro capture scripts first.\n',
    );
    process.exit(1);
  }

  const startTime = Date.now();
  let count = 0;
  let errors = 0;

  console.log(
    `\nGenerating store screenshots...` +
      `\n  Stores:  ${storeNames.join(', ')}` +
      `\n  Locales: ${locales.length} (${locales.join(', ')})` +
      `\n  Screens: ${SCREEN_MAP.length}` +
      `\n  Total:   ${storeNames.length * locales.length * SCREEN_MAP.length} images\n`,
  );

  const browser = await chromium.launch({ headless: true });

  try {
    for (const locale of locales) {
      const localeDir = LOCALE_DIR_MAP[locale];
      const text = marketingTextMap[locale];
      if (!text) {
        console.error(`  [SKIP] No marketing text for locale: ${locale}`);
        continue;
      }

      // Pre-build font CSS once per locale (reused across screens x stores)
      const fontCss = buildFontCss(locale);
      const fontStack = getFontStack(locale);

      for (const screen of SCREEN_MAP) {
        const rawPath = path.join(RAW_DIR, localeDir, screen.filename);

        // Crop once per screen (reused across stores)
        let croppedBase64: string;
        try {
          croppedBase64 = await cropToBase64(rawPath);
        } catch (err) {
          console.error(`  [ERROR] Crop failed: ${rawPath}`, err);
          errors++;
          continue;
        }

        const marketingText = text[screen.key as keyof typeof text];

        for (const store of storeNames) {
          const size = STORE_SIZES[store];

          try {
            // Build HTML
            const html = buildHtml({
              marketingText,
              screenshotBase64: croppedBase64,
              fontCss,
              fontStack,
              locale,
            });

            // Render
            const rawPng = await renderPage(browser, html, size);

            // Post-process
            const finalPng = await flattenAndVerify(rawPng, size.width, size.height);

            // Write
            const outDir = path.join(STORE_DIR, store, localeDir);
            await fs.mkdir(outDir, { recursive: true });
            const outPath = path.join(outDir, screen.filename);
            await fs.writeFile(outPath, finalPng);

            count++;
          } catch (err) {
            console.error(`  [ERROR] ${store}/${localeDir}/${screen.filename}`, err);
            errors++;
          }
        }
      }

      console.log(`  ${locale} done`);
    }
  } finally {
    await browser.close();
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `\nComplete: ${count} images generated in ${elapsed}s` +
      (errors > 0 ? ` (${errors} errors)` : '') +
      `\nOutput:   ${STORE_DIR}/\n`,
  );

  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
