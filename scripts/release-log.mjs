#!/usr/bin/env node
/**
 * release-log.mjs — リリースログ管理 (Sess61 PR2 + PR6)
 *
 * Usage:
 *   node scripts/release-log.mjs init           # 新タイムスタンプ発行 + ディレクトリ作成 + .current 永続化 (PR6)
 *   node scripts/release-log.mjs summary        # RELEASE_LOG_TS or .current から summary.md 生成
 *   node scripts/release-log.mjs cleanup        # 直近 10 ディレクトリのみ保持、 .current は温存
 *   node scripts/release-log.mjs current        # 現在の RELEASE_LOG_TS を stdout に出す (PR6)
 *
 * ログ構造 (dist/release-logs/<ts>-android/):
 *   00-preflight.json       — preflight 結果
 *   01-auto-fix.log         — auto-fix の修復ログ
 *   02-snapshot-before.json — Play Console 状態 (Submit 前)
 *   03-build.log            — AAB ビルドログ
 *   04-submit.log           — EAS Submit ログ + submit ID + setReleaseNotes ログ
 *   05-snapshot-after.json  — Play Console 状態 (Submit 後 + release notes 投稿後)
 *   06-diff.json            — 差分検証結果
 *   summary.md              — user 向けまとめ
 *
 * 永続化ファイル (PR6):
 *   dist/release-logs/.current — 最新の RELEASE_LOG_TS (cleanup 対象外)
 */
import { mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const LOG_ROOT = path.resolve('dist/release-logs');
const CURRENT_FILE = path.join(LOG_ROOT, '.current');
const KEEP = 10;

// Play Console URL を eas.json / app.json から組み立てる (PR6 — 改善 #6)
async function buildPlayConsoleUrl() {
  // 簡易実装: packageName は config から取得、 developerId / appId は未取得のため
  // placeholder URL を出すが、 user に「Console ホームから探してください」 案内する形に変更
  const fallback =
    'https://play.google.com/console/u/0/ (左メニュー: テストとリリース → テスト → クローズドテスト)';
  try {
    const cfgPath = path.resolve('scripts/store-automation/config.bonsailog.json');
    if (existsSync(cfgPath)) {
      const cfg = JSON.parse(await readFile(cfgPath, 'utf8'));
      const pkg = cfg?.google?.packageName;
      if (pkg) {
        return `https://play.google.com/console/u/0/ (左メニュー: テストとリリース → テスト → クローズドテスト、 アプリ package=${pkg})`;
      }
    }
  } catch {
    /* fall through */
  }
  return fallback;
}

async function cmdInit() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(LOG_ROOT, `${ts}-android`);
  await mkdir(dir, { recursive: true });
  // PR6: .current ファイルに永続化 (RELEASE_LOG_TS env が揮発しても復元可)
  await writeFile(CURRENT_FILE, ts + '\n');
  console.log(ts); // caller が捕捉して RELEASE_LOG_TS 環境変数に流す
}

async function cmdCurrent() {
  // PR6: .current ファイルから読み出し (env 未設定時の fallback)
  if (!existsSync(CURRENT_FILE)) {
    console.error('.current ファイルなし — release-log.mjs init を先に実行してください');
    process.exit(1);
  }
  const ts = (await readFile(CURRENT_FILE, 'utf8')).trim();
  console.log(ts);
}

async function resolveTS() {
  // PR6: env 優先、 fallback で .current
  if (process.env.RELEASE_LOG_TS) return process.env.RELEASE_LOG_TS;
  if (existsSync(CURRENT_FILE)) {
    return (await readFile(CURRENT_FILE, 'utf8')).trim();
  }
  console.error('RELEASE_LOG_TS env も .current ファイルもなし — release-log.mjs init を先に実行');
  process.exit(1);
}

async function cmdSummary() {
  const ts = await resolveTS();
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

  const consoleUrl = await buildPlayConsoleUrl();

  // PR6: critical pass = warning を除いた pass、 user の「次にやること」 判定
  const criticalPass = diff?.criticalPass ?? diff?.allPass;
  const warnings = diff?.warnings ?? [];

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
              `- ${c.pass ? '✅' : c.warning ? '⚠️' : '❌'} ${c.label}${c.warning ? ' (warning)' : ''}: expected=${c.expected} actual=${c.actual}`,
          )
          .join('\n')
      : '- (diff 未実行)',
    warnings.length > 0 ? '\n## Warnings\n' + warnings.map((w) => `- ⚠️ ${w}`).join('\n') : '',
    '',
    '## 次にやること',
    criticalPass
      ? [
          `1. Play Console を開く: ${consoleUrl}`,
          `2. Alpha track の Draft (versionCode ${diff?.newVersionCodes?.[0] ?? '?'}) を確認`,
          '3. 「リリースを確認」 → 「ロールアウトを開始」 を 1 クリック',
          '4. テスター 12 人のスマホに配信開始',
        ].join('\n')
      : `❌ Submit が想定通り完了していません。 logs (${dir}) を確認してください。`,
    '',
    '## Fallback (PC オフライン / WSL2 切断時)',
    '```',
    'git tag v0.x.y && git push --tags',
    '# → GitHub Actions (build-android-play.yml) でサーバー側自動実行',
    '```',
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
    console.log(`[log:cleanup] .current は温存 (PR6 永続化)`);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

async function main() {
  const cmd = process.argv[2];
  if (cmd === 'init') await cmdInit();
  else if (cmd === 'summary') await cmdSummary();
  else if (cmd === 'cleanup') await cmdCleanup();
  else if (cmd === 'current') await cmdCurrent();
  else {
    console.error('Usage: release-log.mjs (init|summary|cleanup|current)');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('[release-log] failed:', e.message);
  process.exit(1);
});
