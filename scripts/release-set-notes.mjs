#!/usr/bin/env node
/**
 * release-set-notes.mjs — EAS Submit が扱わない release notes を Publisher API で別途 PUT (Sess61 PR6)
 *
 * Usage:
 *   node scripts/release-set-notes.mjs <ts>
 *   (env RELEASE_LOG_TS or .current で ts 自動解決も可)
 *
 * 動作:
 *   1. dist/release-logs/<ts>-android/05-snapshot-after.json から新 draft の versionCode を取得
 *   2. fastlane/metadata/<fastlaneCode>/release_notes.txt を読む (en-US / ja)
 *   3. BCP-47 mapping (ja → ja-JP) で Play Console 用言語コードへ変換
 *   4. publisher-api.mjs setReleaseNotes で Publisher API へ PUT + commit
 *
 * 設計理由:
 *   EAS Submit Android は release notes を扱わない公式仕様 (2026-05-31 確認):
 *   "EAS Submit uploads your binary but does not manage store listing metadata, screenshots, or release notes."
 *   → Submit 後に Publisher API で別途 release notes を inject する必要あり (ADR-0050 PR6 Amendment)。
 *
 * SoT (Source of Truth):
 *   fastlane/metadata/<lang>/release_notes.txt (ADR-0033 i18n policy 準拠)
 *
 * BCP-47 mapping:
 *   scripts/release-utils/i18n-mapping.mjs (fastlane code → Play Console BCP-47)
 */
import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  loadServiceAccount,
  getAccessToken,
  setReleaseNotes,
} from './release-utils/publisher-api.mjs';
import { getAllMappings } from './release-utils/i18n-mapping.mjs';

const PACKAGE_NAME = 'com.dooooraku.bonsailog';
const SA_PATH = './secrets/google-service-account.json';
const TRACK = 'alpha';

function resolveTS() {
  if (process.argv[2]) return process.argv[2];
  if (process.env.RELEASE_LOG_TS) return process.env.RELEASE_LOG_TS;
  const currentFile = path.resolve('dist/release-logs/.current');
  if (existsSync(currentFile)) {
    return readFileSync(currentFile, 'utf8').trim();
  }
  console.error(
    'TS 不明 — release-set-notes.mjs <ts> または RELEASE_LOG_TS env を指定してください',
  );
  process.exit(1);
}

async function main() {
  const ts = resolveTS();
  const dir = path.resolve(`dist/release-logs/${ts}-android`);
  const snapshotPath = `${dir}/05-snapshot-after.json`;
  if (!existsSync(snapshotPath)) {
    console.error(
      `[set-notes] ${snapshotPath} がありません — Phase 5 snapshot を先に実行してください`,
    );
    process.exit(1);
  }

  const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
  const drafts = snapshot.drafts ?? [];
  if (drafts.length === 0) {
    console.error('[set-notes] draft が存在しません — Phase 4 submit が完了していますか？');
    process.exit(1);
  }

  // 最新の draft を対象に (PR6: 通常 1 件のみ存在を想定)
  const targetDraft = drafts[0];
  const versionCode = targetDraft.versionCodes?.[0];
  if (!versionCode) {
    console.error('[set-notes] target draft の versionCode が取れません', targetDraft);
    process.exit(1);
  }

  console.log(`[set-notes] target: track=${TRACK} versionCode=${versionCode} (ts=${ts})`);

  // fastlane/metadata から各言語の release notes を読む
  const notesMap = {};
  for (const { fastlane, play } of getAllMappings()) {
    const notesPath = path.resolve(`fastlane/metadata/${fastlane}/release_notes.txt`);
    if (!existsSync(notesPath)) {
      console.warn(`[set-notes] ⚠️ ${notesPath} なし、 ${play} はスキップ`);
      continue;
    }
    const text = readFileSync(notesPath, 'utf8').trim();
    if (!text) {
      console.warn(`[set-notes] ⚠️ ${notesPath} が空、 ${play} はスキップ`);
      continue;
    }
    notesMap[play] = text;
    console.log(`  ${play}: ${text.slice(0, 60).replace(/\n/g, ' ')}...`);
  }

  if (Object.keys(notesMap).length === 0) {
    console.error(
      '[set-notes] 投稿対象の release notes がありません (fastlane/metadata に内容なし)',
    );
    process.exit(1);
  }

  // Publisher API で release notes を PUT + commit
  const sa = loadServiceAccount(SA_PATH);
  const token = await getAccessToken(sa);
  const result = await setReleaseNotes(token, PACKAGE_NAME, TRACK, versionCode, notesMap);
  console.log(`[set-notes] ✅ release notes injected:`);
  console.log(`  editId: ${result.editId}`);
  console.log(`  versionCode: ${result.targetVc}`);
  console.log(`  languages: ${result.languagesInjected.join(', ')}`);
}

main().catch((e) => {
  console.error('[set-notes] failed:', e.message);
  process.exit(1);
});
