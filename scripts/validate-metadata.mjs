#!/usr/bin/env node
/**
 * validate-metadata.mjs
 *
 * fastlane/metadata/ 配下の App Store メタデータを自動バリデーションする。
 * CI で push_metadata の前に実行し、不正なデータが ASC に送られるのを防ぐ。
 *
 * チェック項目:
 *   1. 文字数上限 (name 30, subtitle 30, keywords 100, promotional_text 170, description 4000)
 *   2. ラテン文字言語のアクセント存在確認
 *   3. 禁則語チェック (商標名・誇大表現)
 *   4. keywords 形式チェック (カンマ後スペース禁止、name/subtitle との重複検出)
 *   5. URL 形式チェック (privacy_url, support_url)
 *
 * Usage:
 *   node scripts/validate-metadata.mjs              # 全ロケール検証
 *   node scripts/validate-metadata.mjs --locale ja  # 特定ロケール
 *
 * Exit code: 0 = OK, 1 = error
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const __dirname = dirname(fileURLToPath(import.meta.url));
const METADATA_DIR = join(__dirname, '..', 'fastlane', 'metadata');

const CHAR_LIMITS = {
  'name.txt': 30,
  'subtitle.txt': 30,
  'keywords.txt': 100,
  'promotional_text.txt': 170,
  'description.txt': 4000,
};

const ACCENT_REQUIRED = {
  'es-ES': /[áéíóúñ¿¡ü]/i,
  'pt-BR': /[áàâãéêíóôõúç]/i,
  'fr-FR': /[àâéèêëîïôùûüÿç]/i,
  'de-DE': /[äöüß]/i,
  tr: /[çğıöşü]/i,
  pl: /[ąćęłńóśźż]/i,
  vi: /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i,
  sv: /[åäö]/i,
};

const FORBIDDEN_PATTERNS = [
  { pattern: /\bWhatsApp\b/i, message: 'Trademark "WhatsApp"' },
  { pattern: /\bLINE\b/, message: 'Trademark "LINE"' },
  { pattern: /\bNo\.\s*1\b/i, message: '"No.1" — Apple Guideline 2.3.7 risk' },
  {
    pattern: /\b(best|fastest|most popular)\b/i,
    message: 'Superlative claim — Guideline 2.3.7 risk',
  },
];

const SKIP_DIRS = new Set(['review_information']);

const { values } = parseArgs({
  options: { locale: { type: 'string', default: '' } },
  strict: true,
});

let errors = 0;
let warnings = 0;

function error(locale, file, msg) {
  console.error(`  ERROR  ${locale}/${file}: ${msg}`);
  errors++;
}

function warn(locale, file, msg) {
  console.warn(`  WARN   ${locale}/${file}: ${msg}`);
  warnings++;
}

function readText(filePath) {
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, 'utf-8').replace(/\n$/, '');
}

function validate(locale) {
  const dir = join(METADATA_DIR, locale);
  if (!existsSync(dir)) {
    error(locale, '-', `Directory not found: ${dir}`);
    return;
  }

  for (const [file, limit] of Object.entries(CHAR_LIMITS)) {
    const text = readText(join(dir, file));
    if (text === null) continue;
    if (text.length > limit) {
      error(locale, file, `${text.length} chars (limit ${limit})`);
    }
  }

  const accentRegex = ACCENT_REQUIRED[locale];
  if (accentRegex) {
    const desc = readText(join(dir, 'description.txt'));
    if (desc && !accentRegex.test(desc)) {
      error(
        locale,
        'description.txt',
        `No accent characters found (possible ASCII-only). Expected: ${accentRegex.source}`,
      );
    }
  }

  for (const file of ['description.txt', 'name.txt', 'subtitle.txt', 'promotional_text.txt']) {
    const text = readText(join(dir, file));
    if (!text) continue;
    for (const { pattern, message } of FORBIDDEN_PATTERNS) {
      if (pattern.test(text)) warn(locale, file, message);
    }
  }

  const keywords = readText(join(dir, 'keywords.txt'));
  if (keywords) {
    if (/,\s/.test(keywords)) {
      warn(locale, 'keywords.txt', 'Space after comma (wastes chars)');
    }
    const name = readText(join(dir, 'name.txt')) || '';
    const subtitle = readText(join(dir, 'subtitle.txt')) || '';
    const nameWords = new Set(
      (name + ' ' + subtitle)
        .toLowerCase()
        .split(/[\s:]+/)
        .filter((w) => w.length > 2),
    );
    for (const kw of keywords.toLowerCase().split(',')) {
      if (nameWords.has(kw.trim())) {
        warn(
          locale,
          'keywords.txt',
          `"${kw.trim()}" duplicates name/subtitle (Apple auto-indexes these)`,
        );
      }
    }
  }

  for (const file of ['privacy_url.txt', 'support_url.txt']) {
    const url = readText(join(dir, file));
    if (url && url.length > 0 && !url.startsWith('http')) {
      error(locale, file, `Invalid URL: "${url}"`);
    }
  }
}

console.log('App Store metadata validation');
console.log(`Dir: ${METADATA_DIR}\n`);

if (!existsSync(METADATA_DIR)) {
  console.log('fastlane/metadata/ not found. Skipping.');
  process.exit(0);
}

const locales = values.locale
  ? [values.locale]
  : readdirSync(METADATA_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !SKIP_DIRS.has(d.name))
      .map((d) => d.name);

for (const locale of locales) validate(locale);

console.log(`\n${errors} error(s), ${warnings} warning(s) across ${locales.length} locale(s)`);

if (errors > 0) {
  console.error('\nValidation FAILED.');
  process.exit(1);
} else {
  console.log('\nValidation PASSED.');
}
