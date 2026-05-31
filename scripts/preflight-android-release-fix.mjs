/**
 * preflight-android-release-fix.mjs — preflight 修復ロジック (Sess61 PR2)
 *
 * preflight-android-release.mjs から動的 import される。
 * 各 fixer は副作用を残す + 修復ログ文字列を返す (caller が 01-auto-fix.log に集約)。
 */
import {
  existsSync,
  writeFileSync,
  readFileSync,
  symlinkSync,
  mkdirSync,
  appendFileSync,
} from 'node:fs';

const SA_REL = '../../../docs/01_key/02_PlayStore/spry-catcher-482116-c4-5ca425301daf.json';

const FIXERS = {
  'A-5': () => {
    if (!existsSync('secrets')) mkdirSync('secrets', { recursive: true });
    if (existsSync('secrets/google-service-account.json')) {
      return `symlink 既存`;
    }
    symlinkSync(SA_REL, 'secrets/google-service-account.json');
    return `symlinkSync(${SA_REL}, secrets/google-service-account.json)`;
  },
  'A-6': () => {
    const gi = existsSync('.gitignore') ? readFileSync('.gitignore', 'utf8') : '';
    if (/^\/?secrets\/?$/m.test(gi)) return 'gitignore 既存';
    appendFileSync('.gitignore', '\nsecrets/\n');
    return 'append .gitignore += "secrets/"';
  },
  // PR6: A-7 (whatsnew/ チェック) は廃止、 fastlane/metadata SoT 一本化
  // A-7 / A-7b (fastlane/metadata 存在チェック) は preflight 側で fixable=false 設定のため修復ロジック不要
  'B-1': () => fixEasJson({ track: 'alpha' }, 'track=alpha'),
  'B-2': () => fixEasJson({ releaseStatus: 'draft' }, 'releaseStatus=draft'),
  'B-3': () => fixEasJson({ changesNotSentForReview: true }, 'changesNotSentForReview=true'),
};

// E グループ (GitHub Secrets) は user 認証下の `gh secret set` を Claude が代行する設計
// (PR3 で実装、 PR2 の preflight では検査のみ。 fixable=true 表示でも --auto-fix では skip)
//
// 将来的に下記のような fixer を追加する場合は user 承認が必要:
//
// 'E-GOOGLE_SERVICE_ACCOUNT_JSON_BASE64': () => {
//   const b64 = execSync(
//     'base64 -w0 docs/01_key/02_PlayStore/spry-catcher-482116-c4-5ca425301daf.json',
//     { encoding: 'utf8' }
//   ).trim();
//   execSync(`gh secret set GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 --body "${b64}"`);
//   return 'gh secret set GOOGLE_SERVICE_ACCOUNT_JSON_BASE64';
// },

function fixEasJson(updates, summary) {
  const easJson = JSON.parse(readFileSync('eas.json', 'utf8'));
  if (!easJson.submit) easJson.submit = {};
  if (!easJson.submit.production) easJson.submit.production = {};
  if (!easJson.submit.production.android) easJson.submit.production.android = {};
  Object.assign(easJson.submit.production.android, updates);
  writeFileSync('eas.json', JSON.stringify(easJson, null, 2) + '\n');
  return `eas.json submit.production.android.${summary}`;
}

export async function fix(result) {
  const fixer = FIXERS[result.id];
  if (!fixer)
    throw new Error(
      `fixer 未定義: ${result.id} (Phase 2 検査側で fixable=true としていても実装側が未対応)`,
    );
  return fixer();
}
