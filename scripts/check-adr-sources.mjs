#!/usr/bin/env node
/**
 * S-1 (Sess8 Retro): ADR 起票 / 改訂時の業界事例 sources URL 必須チェック。
 *
 * Sess8 で「Strava 案 A 採用 → 実は案 C 系」 の誤引用が発覚 (ADR-0025 改訂)。
 * ADR 内で業界事例キーワードを使う場合、 1 次情報 URL を必須記載とする仕組み化。
 *
 * 検出ロジック (緩和版、 per-ADR basis):
 * 1. docs/adr/*.md を全件 scan
 * 2. 各 ADR ファイル全体で industry keyword (「業界事例」「業界慣用」「業界標準」「事例参考」 等) を検出
 * 3. industry keyword あり + URL 0 個 → ERROR (Sources セクション or 引用 URL の追記要求)
 * 4. industry keyword あり + URL 1 個以上 → OK (Sources/Notes/Decision Drivers のいずれかで参照済と判定)
 * 5. industry keyword なし → skip
 *
 * 終了コード:
 * - 0: OK (全 ADR が industry keyword なし or URL 付き)
 * - 1: NG (industry keyword あり + URL なし の ADR が 1 件以上)
 *
 * pnpm verify chain に統合 (verify:adr-sources)。
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const ADR_DIR = resolve(ROOT, 'docs/adr');

const INDUSTRY_KEYWORDS = [
  '業界事例',
  '業界慣用',
  '業界標準',
  '事例参考',
  '事例引用',
  'industry pattern',
  'industry standard',
  'industry case',
];

const URL_REGEX = /https?:\/\/\S+/g;

let errorCount = 0;

const adrFiles = readdirSync(ADR_DIR)
  .filter((f) => f.endsWith('.md'))
  .map((f) => resolve(ADR_DIR, f));

for (const file of adrFiles) {
  const content = readFileSync(file, 'utf8');
  const rel = file.replace(ROOT + '/', '');

  const hits = INDUSTRY_KEYWORDS.filter((kw) => content.includes(kw));
  if (hits.length === 0) continue;

  const urls = content.match(URL_REGEX) || [];

  if (urls.length === 0) {
    console.error(`❌ [adr-sources] ${rel}: 業界事例 keyword (${hits.join(', ')}) 検出、 URL 0 個`);
    console.error(
      `   対応: Decision Drivers / Alternatives / Notes セクションに [Source Title](https://...) を追記`,
    );
    console.error(
      `   例 (ADR-0025 Sess8 PR-1): ## Sources セクションを追加して 1 次情報 URL を列挙`,
    );
    errorCount++;
  }
}

if (errorCount > 0) {
  console.error(`\n❌ ADR sources check: ${errorCount} 件の業界事例引用で URL 不足`);
  console.error(`   S-1 (Sess8 Retro): 業界事例誤引用の再発防止、 1 次情報 URL 必須`);
  console.error(
    `   過去事例: Sess7 PR-1 で ADR-0025 初版「Strava = タブ action 起動」 と引用、 1 次情報確認で誤引用判明、 Sess8 PR-1 で改訂`,
  );
  process.exit(1);
}

console.log(
  `✅ ADR sources check: ${adrFiles.length} ADRs scanned, all industry references have URLs (or no industry keywords)`,
);
process.exit(0);
