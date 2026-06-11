#!/usr/bin/env node
/**
 * S-2 (Sess8 Retro): 廃止 route の使用を Edit/Write 前に block。
 *
 * Sess8 PR-1 で「`router.push('/(tabs)/settings')` 古い path 残存」 を発見 (Phase 1b 漏れ)。
 * 同種の Phase / route 変更時の漏れを構造的に防ぐ。
 *
 * scripts/obsolete-routes.json で廃止 route list を管理:
 *   { "routes": [ { "pattern": "/(tabs)/settings", "since": "...", "use": "/settings" } ] }
 *
 * 対象: Edit/Write の new_string or content に廃止 pattern が hit すれば exit 2 (block)。
 * 例外:
 * - docs/adr/ / docs/archive/ / .claude/recurrence-prevention / lessons / changelog 系: doc 記述 OK (historical reference)
 * - obsolete-routes.json 自身: pattern 定義のため OK
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const { tool_name, tool_input } = input;

if (!['Edit', 'Write'].includes(tool_name)) {
  process.exit(0);
}

const targetPath = tool_input?.file_path;
if (!targetPath) process.exit(0);

// 除外 path (doc / 履歴系)
const EXEMPT_PATTERNS = [
  /\/docs\/adr\//,
  /\/docs\/archive\//,
  /\/docs\/explanation\//,
  /\/docs\/reference\/tasks\/lessons/,
  /\.claude\/recurrence-prevention/,
  /\.claude\/hooks\/check-obsolete-routes\.mjs/,
  /scripts\/obsolete-routes\.json/,
  /scripts\/check-adr-sources\.mjs/,
  /CHANGELOG/i,
];
if (EXEMPT_PATTERNS.some((p) => p.test(targetPath))) {
  process.exit(0);
}

// 対象 file 拡張子 (実装系のみ)
if (!/\.(tsx?|jsx?|mjs|cjs)$/.test(targetPath)) {
  process.exit(0);
}

// obsolete-routes.json 読み込み
const routesFile = resolve(process.cwd(), 'scripts/obsolete-routes.json');
if (!existsSync(routesFile)) process.exit(0);

let config;
try {
  config = JSON.parse(readFileSync(routesFile, 'utf8'));
} catch {
  process.exit(0);
}

const routes = config.routes || [];
if (routes.length === 0) process.exit(0);

// 検査対象 content
let content;
if (tool_name === 'Write') {
  content = tool_input.content || '';
} else {
  content = tool_input.new_string || '';
}

// pattern 検出
const hits = [];
for (const r of routes) {
  if (content.includes(r.pattern)) {
    hits.push(r);
  }
}

if (hits.length > 0) {
  const rel = targetPath.replace(process.cwd() + '/', '');
  console.error(`❌ [obsolete-routes] 廃止 route の使用を ${rel} で検出:`);
  for (const r of hits) {
    console.error(`  - "${r.pattern}" は廃止`);
    console.error(`    since: ${r.since}`);
    console.error(`    use: "${r.use}"`);
    console.error(`    rationale: ${r.rationale}`);
  }
  console.error(
    `\n  S-2 (Sess8 Retro): Phase 1b 漏れ防止、 obsolete-routes.json で構造的検出`,
  );
  console.error(
    `  例外: 廃止 route を意図的に書く (e.g., obsolete-routes.json への新 entry 追加) なら本 hook を一時無効化、 修正後再有効化`,
  );
  process.exit(2);
}

process.exit(0);
