#!/usr/bin/env node
/**
 * release-diff.mjs — snapshot-before と snapshot-after を比較して差分検証 (Sess61 PR2)
 *
 * Usage:
 *   RELEASE_LOG_TS=<ts> node scripts/release-diff.mjs
 *
 * 出力: dist/release-logs/<ts>-android/06-diff.json
 * 期待 (alpha track, draft 戦略):
 *   1. 新規 draft が +1 増えた
 *   2. 新 draft の versionCode が before.latestVersionCode より大きい
 *   3. 新 draft の releaseNotes (whatsnew) が非空
 *   4. snapshot 間の経過時間が 30 分以内
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const ts = process.env.RELEASE_LOG_TS;
  if (!ts) {
    console.error('RELEASE_LOG_TS env が必要です (release-log.mjs init で取得)');
    process.exit(1);
  }
  const dir = path.resolve(`dist/release-logs/${ts}-android`);
  const before = JSON.parse(await readFile(`${dir}/02-snapshot-before.json`, 'utf8'));
  const after = JSON.parse(await readFile(`${dir}/05-snapshot-after.json`, 'utf8'));

  const draftsBefore = before.drafts.length;
  const draftsAfter = after.drafts.length;
  const newDrafts = draftsAfter - draftsBefore;

  const beforeDraftVcs = new Set(before.drafts.flatMap((d) => d.versionCodes ?? []).map(String));
  const newDraftEntries = after.drafts.filter(
    (d) => !(d.versionCodes ?? []).every((vc) => beforeDraftVcs.has(String(vc))),
  );
  const newVersionCodes = newDraftEntries.flatMap((d) => d.versionCodes ?? []).map(Number);

  const elapsedMs = new Date(after.snapshotAt) - new Date(before.snapshotAt);
  const elapsedSec = Math.floor(elapsedMs / 1000);

  const releaseNotesPreview = newDraftEntries[0]?.releaseNotes
    ? newDraftEntries[0].releaseNotes
        .map((rn) => `${rn.language}: ${(rn.text ?? '').slice(0, 40)}`)
        .join(' / ')
    : '(空)';

  const checks = [
    {
      label: 'new draft +1',
      expected: 1,
      actual: newDrafts,
      pass: newDrafts === 1,
    },
    {
      label: 'versionCode > before.latest',
      expected: `> ${before.latestVersionCode}`,
      actual: newVersionCodes.join(',') || '(無)',
      pass:
        newVersionCodes.length > 0 &&
        newVersionCodes.every((vc) => vc > Number(before.latestVersionCode)),
    },
    {
      label: 'whatsnew (releaseNotes) reflected',
      expected: 'non-empty',
      actual: releaseNotesPreview,
      pass: !!newDraftEntries[0]?.releaseNotes && newDraftEntries[0].releaseNotes.length > 0,
    },
    {
      label: 'snapshot 経過時間 < 30 min',
      expected: '< 1800s',
      actual: `${elapsedSec}s`,
      pass: elapsedMs > 0 && elapsedMs < 1800 * 1000,
    },
  ];

  const allPass = checks.every((c) => c.pass);
  const diff = {
    ts,
    snapshotAt: { before: before.snapshotAt, after: after.snapshotAt, elapsedSec },
    allPass,
    checks,
    newVersionCodes,
    newDraftEntries,
  };
  await writeFile(`${dir}/06-diff.json`, JSON.stringify(diff, null, 2) + '\n');

  console.log('[diff] result:');
  for (const c of checks) {
    console.log(`  ${c.pass ? '✅' : '❌'} ${c.label}: expected=${c.expected} actual=${c.actual}`);
  }
  if (!allPass) {
    console.log('\n❌ Submit が想定通り完了していない可能性があります。');
    console.log(`   詳細は ${dir}/06-diff.json を確認してください。`);
    process.exit(2);
  }
  console.log('\n✅ Submit 完了。 user は Play Console で「ロールアウトを開始」 1 クリックのみ。');
}

main().catch((e) => {
  console.error('[diff] failed:', e.message);
  process.exit(1);
});
