#!/usr/bin/env node
// scripts/ui-diff/generate-pairing-report.mjs (v2、mockup 主導 + multi-page 対応)
//
// MOCKUP_SCREENSHOTS (41 件) を主軸に、SCREEN_PAIRS (23 件) を紐付けで参照し、
// 各 entry の mockup PNG (multi-page 対応) と実機 SS を横並び縦並びで表示する HTML レポート。
//
// 主な機能 (Sess1 PR-3 v2、2026-05-16 ultrathink 議論承認 案 2 + 方法 X + 案 Q + 案 J):
// - 全 41 mockup 画面を表示 (SCREEN_PAIRS 23 件しか表示しなかった v1 の問題解消)
// - 並び順: 01-Onboarding → 02-Home → 04-Export → 05-Monetization の HTML グループ順
// - multi-page mockup PNG (<id>-01.png, -02.png, ...) を全部 縦並び inline 表示
// - 紐付け方法 X: mockupFile ベース (SCREEN_PAIRS の mockupFile から逆引き)
// - status 5 区分: ✅整合済 / ⚠️要再評価 / ⏸️永続 skip / 🟡未測定 / 📋 mockup-only
// - ATT/UMP は強制 📋 mockup-only + ADR-0017 ラベル
//
// 起動: node scripts/ui-diff/generate-pairing-report.mjs (or pnpm ui-diff:pairing-report)
// 出力: scripts/ui-diff/out/pairing-report.html
// 開く: ブラウザ (Chrome/Edge) で WSL2 path 経由でアクセス。

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(here), '../..');

const MOCKUP_DIR = path.join(REPO_ROOT, 'docs/mockups/v1.0/screenshots');
const SKIP_LIST_PATH = path.join(REPO_ROOT, 'scripts/ui-diff/skip-list.json');
const CONFIG_PATH = path.join(REPO_ROOT, 'scripts/ui-diff/config.ts');
const MOCKUP_CONFIG_PATH = path.join(REPO_ROOT, 'scripts/ui-diff/mockup-screenshots-config.ts');
const OUT_DIR = path.join(REPO_ROOT, 'scripts/ui-diff/out');
const OUTPUT_PATH = path.join(OUT_DIR, 'pairing-report.html');

// HTML グループ順 (user 指定 2026-05-16): 01 → 02 → 04 → 05
const HTML_ORDER = ['01-Onboarding.html', '02-Home.html', '04-Export.html', '05-Monetization.html'];

// mockup-only と扱う画面 (実機独自画面なし、撮影対象外):
// - ADR-0017: ATT/UMP は OS 標準ダイアログのみ採用
// - ADR-0018 §②: Splash は Expo SplashScreen 採用、独自描画なし、OS 起動と統合のため実機 SS 撮影不可
const MOCKUP_ONLY_IDS = new Set(['onboarding-att', 'onboarding-ump', 'onboarding-splash']);

// MOCKUP_SCREENSHOTS をパース (entry 41 件、id + html + selector + description + mode)
function parseMockupScreenshots() {
  const src = readFileSync(MOCKUP_CONFIG_PATH, 'utf8');
  const entries = [];
  const blockRegex =
    /\{[^}]*id:\s*'([a-z][a-z0-9-]*)',[^}]*html:\s*'([^']+)',[^}]*selector:\s*'([^']+)',[^}]*description:\s*'([^']+)',?(?:[^}]*mode:\s*'([^']+)')?[^}]*\}/g;
  let m;
  while ((m = blockRegex.exec(src)) !== null) {
    entries.push({
      id: m[1],
      html: m[2],
      selector: m[3],
      description: m[4],
      mode: m[5] || 'static',
    });
  }
  return entries;
}

// SCREEN_PAIRS を行ベースでパース (id + mockupFile)、本 v2 では mockupFile 逆引き用のみ使用
function parseScreenPairs() {
  const src = readFileSync(CONFIG_PATH, 'utf8');
  const lines = src.split('\n');
  const entries = [];
  let current = null;
  let depth = 0;
  for (const line of lines) {
    const startMatch = line.match(/^ {2}(?:'([a-z][a-z-]*?)'|([a-z][a-z-]*?)):\s*\{/);
    if (startMatch && current === null) {
      current = { id: startMatch[1] || startMatch[2], mockupFile: null };
      depth = 1;
      continue;
    }
    if (current !== null) {
      depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      const mockupMatch = line.match(/mockupFile:\s*'([^']+)'/);
      if (mockupMatch) current.mockupFile = mockupMatch[1];
      if (depth <= 0) {
        entries.push(current);
        current = null;
        depth = 0;
      }
    }
  }
  return entries;
}

// skip-list.json から achieved / skipped マップを取得
function parseSkipList() {
  const data = JSON.parse(readFileSync(SKIP_LIST_PATH, 'utf8'));
  const achievedMap = new Map();
  for (const e of data.achieved || []) achievedMap.set(e.flow, e);
  const skippedMap = new Map();
  for (const e of data.skipped || []) skippedMap.set(e.flow, e);
  return { achievedMap, skippedMap };
}

// mockup PNG を multi-page 対応で列挙 (<id>.png 単独 or <id>-01.png, -02.png, ...)
function findMockupPages(id) {
  if (!existsSync(MOCKUP_DIR)) return [];
  const files = readdirSync(MOCKUP_DIR);
  // 1) <id>.png 単独 (static mode)
  if (files.includes(`${id}.png`)) {
    return [path.join(MOCKUP_DIR, `${id}.png`)];
  }
  // 2) <id>-NN.png 連番 (scrollable mode、NN は 2 桁 0 詰め想定だが緩く match)
  const pageRegex = new RegExp(`^${id.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}-(\\d+)\\.png$`);
  const pages = files
    .filter((f) => pageRegex.test(f))
    .sort()
    .map((f) => path.join(MOCKUP_DIR, f));
  return pages;
}

// 実機 SS PNG を multi-page 対応で列挙 (artifact dir 内の PNG 全件)
// capture-app.sh は <artifact>/app/<id>.png に保存する (新形式)、
// 旧 batch script は <artifact>/<id>.png 直下保存 (互換)。両方対応する。
function findAppShots(artifactPath, id) {
  if (!artifactPath) return [];
  const dir = path.join(REPO_ROOT, artifactPath);
  if (!existsSync(dir)) return [];

  const appDir = path.join(dir, 'app');
  const searchDirs = existsSync(appDir) ? [appDir, dir] : [dir];

  for (const searchDir of searchDirs) {
    const files = readdirSync(searchDir).filter((f) => f.endsWith('.png'));
    if (files.length === 0) continue;
    // 優先: <id>.png > <id>-XX.png 連番
    const idPng = files.includes(`${id}.png`) ? [`${id}.png`] : [];
    const idNumbered = files.filter((f) => new RegExp(`^${id}-\\d+\\.png$`).test(f)).sort();
    if (idPng.length || idNumbered.length) {
      return [...idPng, ...idNumbered].map((f) => path.join(searchDir, f));
    }
  }

  // fallback: artifact 直下の全 PNG (順序保証なし、旧形式互換)
  const files = readdirSync(dir).filter((f) => f.endsWith('.png'));
  return files.sort().map((f) => path.join(dir, f));
}

// 画像を base64 data URI に変換
function imgToDataUri(filepath) {
  if (!filepath || !existsSync(filepath)) return null;
  const buf = readFileSync(filepath);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

// SCREEN_PAIRS の mockupFile から「mockup id」 を逆引き (方法 X)
// 例: mockupFile='bonsai-create-01.png' → mockup id='bonsai-create'
function buildMockupToScreenPairMap(screenPairs) {
  const map = new Map(); // key: mockup id, value: SCREEN_PAIRS entry id
  for (const sp of screenPairs) {
    if (!sp.mockupFile) continue;
    const base = sp.mockupFile.replace(/\.png$/, '').replace(/-\d+$/, '');
    if (!map.has(base)) map.set(base, sp.id);
  }
  return map;
}

function statusLabel(mockupId, achieved, skipped, isMockupOnly) {
  if (isMockupOnly) {
    if (mockupId === 'onboarding-splash') {
      return `<span style="color:#1976d2;">📋 mockup-only (ADR-0018 §② Expo SplashScreen 採用、独自描画なし、 OS 起動と統合のため実機 SS 撮影不可)</span>`;
    }
    return `<span style="color:#1976d2;">📋 mockup-only (ADR-0017 OS 標準ダイアログ採用)</span>`;
  }
  if (achieved) {
    const reeval = achieved.needsReeval ? ' ⚠️ 要再評価' : '';
    return `<span style="color:#2e7d32;">✅ 整合済 (lv${achieved.level || 2})${reeval}</span>`;
  }
  if (skipped) {
    return `<span style="color:#f57c00;">⏸️ 永続 skip (Issue #${skipped.trackingIssue || '?'})</span>`;
  }
  return `<span style="color:#9e9e9e;">🟡 未測定 (SCREEN_PAIRS 紐付けなし)</span>`;
}

function main() {
  const mockupEntries = parseMockupScreenshots();
  const screenPairs = parseScreenPairs();
  const mockupToSp = buildMockupToScreenPairMap(screenPairs);
  const { achievedMap, skippedMap } = parseSkipList();

  // sort: HTML グループ順 (01 → 02 → 04 → 05) + 各グループ内 declaration 順
  const grouped = new Map();
  for (const html of HTML_ORDER) grouped.set(html, []);
  for (const entry of mockupEntries) {
    if (grouped.has(entry.html)) grouped.get(entry.html).push(entry);
    else {
      if (!grouped.has(entry.html)) grouped.set(entry.html, []);
      grouped.get(entry.html).push(entry);
    }
  }

  const allRows = [];
  for (const html of grouped.keys()) {
    const entries = grouped.get(html);
    for (const entry of entries) {
      const isMockupOnly = MOCKUP_ONLY_IDS.has(entry.id);
      const spId = mockupToSp.get(entry.id);
      const achieved = spId ? achievedMap.get(spId) : undefined;
      const skipped = spId ? skippedMap.get(spId) : undefined;

      const mockupPages = findMockupPages(entry.id);
      const mockupSrcs = mockupPages.map((p) => ({
        name: path.basename(p),
        src: imgToDataUri(p),
      }));

      let appShots = [];
      // reevalArtifact (再評価時の最新撮影) を優先、 なければ初回 artifact にフォールバック。
      // 既 achieved を Sess5 以降で再撮影しても表示が古いままになる bug の修正 (2026-05-17)。
      const artifactPath =
        achieved?.reevalArtifact ||
        achieved?.artifact ||
        skipped?.reevalArtifact ||
        skipped?.artifact ||
        null;
      if (!isMockupOnly && artifactPath) {
        const paths = findAppShots(artifactPath, spId || entry.id);
        appShots = paths.map((p) => ({
          name: path.basename(p),
          src: imgToDataUri(p),
        }));
      }

      allRows.push({
        html,
        id: entry.id,
        selector: entry.selector,
        description: entry.description,
        mode: entry.mode,
        spId: spId || null,
        artifactPath,
        status: statusLabel(entry.id, achieved, skipped, isMockupOnly),
        mockupSrcs,
        appShots,
        isMockupOnly,
      });
    }
  }

  // 統計
  const total = allRows.length;
  const achievedCount = allRows.filter((r) => r.status.includes('整合済')).length;
  const skippedCount = allRows.filter((r) => r.status.includes('永続 skip')).length;
  const mockupOnlyCount = allRows.filter((r) => r.isMockupOnly).length;
  const unmeasuredCount = allRows.filter((r) => r.status.includes('未測定')).length;
  const reevalCount = allRows.filter((r) => r.status.includes('要再評価')).length;

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  // HTML 構築 (グループヘッダ + 各 row)
  const groupBlocks = [];
  for (const html of HTML_ORDER) {
    const entries = grouped.get(html) || [];
    if (entries.length === 0) continue;
    const rowsHtml = entries
      .map((entry) => {
        const r = allRows.find((row) => row.id === entry.id && row.html === html);
        if (!r) return '';
        const mockupImgs = r.mockupSrcs.length
          ? r.mockupSrcs
              .map(
                (p) =>
                  `<div class="page"><img src="${p.src}" alt="${p.name}"><div class="page-name">${p.name}</div></div>`,
              )
              .join('\n')
          : `<div class="missing">mockup PNG 不在<br><small>${r.id}.png / ${r.id}-NN.png どちらもなし</small></div>`;
        const appImgs = r.isMockupOnly
          ? `<div class="mockup-only">📋 mockup-only<br><small>${r.id === 'onboarding-splash' ? 'ADR-0018 §② Expo SplashScreen (OS 起動と統合、JS bundle ロード完了で消える、 独自 React コンポーネント不要 = 却下済 Option III)、 実機 SS 撮影不可。 mockup PNG (BonsaiLog ロゴ + キャッチ) は assets/images/splash-icon.png に対応。' : 'ADR-0017 (ATT/UMP OS 標準ダイアログ採用)、 実機独自画面なし。'}</small></div>`
          : r.appShots.length
            ? r.appShots
                .map(
                  (p) =>
                    `<div class="page"><img src="${p.src}" alt="${p.name}"><div class="page-name">${p.name}</div></div>`,
                )
                .join('\n')
            : `<div class="missing">実機 SS なし<br><small>${r.artifactPath || '(artifact 未取得 or SCREEN_PAIRS 未追加)'}</small></div>`;
        return `
    <div class="row">
      <div class="meta">
        <div class="id">${r.id}</div>
        <div class="desc">${r.description}</div>
        <div class="selector">selector: ${r.selector}</div>
        ${r.mode === 'scrollable' ? '<div class="mode">📜 scrollable (multi-page)</div>' : ''}
        <div class="status">${r.status}</div>
        ${r.spId ? `<div class="sp-id">SCREEN_PAIRS id: ${r.spId}</div>` : ''}
        ${r.artifactPath ? `<div class="artifact-path">${r.artifactPath}</div>` : ''}
      </div>
      <div class="image-col">
        <span class="col-label">📐 お手本 (mockup、${r.mockupSrcs.length} 枚)</span>
        ${mockupImgs}
      </div>
      <div class="image-col">
        <span class="col-label">📱 実機 (${r.isMockupOnly ? 'mockup-only' : r.appShots.length + ' 枚'})</span>
        ${appImgs}
      </div>
    </div>`;
      })
      .join('\n');
    groupBlocks.push(`<h2 class="group-header">${html} (${entries.length} 件)</h2>\n${rowsHtml}`);
  }

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>BonsaiLog ペアリング監査レポート v2 (mockup 主導)</title>
  <style>
    body { font-family: -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif; margin: 20px; background: #f7f3e8; color: #1a1a1a; }
    h1 { color: #1f3a2e; }
    h2.group-header { color: #1f3a2e; margin-top: 32px; padding: 10px 14px; background: #e8e0c8; border-radius: 6px; font-size: 18px; }
    .summary { background: white; padding: 16px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .summary p { margin: 4px 0; }
    .summary strong { color: #1f3a2e; }
    .row { display: grid; grid-template-columns: 240px 1fr 1fr; gap: 16px; padding: 16px; background: white; margin-bottom: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); align-items: start; }
    .row:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
    .meta { font-size: 13px; }
    .meta .id { font-weight: bold; color: #1f3a2e; font-size: 16px; margin-bottom: 6px; }
    .meta .desc { color: #333; font-size: 12px; margin-bottom: 6px; }
    .meta .selector { color: #666; font-size: 11px; word-break: break-all; margin-bottom: 4px; }
    .meta .mode { color: #1976d2; font-size: 11px; margin-bottom: 6px; }
    .meta .status { margin-top: 8px; padding: 4px 8px; background: #f5f5f5; border-radius: 4px; font-size: 12px; display: inline-block; }
    .meta .sp-id { margin-top: 6px; font-size: 11px; color: #666; }
    .meta .artifact-path { margin-top: 4px; font-size: 10px; color: #999; word-break: break-all; }
    .image-col { display: flex; flex-direction: column; gap: 12px; align-items: center; font-size: 11px; }
    .image-col .col-label { display: block; color: #666; margin-bottom: 4px; font-weight: bold; }
    .image-col .page img { max-width: 100%; border: 1px solid #ddd; border-radius: 4px; background: white; }
    .image-col .page .page-name { color: #999; font-size: 10px; margin-top: 3px; }
    .missing { padding: 60px 20px; background: #ffebee; color: #c62828; border-radius: 4px; font-size: 13px; }
    .mockup-only { padding: 60px 20px; background: #e3f2fd; color: #1565c0; border-radius: 4px; font-size: 13px; }
  </style>
</head>
<body>
  <h1>📐 BonsaiLog ペアリング監査レポート v2 (mockup 主導)</h1>
  <div class="summary">
    <p>生成日時: <strong>${new Date().toISOString()}</strong></p>
    <p>📊 mockup 全件: <strong>${total} 件</strong></p>
    <p>✅ 整合済 (lv2): <strong>${achievedCount}</strong> | ⚠️ 要再評価: <strong>${reevalCount}</strong> | ⏸️ 永続 skip: <strong>${skippedCount}</strong> | 📋 mockup-only: <strong>${mockupOnlyCount}</strong> | 🟡 未測定: <strong>${unmeasuredCount}</strong></p>
    <p>使い方: HTML グループ別 (01 → 02 → 04 → 05) に、お手本 (multi-page 縦並び) と 実機 を横並びで比較してください。</p>
    <p>紐付け方法: mockupFile ベース (例: mockupFile='bonsai-create-01.png' → mockup id 'bonsai-create' に紐付け)。</p>
  </div>
${groupBlocks.join('\n')}
</body>
</html>
`;

  writeFileSync(OUTPUT_PATH, html, 'utf8');
  console.log(`✅ ペアリングレポート v2 生成完了`);
  console.log(`   出力: ${path.relative(REPO_ROOT, OUTPUT_PATH)}`);
  console.log(`   ブラウザで開く: \\\\wsl.localhost\\Ubuntu${OUTPUT_PATH.replace(/\//g, '\\')}`);
  console.log('');
  console.log(`📊 サマリ (${total} 件):`);
  console.log(`   ✅ 整合済: ${achievedCount} | ⚠️ 要再評価: ${reevalCount}`);
  console.log(`   ⏸️ 永続 skip: ${skippedCount} | 📋 mockup-only: ${mockupOnlyCount}`);
  console.log(`   🟡 未測定: ${unmeasuredCount}`);

  // R-1 再発防止: SS 反映確認 log (2026-05-17 Sess5、user 指摘で追加)
  // achieved 状態で artifact 設定済なのに PNG が見つからない (path 構造変化や移動した artifact 等) row を警告。
  // skipped row は撮影対象外で PNG 不在は正常、 mockup-only も対象外。
  console.log('');
  console.log('🔍 SS 反映確認:');
  const expectedAppShots = allRows.filter(
    (r) => !r.isMockupOnly && r.artifactPath && r.status.includes('整合済'),
  );
  const detected = expectedAppShots.filter((r) => r.appShots.length > 0);
  const missing = expectedAppShots.filter((r) => r.appShots.length === 0);
  console.log(`   ✓ ${detected.length} 件: artifact dir 内 SS 検出済 (整合済 row)`);
  if (missing.length > 0) {
    console.log(`   ⚠ ${missing.length} 件: 整合済だが PNG 不在 — 下記要 user 確認:`);
    for (const r of missing) {
      console.log(`      - ${r.id} (artifact: ${r.artifactPath})`);
    }
  } else {
    console.log(`   ✓ 整合済 row 全件 SS 反映 OK`);
  }
}

main();
