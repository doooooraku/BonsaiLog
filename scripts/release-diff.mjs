#!/usr/bin/env node
/**
 * release-diff.mjs — snapshot-before と snapshot-after を比較して差分検証 (Sess61 PR2 + PR6)
 *
 * Usage:
 *   RELEASE_LOG_TS=<ts> node scripts/release-diff.mjs
 *   (PR6: env 未設定時は dist/release-logs/.current から fallback 読み取り)
 *
 * 出力: dist/release-logs/<ts>-android/06-diff.json
 *
 * 検証項目 (PR6: critical / warning 重み付け):
 *   ★ critical (criticalPass の判定対象):
 *     1. 新規 draft が +1 増えた
 *     2. 新 draft の versionCode が before.latestVersionCode より大きい
 *     3. snapshot 間の経過時間が 30 分以内
 *   ⚠ warning (criticalPass に含めない、 user へ注意喚起のみ):
 *     4. 新 draft の releaseNotes (whatsnew) が非空 (PR6 で setReleaseNotes 別途実行のため、
 *        critical から外し warning に降格。 万一 setReleaseNotes 失敗時の検知用に残す)
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

function resolveTS() {
  if (process.env.RELEASE_LOG_TS) return process.env.RELEASE_LOG_TS;
  const currentFile = path.resolve('dist/release-logs/.current');
  if (existsSync(currentFile)) {
    return readFileSync(currentFile, 'utf8').trim();
  }
  console.error('RELEASE_LOG_TS env も .current ファイルもなし');
  process.exit(1);
}

async function main() {
  const ts = resolveTS();
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

  // PR6: critical / warning 重み付け
  const checks = [
    {
      label: 'new draft +1',
      expected: 1,
      actual: newDrafts,
      pass: newDrafts === 1,
      warning: false,
    },
    {
      label: 'versionCode > before.latest',
      expected: `> ${before.latestVersionCode}`,
      actual: newVersionCodes.join(',') || '(無)',
      pass:
        newVersionCodes.length > 0 &&
        newVersionCodes.every((vc) => vc > Number(before.latestVersionCode)),
      warning: false,
    },
    {
      label: 'whatsnew (releaseNotes) reflected',
      expected: 'non-empty',
      actual: releaseNotesPreview,
      pass: !!newDraftEntries[0]?.releaseNotes && newDraftEntries[0].releaseNotes.length > 0,
      warning: true, // PR6: setReleaseNotes 別 step で投稿、 失敗時は warning として user へ通知
    },
    {
      label: 'snapshot 経過時間 < 30 min',
      expected: '< 1800s',
      actual: `${elapsedSec}s`,
      pass: elapsedMs > 0 && elapsedMs < 1800 * 1000,
      warning: true, // PR7: critical → warning 降格。 セッション中断で経過時間が延びる事象を critical 判定から除外
    },
  ];

  const allPass = checks.every((c) => c.pass);
  const criticalPass = checks.filter((c) => !c.warning).every((c) => c.pass);
  const warnings = checks
    .filter((c) => c.warning && !c.pass)
    .map((c) => `${c.label}: expected=${c.expected} actual=${c.actual}`);

  const diff = {
    ts,
    snapshotAt: { before: before.snapshotAt, after: after.snapshotAt, elapsedSec },
    allPass,
    criticalPass,
    warnings,
    checks,
    newVersionCodes,
    newDraftEntries,
  };
  await writeFile(`${dir}/06-diff.json`, JSON.stringify(diff, null, 2) + '\n');

  console.log('[diff] result:');
  for (const c of checks) {
    const icon = c.pass ? '✅' : c.warning ? '⚠️' : '❌';
    const tag = c.warning ? ' (warning)' : '';
    console.log(`  ${icon} ${c.label}${tag}: expected=${c.expected} actual=${c.actual}`);
  }

  if (!criticalPass) {
    console.log('\n❌ Submit が想定通り完了していない可能性があります (critical 失敗)。');
    console.log(`   詳細は ${dir}/06-diff.json を確認してください。`);
    process.exit(2);
  }

  if (warnings.length > 0) {
    console.log('\n⚠️ Warning(s):');
    for (const w of warnings) console.log(`  - ${w}`);
    console.log('\n→ Submit は成功、 user は Play Console で「ロールアウトを開始」 可能。');
    console.log('   ただし warning 項目は後追い修正推奨。');
    return;
  }

  console.log(
    '\n✅ Submit 完了 (全項目通過)。 user は Play Console で「ロールアウトを開始」 1 クリックのみ。',
  );
}

main().catch((e) => {
  console.error('[diff] failed:', e.message);
  process.exit(1);
});
