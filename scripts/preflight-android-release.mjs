#!/usr/bin/env node
/**
 * preflight-android-release.mjs — Android リリース前検査 (Sess61 PR2)
 *
 * Usage:
 *   pnpm preflight:android              # A〜D グループ検査
 *   pnpm preflight:android --ci         # E/F グループ (GitHub Secrets + workflow) も検査
 *   pnpm preflight:android --auto-fix   # 修復可能項目を一括修復
 *
 * 検査グループ:
 *   [A] ローカル環境 (.env, secrets, whatsnew, git, eas-cli)
 *   [B] eas.json (track, releaseStatus, changesNotSentForReview, sa path)
 *   [C] package.json scripts
 *   [D] Play Console API 読み取り (track 存在, listings, versionCode)
 *   [E] GitHub Secrets (--ci 時のみ)
 *   [F] GitHub workflow ファイル (--ci 時のみ)
 *
 * 出力:
 *   ターミナル: ✅/❌/🔧 一覧 + 集計
 *   ファイル: RELEASE_LOG_TS 環境がある場合 dist/release-logs/<ts>-android/00-preflight.json
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { config } from 'dotenv';

config();

const isCI = process.argv.includes('--ci');
const autoFix = process.argv.includes('--auto-fix');

const results = [];

function add(id, label, pass, detail = '', fixable = false) {
  results.push({ id, label, pass, detail, fixable });
}

// === A グループ: ローカル環境 ===
const ANDROID_KEYS = [
  'REVENUECAT_ANDROID_API_KEY',
  'ADMOB_ANDROID_APP_ID',
  'ADMOB_ANDROID_BANNER_ID',
];
const ADMOB_PATTERN = /^ca-app-pub-\d{16}[~/]\d{10}$/;

const envSnapshot = { ...process.env };
for (const key of ANDROID_KEYS) {
  const v = envSnapshot[key];
  if (!v || v.trim() === '') {
    add(`A-${key}`, `.env: ${key}`, false, '空 / 未設定 — .env に追加してください', false);
  } else if (key.startsWith('ADMOB_') && !ADMOB_PATTERN.test(v)) {
    add(
      `A-${key}`,
      `.env: ${key}`,
      false,
      `形式不正 (期待: ca-app-pub-XXX~YYY): ${v.slice(0, 20)}...`,
    );
  } else {
    add(`A-${key}`, `.env: ${key}`, true, `${v.length} chars`);
  }
}

(function checkSecretsFile() {
  const p = 'secrets/google-service-account.json';
  if (!existsSync(p))
    return add(
      'A-5',
      `${p} 存在`,
      false,
      '未配置 (実体: docs/01_key/02_PlayStore/spry-catcher-*.json)',
      true,
    );
  try {
    const j = JSON.parse(readFileSync(p, 'utf8'));
    add('A-5', `${p} 読み取り`, true, `client_email=${j.client_email}`);
  } catch (e) {
    add('A-5', `${p} 読み取り`, false, `JSON 読み取り失敗: ${e.message}`, true);
  }
})();

(function checkGitignore() {
  let gi = '';
  try {
    gi = readFileSync('.gitignore', 'utf8');
  } catch {
    /* empty */
  }
  const protected_ = /^\/?secrets\/?$/m.test(gi);
  add(
    'A-6',
    '.gitignore で secrets/ 保護',
    protected_,
    protected_ ? '' : '.gitignore に secrets/ が無い',
    !protected_,
  );
})();

add(
  'A-7',
  'whatsnew/whatsnew-en-US.txt 存在',
  existsSync('whatsnew/whatsnew-en-US.txt'),
  existsSync('whatsnew/whatsnew-en-US.txt')
    ? ''
    : '未作成 (fastlane/metadata/en-US/release_notes.txt から流用可)',
  !existsSync('whatsnew/whatsnew-en-US.txt'),
);

(function checkGitClean() {
  try {
    const out = execSync('git status --porcelain', { encoding: 'utf8' });
    if (out.trim() === '') return add('A-8', 'git status クリーン', true);
    const lines = out.split('\n').filter(Boolean).length;
    add(
      'A-8',
      'git status クリーン',
      false,
      `untracked/modified ${lines} 件 — commit/stash してから再実行`,
    );
  } catch (e) {
    add('A-8', 'git status', false, e.message);
  }
})();

(function checkBranchSync() {
  try {
    const local = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    let remote = '';
    try {
      remote = execSync('git rev-parse @{u} 2>/dev/null', { encoding: 'utf8' }).trim();
    } catch {
      return add(
        'A-9',
        'upstream branch 設定',
        false,
        'upstream 未設定 — git push -u してください',
      );
    }
    add(
      'A-9',
      'main ブランチ同期',
      local === remote,
      local === remote ? '' : 'local と upstream の SHA 不一致 — pull/push してください',
    );
  } catch (e) {
    add('A-9', 'git sync', false, e.message);
  }
})();

(function checkEasCli() {
  try {
    const out = execSync('npx --yes eas-cli@latest whoami 2>/dev/null', {
      encoding: 'utf8',
      timeout: 30000,
    }).trim();
    add('A-10', 'eas-cli ログイン', !!out, out ? `user=${out}` : 'eas login してください');
  } catch {
    add('A-10', 'eas-cli', false, 'eas login が必要 (or eas-cli インストール失敗)');
  }
})();

// === B グループ: eas.json ===
const easJson = (() => {
  try {
    return JSON.parse(readFileSync('eas.json', 'utf8'));
  } catch {
    return null;
  }
})();
const submitAndroid = easJson?.submit?.production?.android ?? {};

add(
  'B-1',
  `eas.json track="alpha"`,
  submitAndroid.track === 'alpha',
  `現状: ${submitAndroid.track ?? '(未設定)'}`,
  submitAndroid.track !== 'alpha',
);
add(
  'B-2',
  `eas.json releaseStatus="draft"`,
  submitAndroid.releaseStatus === 'draft',
  `現状: ${submitAndroid.releaseStatus ?? '(未設定)'}`,
  submitAndroid.releaseStatus !== 'draft',
);
add(
  'B-3',
  `eas.json changesNotSentForReview=true`,
  submitAndroid.changesNotSentForReview === true,
  submitAndroid.changesNotSentForReview === true
    ? ''
    : '未設定 — API submit 永遠ペンディング罠の予防',
  submitAndroid.changesNotSentForReview !== true,
);
add(
  'B-4',
  `eas.json serviceAccountKeyPath`,
  submitAndroid.serviceAccountKeyPath === './secrets/google-service-account.json',
  `現状: ${submitAndroid.serviceAccountKeyPath ?? '(未設定)'}`,
);

// === C グループ: package.json scripts ===
const pkg = (() => {
  try {
    return JSON.parse(readFileSync('package.json', 'utf8'));
  } catch {
    return null;
  }
})();
for (const s of [
  'submit:android',
  'release:android',
  'release:android:dry-run',
  'preflight:android',
]) {
  add(
    `C-${s}`,
    `package.json scripts.${s}`,
    !!pkg?.scripts?.[s],
    pkg?.scripts?.[s] ? `(${pkg.scripts[s].slice(0, 60)}...)` : '未定義',
  );
}

// === D グループ: Play Console API ===
async function checkPlayConsole() {
  try {
    const mod = await import('./release-utils/publisher-api.mjs');
    const sa = mod.loadServiceAccount('./secrets/google-service-account.json');
    const token = await mod.getAccessToken(sa);
    const PACKAGE_NAME = 'com.dooooraku.bonsailog';
    const edit = await mod.createEdit(token, PACKAGE_NAME);
    const [tracks, listings] = await Promise.all([
      mod.getTracks(token, PACKAGE_NAME, edit.id),
      mod.getListings(token, PACKAGE_NAME, edit.id),
    ]);
    const alpha = tracks.tracks?.find((t) => t.track === 'alpha');
    const langs = (listings.listings ?? []).map((l) => l.language);
    add(
      'D-1',
      'Alpha track 存在',
      !!alpha,
      alpha ? '' : 'Console で Closed testing → Alpha を作成',
    );
    add(
      'D-2',
      'ストア掲載 en-US 存在',
      langs.includes('en-US'),
      langs.includes('en-US') ? '' : 'Console で en-US listing を作成',
    );
    add(
      'D-3',
      'ストア掲載 ja-JP 存在 (任意)',
      langs.includes('ja-JP'),
      langs.includes('ja-JP') ? '' : 'PR4 で ja-JP listing 自動追加予定',
    );
    const completed = alpha?.releases?.filter((r) => r.status === 'completed') ?? [];
    const latest = completed[0]?.versionCodes?.[0];
    add(
      'D-4',
      'Alpha 最新 versionCode 取得',
      !!latest,
      latest ? `latest=${latest} (次の build は ${Number(latest) + 1} 以上)` : 'リリース履歴なし',
    );
  } catch (e) {
    add('D-1', 'Play Console API 接続', false, `接続失敗: ${e.message.slice(0, 100)}`);
  }
}

// === E グループ: GitHub Secrets (--ci 時) ===
async function checkGitHubSecrets() {
  const required = [
    'EXPO_TOKEN',
    'GOOGLE_SERVICE_ACCOUNT_JSON_BASE64',
    'REVENUECAT_ANDROID_API_KEY',
    'ADMOB_ANDROID_APP_ID',
    'ADMOB_ANDROID_BANNER_ID',
  ];
  try {
    const out = execSync('gh secret list 2>&1', { encoding: 'utf8' });
    for (const key of required) {
      const found = out.includes(key);
      add(
        `E-${key}`,
        `GitHub Secret: ${key}`,
        found,
        found ? '' : '未登録 (PR3 で gh secret set 自動登録予定)',
        !found && key !== 'EXPO_TOKEN',
      );
    }
  } catch (e) {
    add(
      'E-1',
      'GitHub Secrets 一覧取得',
      false,
      `gh auth status を確認: ${e.message.slice(0, 80)}`,
    );
  }
}

// === F グループ: workflow ファイル (--ci 時) ===
function checkWorkflow() {
  const exists = existsSync('.github/workflows/build-android-play.yml');
  add(
    'F-1',
    '.github/workflows/build-android-play.yml 存在',
    exists,
    exists ? '' : '未作成 (PR3 で起票予定)',
    false,
  );
}

// === Main ===
async function main() {
  await checkPlayConsole();
  if (isCI) {
    await checkGitHubSecrets();
    checkWorkflow();
  }

  console.log('🌱 BonsaiLog Android Release Preflight v1.0');
  console.log('═══════════════════════════════════════════════════════════');
  let passCount = 0;
  let failCount = 0;
  let fixableCount = 0;
  for (const r of results) {
    const icon = r.pass ? '✅' : r.fixable ? '🔧' : '❌';
    console.log(`${icon} ${r.id}: ${r.label}${r.detail ? ' — ' + r.detail : ''}`);
    if (r.pass) passCount++;
    else {
      failCount++;
      if (r.fixable) fixableCount++;
    }
  }
  console.log('═══════════════════════════════════════════════════════════');
  console.log(
    `合計 ${results.length} / ✅ ${passCount} / ❌ ${failCount - fixableCount} / 🔧 ${fixableCount} (修復可能)`,
  );

  if (process.env.RELEASE_LOG_TS) {
    const dir = path.resolve(`dist/release-logs/${process.env.RELEASE_LOG_TS}-android`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      `${dir}/00-preflight.json`,
      JSON.stringify(
        {
          total: results.length,
          pass: passCount,
          fail: failCount - fixableCount,
          fixable: fixableCount,
          results,
        },
        null,
        2,
      ) + '\n',
    );
  }

  if (autoFix && fixableCount > 0) {
    console.log('\n--auto-fix: 修復可能項目を順次修復');
    const fixerMod = await import('./preflight-android-release-fix.mjs');
    const fixLog = [];
    for (const r of results) {
      if (!r.pass && r.fixable) {
        try {
          const log = await fixerMod.fix(r);
          fixLog.push({ id: r.id, status: 'success', log });
          console.log(`  🔧 ${r.id} 修復成功`);
        } catch (e) {
          fixLog.push({ id: r.id, status: 'failed', error: e.message });
          console.error(`  ❌ ${r.id} 修復失敗: ${e.message}`);
        }
      }
    }
    if (process.env.RELEASE_LOG_TS) {
      const dir = path.resolve(`dist/release-logs/${process.env.RELEASE_LOG_TS}-android`);
      writeFileSync(
        `${dir}/01-auto-fix.log`,
        fixLog.map((e) => `[${e.id}] ${e.status}: ${e.log ?? e.error ?? ''}`).join('\n') + '\n',
      );
    }
    console.log('修復完了。 `pnpm preflight:android` でもう一度確認してください。');
    return;
  }

  if (failCount > 0 && !autoFix) {
    console.log('\n💡 修復可能項目は `pnpm preflight:android --auto-fix` で一括修復できます。');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('[preflight] failed:', e.message);
  process.exit(1);
});
