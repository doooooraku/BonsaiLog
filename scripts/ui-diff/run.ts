// scripts/ui-diff/run.ts
// CLI エントリ。capture-app → capture-design → compare → report の順に呼び出す。
// Usage: pnpm exec tsx scripts/ui-diff/run.ts <screenId>

import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { OUT_ROOT, SCREEN_PAIRS } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

function timestamp(): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

async function runStep(name: string, cmd: string, args: string[]): Promise<string> {
  console.log(`\n=== ${name} ===`);
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => {
      const s = d.toString();
      stdout += s;
      process.stdout.write(s);
    });
    child.stderr.on('data', (d: Buffer) => {
      const s = d.toString();
      stderr += s;
      process.stderr.write(s);
    });
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${name} exited with code ${code}\n${stderr}`));
    });
  });
}

async function main(): Promise<void> {
  const screenId = process.argv[2];

  if (!screenId) {
    console.error('Usage: pnpm exec tsx scripts/ui-diff/run.ts <screenId>');
    console.error(`Available screens: ${Object.keys(SCREEN_PAIRS).join(', ')}`);
    process.exit(1);
  }

  if (!SCREEN_PAIRS[screenId]) {
    console.error(`Unknown screen: ${screenId}`);
    console.error(`Available: ${Object.keys(SCREEN_PAIRS).join(', ')}`);
    process.exit(1);
  }

  const outDir = path.join(ROOT, OUT_ROOT, timestamp());
  await fs.mkdir(outDir, { recursive: true });
  console.log(`[ui-diff] output dir: ${outDir}`);

  // 1. capture app
  await runStep('Step 1/4: capture app', 'bash', [
    path.join('scripts', 'ui-diff', 'capture-app.sh'),
    screenId,
    outDir,
  ]);

  // 2. capture design
  await runStep('Step 2/4: capture design', 'pnpm', [
    'exec',
    'tsx',
    path.join('scripts', 'ui-diff', 'capture-design.ts'),
    screenId,
    outDir,
  ]);

  // 3. compare
  const compareOut = await runStep('Step 3/4: compare', 'pnpm', [
    'exec',
    'tsx',
    path.join('scripts', 'ui-diff', 'compare.ts'),
    screenId,
    outDir,
  ]);
  const metricMatch = compareOut.match(/metric:\s*(.+)/);
  const metric = metricMatch ? metricMatch[1].trim() : '(unknown)';

  // 4. report
  await runStep('Step 4/4: report', 'pnpm', [
    'exec',
    'tsx',
    path.join('scripts', 'ui-diff', 'report.ts'),
    screenId,
    outDir,
    metric,
  ]);

  console.log(`\n[ui-diff] DONE`);
  console.log(`           out:    ${outDir}`);
  console.log(`           report: ${path.join(outDir, 'report.md')}`);
  console.log(
    `\nNext: open ${path.relative(ROOT, path.join(outDir, 'report.md'))} と画像 5 枚を Read で確認し、所見セクションを追記する。`,
  );
}

main().catch((err) => {
  console.error('[ui-diff]', err);
  process.exit(1);
});
