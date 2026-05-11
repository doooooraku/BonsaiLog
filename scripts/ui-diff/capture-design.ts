// scripts/ui-diff/capture-design.ts
// 種別 B (Phase 0.1 切替): 事前撮影 mockup PNG (docs/mockups/v1.0/screenshots/<id>.png) をコピー。
//
// 旧方式 (種別 A、Playwright + chromium で HTML 動的レンダリング) は廃止:
// - mockup HTML は PR #269 で凍結保管されるため、毎回 render する必要なし
// - 事前撮影 PNG (Issue #366 で生成、git commit 済) と同じ
// - Playwright 依存解消で preflight 7 → 5 項目に簡素化、ループ failure mode 減少
//
// scrollable 画面の扱い (Phase 0.1):
// - 事前撮影 PNG は <id>-01.png / <id>-02.png / <id>-03.png に分割
// - Phase 0.1 は **上端 (-01.png) のみ** 採用 (実機 SS は 1 枚なので上端のみと比較)
// - 下端比較は Phase 0.5 以降で footer 専用 flow を別途追加 (Q1=(c) ハイブリッド)
//
// mockup PNG 解決順:
// 1. SCREEN_PAIRS[id].mockupFile が指定されていればそれを優先 (flow id ≠ mockup ファイル名の場合)
// 2. <id>.png (static 画面)
// 3. <id>-01.png (scrollable 画面の上端)
// 4. 見つからない → エラー

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SCREEN_PAIRS } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const SCREENSHOTS_DIR = path.join(ROOT, 'docs/mockups/v1.0/screenshots');

async function fileExists(p: string): Promise<boolean> {
  return fs
    .access(p)
    .then(() => true)
    .catch(() => false);
}

/** mockup PNG のファイルパス候補を順に試して最初に見つかったものを返す。 */
async function resolveMockupPng(screenId: string): Promise<string | null> {
  const pair = SCREEN_PAIRS[screenId];
  const candidates: string[] = [];
  if (pair?.mockupFile) candidates.push(pair.mockupFile);
  candidates.push(`${screenId}.png`, `${screenId}-01.png`);
  for (const candidate of candidates) {
    const p = path.join(SCREENSHOTS_DIR, candidate);
    if (await fileExists(p)) return p;
  }
  return null;
}

async function captureDesign(screenId: string, outDir: string): Promise<string> {
  const pair = SCREEN_PAIRS[screenId];
  if (!pair) {
    throw new Error(
      `Unknown screen: ${screenId}. Available: ${Object.keys(SCREEN_PAIRS).join(', ')}`,
    );
  }

  const sourcePath = await resolveMockupPng(screenId);
  if (!sourcePath) {
    const candidatesShown = [pair.mockupFile, `${screenId}.png`, `${screenId}-01.png`]
      .filter(Boolean)
      .join(', ');
    throw new Error(
      `[capture-design] mockup screenshot not found for: ${screenId}\n` +
        `  searched in: ${SCREENSHOTS_DIR}\n` +
        `  candidates: ${candidatesShown}\n` +
        `  → docs/mockups/v1.0/screenshots/ に該当 PNG があることを確認 (Issue #366 PR #367)\n` +
        `  → flow id と PNG 名が異なる場合は SCREEN_PAIRS[id].mockupFile に明示指定`,
    );
  }

  await fs.mkdir(path.join(outDir, 'design'), { recursive: true });
  const destPath = path.join(outDir, 'design', `${screenId}.png`);
  await fs.copyFile(sourcePath, destPath);

  const stat = await fs.stat(destPath);
  console.log(
    `[capture-design] copied: ${path.relative(ROOT, sourcePath)} → ${path.relative(ROOT, destPath)} (${Math.round(stat.size / 1024)} KB)`,
  );
  return destPath;
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
