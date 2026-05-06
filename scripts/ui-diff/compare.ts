// scripts/ui-diff/compare.ts
// 実機スクショとデザインスクショを比較する。
// (1) 実機をデザインサイズに合わせてリサイズ (アスペクト保持 / 余白 washi 色)
// (2) ImageMagick `compare -metric RMSE` で差分画像 + 数値
// (3) sharp で side-by-side 合成 (左: 設計 / 中: 実機リサイズ / 右: 差分)

import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';

import sharp from 'sharp';

const execFileAsync = promisify(execFile);

export type CompareResult = {
  metric: string;
  diffPath: string;
  sideBySidePath: string;
  appResizedPath: string;
};

async function compare(screenId: string, outDir: string): Promise<CompareResult> {
  const appPath = path.join(outDir, 'app', `${screenId}.png`);
  const designPath = path.join(outDir, 'design', `${screenId}.png`);
  const diffDir = path.join(outDir, 'diff');
  await fs.mkdir(diffDir, { recursive: true });

  const diffPath = path.join(diffDir, `${screenId}.png`);
  const sideBySidePath = path.join(diffDir, `${screenId}-side-by-side.png`);
  const appResizedPath = path.join(outDir, 'app', `${screenId}-resized.png`);

  // 1. デザインのサイズに合わせて実機画像をリサイズ (fit: contain で washi 色の余白)
  const designMeta = await sharp(designPath).metadata();
  const dw = designMeta.width;
  const dh = designMeta.height;
  if (!dw || !dh) {
    throw new Error(`Design image has no dimensions: ${designPath}`);
  }

  await sharp(appPath)
    .resize(dw, dh, {
      fit: 'contain',
      background: { r: 247, g: 243, b: 232 }, // design_system.md §2 washi #F7F3E8
    })
    .toFile(appResizedPath);

  // 2. ImageMagick compare で diff 画像 + RMSE 数値
  // exit code: 0 = 完全一致 / 1 = 差分あり (正常) / 2+ = 実エラー
  let metric = '(unknown)';
  try {
    const result = await execFileAsync('compare', [
      '-metric',
      'RMSE',
      designPath,
      appResizedPath,
      diffPath,
    ]);
    metric = result.stderr.trim() || result.stdout.trim() || '0';
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { code?: number | string; stderr?: string };
    if (e.code === 1 || e.code === '1') {
      metric = (e.stderr || '').trim();
    } else {
      throw err;
    }
  }

  // 3. side-by-side 合成
  const gap = 20;
  const composite = await sharp({
    create: {
      width: dw * 3 + gap * 4,
      height: dh + gap * 2,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      { input: designPath, left: gap, top: gap },
      { input: appResizedPath, left: dw + gap * 2, top: gap },
      { input: diffPath, left: dw * 2 + gap * 3, top: gap },
    ])
    .png()
    .toBuffer();
  await fs.writeFile(sideBySidePath, composite);

  return { metric, diffPath, sideBySidePath, appResizedPath };
}

const screenId = process.argv[2];
const outDir = process.argv[3];

if (!screenId || !outDir) {
  console.error('Usage: tsx compare.ts <screenId> <outDir>');
  process.exit(1);
}

compare(screenId, outDir)
  .then((r) => {
    console.log(`[compare] metric: ${r.metric}`);
    console.log(`[compare] diff: ${r.diffPath}`);
    console.log(`[compare] side-by-side: ${r.sideBySidePath}`);
  })
  .catch((err) => {
    console.error('[compare]', err);
    process.exit(1);
  });
