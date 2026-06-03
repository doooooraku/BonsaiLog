#!/usr/bin/env node
/**
 * EventType / EVENT_STATUSES と i18n key の集合一致を検証する。
 * Sess64 Issue #934 価値 B。
 *
 * 検証内容:
 * 1. EVENT_TYPES (schema.ts) と eventType_* / workLogNotePlaceholder_* keys (全 19 言語) の集合一致
 * 2. EVENT_STATUSES (schema.ts) と eventStatus_* keys (全 19 言語) の集合一致
 *
 * 動機: Sess16 で `leaf_first_aid` 追加時に 1 箇所で書き忘れて silent fall-through bug
 * を起こした事例の構造防止。 コンパイル時 exhaustive check (assertNever) が効かない動的
 * i18n key 解決 (`eventType_${type}`) の drift を CI で検知する。
 *
 * Exit code: 0 = OK / 1 = drift 検出
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SCHEMA_PATH = join(ROOT, 'src/db/schema.ts');
const LOCALES_DIR = join(ROOT, 'src/core/i18n/locales');

function extractEnum(content, varName) {
  const re = new RegExp(`export const ${varName} = \\[([\\s\\S]*?)\\] as const`, 'm');
  const m = content.match(re);
  if (!m) throw new Error(`Cannot find ${varName} in schema.ts`);
  const items = [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
  if (items.length === 0) throw new Error(`No items extracted from ${varName}`);
  return items;
}

function extractI18nKeys(content, prefix) {
  const re = new RegExp(`${prefix}([a-z_]+)`, 'g');
  return new Set([...content.matchAll(re)].map((x) => x[1]));
}

function checkSet(enumValues, i18nKeys, prefix, locale) {
  const enumSet = new Set(enumValues);
  const missing = enumValues.filter((v) => !i18nKeys.has(v));
  const extra = [...i18nKeys].filter((k) => !enumSet.has(k));
  return { missing, extra, prefix, locale };
}

const schemaContent = readFileSync(SCHEMA_PATH, 'utf8');
const EVENT_TYPES = extractEnum(schemaContent, 'EVENT_TYPES');
const EVENT_STATUSES = extractEnum(schemaContent, 'EVENT_STATUSES');

const errors = [];
const localeFiles = readdirSync(LOCALES_DIR).filter((f) => f.endsWith('.ts'));

if (localeFiles.length === 0) {
  console.error('\x1b[31m[ERROR]\x1b[0m No locale .ts files found in', LOCALES_DIR);
  process.exit(1);
}

for (const file of localeFiles) {
  const locale = file.replace(/\.ts$/, '');
  const content = readFileSync(join(LOCALES_DIR, file), 'utf8');

  // eventType_*
  const eventTypeKeys = extractI18nKeys(content, 'eventType_');
  const r1 = checkSet(EVENT_TYPES, eventTypeKeys, 'eventType_', locale);
  if (r1.missing.length > 0 || r1.extra.length > 0) errors.push(r1);

  // workLogNotePlaceholder_*
  const placeholderKeys = extractI18nKeys(content, 'workLogNotePlaceholder_');
  const r2 = checkSet(EVENT_TYPES, placeholderKeys, 'workLogNotePlaceholder_', locale);
  if (r2.missing.length > 0 || r2.extra.length > 0) errors.push(r2);

  // eventStatus_*
  const statusKeys = extractI18nKeys(content, 'eventStatus_');
  const r3 = checkSet(EVENT_STATUSES, statusKeys, 'eventStatus_', locale);
  if (r3.missing.length > 0 || r3.extra.length > 0) errors.push(r3);
}

if (errors.length > 0) {
  console.error('\x1b[31m[ERROR]\x1b[0m EventType consistency check failed:');
  for (const e of errors) {
    if (e.missing.length > 0) {
      console.error(`  ${e.locale}: missing ${e.prefix}<${e.missing.join('|')}>`);
    }
    if (e.extra.length > 0) {
      console.error(`  ${e.locale}: extra ${e.prefix}<${e.extra.join('|')}>`);
    }
  }
  console.error(
    `\n\x1b[33m[HINT]\x1b[0m EVENT_TYPES (${EVENT_TYPES.length}) と eventType_* / workLogNotePlaceholder_* keys、 EVENT_STATUSES (${EVENT_STATUSES.length}) と eventStatus_* keys が完全一致するように locale ファイルを修正してください。 i18n key 追加は pnpm i18n:add-key を使用。`,
  );
  process.exit(1);
}

console.log(
  `\x1b[32m[OK]\x1b[0m EventType consistency: ${EVENT_TYPES.length} types × ${localeFiles.length} locales × 2 prefixes + ${EVENT_STATUSES.length} statuses × ${localeFiles.length} locales`,
);
process.exit(0);
