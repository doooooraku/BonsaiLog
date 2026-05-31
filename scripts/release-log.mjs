#!/usr/bin/env node
/**
 * release-log.mjs — リリースログ管理 (Sess61 PR2)
 *
 * Usage:
 *   node scripts/release-log.mjs init           # 新タイムスタンプ発行 + ディレクトリ作成 (stdout に ts)
 *   node scripts/release-log.mjs summary        # RELEASE_LOG_TS から summary.md 生成
 *   node scripts/release-log.mjs cleanup        # 直近 10 ディレクトリのみ保持、 古いものは削除
 *
 * ログ構造 (dist/release-logs/<ts>-android/):
 *   00-preflight.json       — preflight 結果
 *   01-auto-fix.log         — auto-fix の修復ログ
 *   02-snapshot-before.json — Play Console 状態 (Submit 前)
 *   03-build.log            — AAB ビルドログ
 *   04-submit.log           — EAS Submit ログ + submit ID
 *   05-snapshot-after.json  — Play Console 状態 (Submit 後)
 *   06-diff.json            — 差分検証結果
 *   summary.md              — user 向けまとめ
 */
import { mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

const LOG_ROOT = path.resolve('dist/release-logs');
const KEEP = 10;

async function cmdInit() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(LOG_ROOT, `${ts}-android`);
  await mkdir(dir, { recursive: true });
  console.log(ts); // caller が捕捉して RELEASE_LOG_TS 環境変数に流す
}

async function cmdSummary() {
  const ts = process.env.RELEASE_LOG_TS;
  if (!ts) {
    console.error('RELEASE_LOG_TS env が必要');
    process.exit(1);
  }
  const dir = path.join(LOG_ROOT, `${ts}-android`);
  const safeJson = async (p) => {
    try {
      return JSON.parse(await readFile(p, 'utf8'));
    } catch {
      return null;
    }
  };
  const before = await safeJson(`${dir}/02-snapshot-before.json`);
  const after = await safeJson(`${dir}/05-snapshot-after.json`);
  const diff = await safeJson(`${dir}/06-diff.json`);
  const preflight = await safeJson(`${dir}/00-preflight.json`);

  const summary = [
    `# Release Android — ${ts}`,
    '',
    '## Preflight',
    preflight
      ? `- 合計 ${preflight.total} / ✅ ${preflight.pass} / ❌ ${preflight.fail} / 🔧 ${preflight.fixable}`
      : '- (未実行 or ログなし)',
    '',
    '## Snapshot',
    before
      ? `- before: latestVersionCode=${before.latestVersionCode} drafts=${before.drafts?.length ?? 0} listings=[${before.listings?.map((l) => l.language).join(',') ?? ''}]`
      : '- before: (未撮影)',
    after
      ? `- after:  latestVersionCode=${after.latestVersionCode} drafts=${after.drafts?.length ?? 0}`
      : '- after:  (未撮影)',
    '',
    '## Diff result',
    diff?.checks
      ? diff.checks
          .map(
            (c) =>
              `- ${c.pass ? '✅' : '❌'} ${c.label}: expected=${c.expected} actual=${c.actual}`,
          )
          .join('\n')
      : '- (diff 未実行)',
    '',
    '## 次にやること',
    diff?.allPass
      ? [
          '1. [Play Console を開く](https://play.google.com/console/u/0/developers/-/app/-/tracks/closed-testing)',
          `2. Alpha track の Draft (versionCode ${diff.newVersionCodes?.[0] ?? '?'}) を確認`,
          '3. 「リリースを確認」 → 「ロールアウトを開始」 を 1 クリック',
          '4. テスター 12 人のスマホに配信開始',
        ].join('\n')
      : `❌ Submit が想定通り完了していません。 logs (${dir}) を確認してください。`,
    '',
  ].join('\n');

  await writeFile(`${dir}/summary.md`, summary);
  console.log(`[log:summary] saved → ${dir}/summary.md`);
}

async function cmdCleanup() {
  try {
    const entries = await readdir(LOG_ROOT);
    const androidLogs = entries
      .filter((e) => e.endsWith('-android'))
      .sort()
      .reverse();
    const toDelete = androidLogs.slice(KEEP);
    for (const name of toDelete) {
      await rm(path.join(LOG_ROOT, name), { recursive: true, force: true });
      console.log(`[log:cleanup] removed ${name}`);
    }
    console.log(`[log:cleanup] kept ${Math.min(KEEP, androidLogs.length)} most recent`);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

async function main() {
  const cmd = process.argv[2];
  if (cmd === 'init') await cmdInit();
  else if (cmd === 'summary') await cmdSummary();
  else if (cmd === 'cleanup') await cmdCleanup();
  else {
    console.error('Usage: release-log.mjs (init|summary|cleanup)');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('[release-log] failed:', e.message);
  process.exit(1);
});
