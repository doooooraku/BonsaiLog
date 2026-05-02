#!/usr/bin/env node
/**
 * F-08 / F-11 / F-04 / F-15 / F-09 / F-10 / F-07 / F-LEGAL-004 で
 * 6 回繰り返した「en/ja に追加 → 17 locales に英語フォールバック」作業を 1 コマンド化。
 *
 * Issue retro 2026-05-03 P2 (本セッション L2 由来)。
 *
 * 使い方:
 *   pnpm i18n:add-key <keyName> '<English value>'
 *   pnpm i18n:add-key <keyName> '<English value>' --ja '<日本語>'
 *
 * 動作:
 * 1. en.ts に key: '<English value>' を末尾 `};` の前に追加
 * 2. --ja 指定時は ja.ts に key: '<日本語>' を追加 (なければ英語と同じ)
 * 3. 17 locales (de/es/fr/hi/id/it/ko/nl/pl/pt/ru/sv/th/tr/vi/zhHans/zhHant) に
 *    英語フォールバックで key: '<English value>' を追加
 * 4. 既に存在するキーは skip (idempotent)
 *
 * 制約:
 * - 各ファイル末尾の `};` 行が必須
 * - キー名は valid JS identifier、英語値はシングルクォート内に書く
 *   ( ' を含む場合は \\' で escape して呼び出す)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { argv, exit } from 'node:process';

const args = argv.slice(2);
let keyName = null;
let enValue = null;
let jaValue = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--ja') {
    jaValue = args[++i];
  } else if (keyName == null) {
    keyName = arg;
  } else if (enValue == null) {
    enValue = arg;
  }
}

if (!keyName || !enValue) {
  console.error(
    'Usage: pnpm i18n:add-key <keyName> <English value> [--ja <日本語>]\n' +
      "  pnpm i18n:add-key wateringTitle 'Watering' --ja '水やり'",
  );
  exit(1);
}

if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(keyName)) {
  console.error(`Invalid key name: ${keyName} (must be a valid JS identifier)`);
  exit(1);
}

const ROOT = resolve(import.meta.dirname ?? '.', '..');
const LOCALES_DIR = resolve(ROOT, 'src/core/i18n/locales');

const FALLBACK_LOCALES = [
  'de',
  'es',
  'fr',
  'hi',
  'id',
  'it',
  'ko',
  'nl',
  'pl',
  'pt',
  'ru',
  'sv',
  'th',
  'tr',
  'vi',
  'zhHans',
  'zhHant',
];

function escapeForSingleQuote(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function insertBeforeFinalBrace(filePath, line) {
  const content = readFileSync(filePath, 'utf8');
  if (content.includes(`${line.split(':')[0]}:`)) {
    return false; // already exists, skip
  }
  const idx = content.lastIndexOf('};');
  if (idx < 0) {
    throw new Error(`Cannot find '};' in ${filePath}`);
  }
  const newContent = content.slice(0, idx) + `  ${line}\n` + content.slice(idx);
  writeFileSync(filePath, newContent, 'utf8');
  return true;
}

const enLine = `${keyName}: '${escapeForSingleQuote(enValue)}',`;
const jaLine = `${keyName}: '${escapeForSingleQuote(jaValue ?? enValue)}',`;

let added = 0;

if (insertBeforeFinalBrace(resolve(LOCALES_DIR, 'en.ts'), enLine)) {
  console.log(`✓ en.ts: added ${keyName}`);
  added++;
} else {
  console.log(`- en.ts: ${keyName} already exists (skipped)`);
}

if (insertBeforeFinalBrace(resolve(LOCALES_DIR, 'ja.ts'), jaLine)) {
  console.log(`✓ ja.ts: added ${keyName}`);
  added++;
} else {
  console.log(`- ja.ts: ${keyName} already exists (skipped)`);
}

for (const locale of FALLBACK_LOCALES) {
  if (insertBeforeFinalBrace(resolve(LOCALES_DIR, `${locale}.ts`), enLine)) {
    added++;
  }
}

console.log(`\nDone. Added to ${added} files. Run \`pnpm format:fix\` to normalize formatting.`);
