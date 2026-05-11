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

// Retro-D: flow 失敗時の自動 fail_count 更新 + 3 回到達で permanent skip 自動追加。
async function recordFailure(screenId: string, errMessage: string): Promise<void> {
  const SKIP_LIST_PATH = path.join(__dirname, 'skip-list.json');
  let raw: string;
  try {
    raw = await fs.readFile(SKIP_LIST_PATH, 'utf-8');
  } catch {
    return; // skip-list が無ければ何もしない
  }
  type SkippedT = {
    flow: string;
    reason: string;
    added_at: string;
    fail_count: number;
    permanent: boolean;
    status?: 'provisional' | 'confirmed';
    [k: string]: unknown;
  };
  let parsed: { version: number; skipped: SkippedT[]; achieved: unknown[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  const existing = parsed.skipped.find((s) => s.flow === screenId);
  if (existing) {
    existing.fail_count += 1;
    if (existing.fail_count >= 3 && !existing.permanent) {
      existing.permanent = true;
      existing.status = 'confirmed';
      console.log(
        `\n[ui-diff] ⚠️ ${screenId} が 3 回失敗 → permanent skip + status=confirmed に自動更新`,
      );
    }
  } else {
    parsed.skipped.push({
      flow: screenId,
      reason: `flow 失敗 (Retro-D 自動追加): ${errMessage.slice(0, 200)}`,
      added_at: new Date().toISOString(),
      fail_count: 1,
      permanent: false,
      status: 'provisional',
    });
    console.log(`\n[ui-diff] ℹ️ ${screenId} を skip-list.provisional に自動追加 (fail_count=1)`);
  }
  await fs.writeFile(SKIP_LIST_PATH, JSON.stringify(parsed, null, 2) + '\n', 'utf-8');
}

main().catch(async (err) => {
  console.error('[ui-diff]', err);
  // Retro-D: 失敗時に fail_count 自動更新
  const screenId = process.argv[2];
  if (screenId && SCREEN_PAIRS[screenId]) {
    try {
      await recordFailure(screenId, (err as Error).message);
    } catch (e) {
      console.error('[ui-diff] failed to update skip-list:', e);
    }
  }
  process.exit(1);
});
