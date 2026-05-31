#!/usr/bin/env node
/**
 * store-add-ja-jp.mjs — Play Console ストア掲載 ja-JP 言語を Publisher API で自動追加 (Sess61 PR4)
 *
 * Usage:
 *   node scripts/store-add-ja-jp.mjs              # dry-run (PUT body プレビューのみ、 API 呼び出しなし)
 *   node scripts/store-add-ja-jp.mjs --commit     # 実 PUT + commit edit (Console 反映、 再審査トリガー)
 *
 * 原稿:
 *   fastlane/metadata/ja/name.txt           → title (~30 chars)
 *   fastlane/metadata/ja/subtitle.txt       → shortDescription (~80 chars)
 *   fastlane/metadata/ja/description.txt    → fullDescription (~4000 chars)
 *
 * 原稿が App Store 用テンプレート placeholder のままの場合は abort。
 * 原稿生成は `/store-text` Skill (.claude/skills/store-text/) で別途実施。
 *
 * 制約:
 *   - 製品アイコン / スクリーンショット (graphics) は本スクリプト対象外 (`edits.images` 別 endpoint、 必要なら別途実装)
 *   - --commit は再審査をトリガー (24〜48h)、 Closed testing 配布は止まらない
 *   - SoT: fastlane/metadata/ja/*.txt (ADR-0033 i18n policy 準拠)
 */
import { readFileSync } from 'node:fs';
import {
  loadServiceAccount,
  getAccessToken,
  createEdit,
  updateListing,
  commitEdit,
} from './release-utils/publisher-api.mjs';

const PACKAGE_NAME = 'com.dooooraku.bonsailog';
const SA_PATH = './secrets/google-service-account.json';

const args = process.argv.slice(2);
const isCommit = args.includes('--commit');

const PLACEHOLDER_MARKERS = [
  '{{APP_NAME}}',
  '{{',
  '説明文（4000文字',
  '30文字以内）',
  'App tagline',
  'description (max',
  'Key features:',
  '主要機能:',
];

function readMetadata(file) {
  const fullPath = `fastlane/metadata/ja/${file}`;
  const content = readFileSync(fullPath, 'utf8').trim();
  for (const marker of PLACEHOLDER_MARKERS) {
    if (content.includes(marker)) {
      throw new Error(
        `${fullPath} がテンプレ placeholder のまま (marker: "${marker}")。\n` +
          `/store-text Skill で日本語原稿を生成してから再実行してください。`,
      );
    }
  }
  return content;
}

async function main() {
  console.log('🌱 Play Console ja-JP listing 自動追加 (Sess61 PR4)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`mode: ${isCommit ? '--commit (実 PUT + commit edit)' : 'dry-run'}`);
  console.log('');

  // 原稿読み取り (placeholder なら例外)
  const title = readMetadata('name.txt');
  const shortDescription = readMetadata('subtitle.txt');
  const fullDescription = readMetadata('description.txt');

  // 文字数制限の警告
  if (title.length > 30)
    console.warn(`⚠️ title が 30 文字超 (${title.length} chars): "${title.slice(0, 30)}..."`);
  if (shortDescription.length > 80)
    console.warn(`⚠️ shortDescription が 80 文字超 (${shortDescription.length} chars)`);
  if (fullDescription.length > 4000)
    console.warn(`⚠️ fullDescription が 4000 文字超 (${fullDescription.length} chars)`);

  const body = {
    language: 'ja-JP',
    title,
    shortDescription,
    fullDescription,
  };

  console.log('--- PUT body preview ---');
  console.log(JSON.stringify(body, null, 2).slice(0, 600));
  console.log(
    `(title=${title.length} chars / shortDescription=${shortDescription.length} chars / fullDescription=${fullDescription.length} chars)`,
  );
  console.log('');

  if (!isCommit) {
    console.log('💡 dry-run: 実 API 呼び出しはしません。');
    console.log('   実投稿は `node scripts/store-add-ja-jp.mjs --commit`');
    console.log('   ⚠️ --commit は不可逆 + Console 反映 + 再審査 24-48h トリガー');
    return;
  }

  // --commit: 実 PUT + commit edit
  console.log('🔥 --commit mode: Publisher API に PUT + commit edit を実行...');
  const sa = loadServiceAccount(SA_PATH);
  const token = await getAccessToken(sa);
  const edit = await createEdit(token, PACKAGE_NAME);
  console.log(`  editId: ${edit.id}`);

  const updateResult = await updateListing(token, PACKAGE_NAME, edit.id, 'ja-JP', body);
  console.log(
    `  ✅ updateListing OK: language=${updateResult.language} title="${(updateResult.title ?? '').slice(0, 30)}..."`,
  );

  const commitResult = await commitEdit(token, PACKAGE_NAME, edit.id);
  console.log(`  ✅ commitEdit OK: editId=${commitResult.id ?? 'committed'}`);

  console.log('');
  console.log('✅ ja-JP listing 追加完了。 Play Console → ダッシュボード → 掲載情報 で確認可能。');
  console.log('   ⚠️ 再審査 (24-48h) がトリガーされます。 Closed testing 配布は止まりません。');
}

main().catch((e) => {
  console.error('[store-add-ja-jp] failed:', e.message);
  process.exit(1);
});
