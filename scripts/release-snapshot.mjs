#!/usr/bin/env node
/**
 * release-snapshot.mjs — Play Console 状態を Publisher API で撮影 (Sess61 PR2 + PR6)
 *
 * Usage:
 *   node scripts/release-snapshot.mjs before [ts]
 *   node scripts/release-snapshot.mjs after [ts]
 *
 * 引数 ts (タイムスタンプ) を指定しないと:
 *   1. env RELEASE_LOG_TS から取得
 *   2. dist/release-logs/.current から取得 (PR6: 永続化 fallback)
 *   3. 現在時刻で新規生成
 * 出力: dist/release-logs/<ts>-android/{02-snapshot-before.json | 05-snapshot-after.json}
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  loadServiceAccount,
  getAccessToken,
  createEdit,
  getTracks,
  getListings,
} from './release-utils/publisher-api.mjs';

const PACKAGE_NAME = 'com.dooooraku.bonsailog';
const SA_PATH = './secrets/google-service-account.json';
const CURRENT_FILE = path.resolve('dist/release-logs/.current');

function resolveTS(tsArg) {
  if (tsArg) return tsArg;
  if (process.env.RELEASE_LOG_TS) return process.env.RELEASE_LOG_TS;
  if (existsSync(CURRENT_FILE)) return readFileSync(CURRENT_FILE, 'utf8').trim();
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function main() {
  const phase = process.argv[2];
  const tsArg = process.argv[3];
  if (!['before', 'after'].includes(phase)) {
    console.error('Usage: release-snapshot.mjs before|after [ts]');
    process.exit(1);
  }
  const ts = resolveTS(tsArg);

  const sa = loadServiceAccount(SA_PATH);
  const token = await getAccessToken(sa);
  const edit = await createEdit(token, PACKAGE_NAME);
  const editId = edit.id;

  const [tracks, listings] = await Promise.all([
    getTracks(token, PACKAGE_NAME, editId),
    getListings(token, PACKAGE_NAME, editId),
  ]);

  const alpha = tracks.tracks?.find((t) => t.track === 'alpha');
  const drafts = alpha?.releases?.filter((r) => r.status === 'draft') ?? [];
  const completed = alpha?.releases?.filter((r) => r.status === 'completed') ?? [];
  const latestVersionCode = completed[0]?.versionCodes?.[0] ?? null;

  const snapshot = {
    snapshotAt: new Date().toISOString(),
    phase,
    packageName: PACKAGE_NAME,
    editId,
    track: 'alpha',
    latestVersionCode,
    releases: alpha?.releases ?? [],
    drafts,
    listings: (listings.listings ?? []).map((l) => ({
      language: l.language,
      title: l.title,
      shortDescription: l.shortDescription?.slice(0, 60),
    })),
  };

  const dir = path.resolve(`dist/release-logs/${ts}-android`);
  await mkdir(dir, { recursive: true });
  const filename = phase === 'before' ? '02-snapshot-before.json' : '05-snapshot-after.json';
  const fullPath = path.join(dir, filename);
  await writeFile(fullPath, JSON.stringify(snapshot, null, 2) + '\n');

  console.log(`[snapshot:${phase}] saved → ${fullPath}`);
  console.log(`  alpha latest versionCode: ${latestVersionCode}`);
  console.log(`  alpha drafts: ${drafts.length}`);
  console.log(
    `  listing languages: ${(listings.listings ?? []).map((l) => l.language).join(', ')}`,
  );
  console.log(`  TS=${ts}`);
}

main().catch((e) => {
  console.error('[snapshot] failed:', e.message);
  process.exit(1);
});
