#!/usr/bin/env node
/**
 * scripts/i18n/apply-translation.mjs
 *
 * Sess20 PR-0-2 (ADR-0033 D3) — Phase 1a /tmp/apply-i18n-phase1a.mjs を本番昇格。
 * 17 言語 locale ファイル (`src/core/i18n/locales/{lang}.ts`) の指定 key 値を一括置換。
 *
 * Usage:
 *   node scripts/i18n/apply-translation.mjs <input.json> [--dry-run] [--glossary <path>]
 *
 * Input JSON schema:
 *   {
 *     "_comment": "任意の説明文",
 *     "translations": {
 *       "<i18n key>": {
 *         "en": "...", "fr": "...", ..., "tr": "..."   // ja は SoT で含めない
 *       },
 *       ...
 *     }
 *   }
 *
 * Options:
 *   --dry-run         書き込まず、 何が変更されるか stdout に出力のみ
 *   --glossary <path> 翻訳禁止リスト (ADR-0033 D3) との不整合を warn
 *
 * Exit codes:
 *   0 — success (全て期待通り)
 *   1 — schema validation error / missing input
 *   2 — file not found / write error
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const LANGS = [
  'en',
  'fr',
  'es',
  'de',
  'it',
  'pt',
  'nl',
  'sv',
  'pl',
  'ru',
  'zhHans',
  'zhHant',
  'ko',
  'hi',
  'id',
  'th',
  'vi',
  'tr',
];

// ADR-0033 D3 翻訳禁止リスト (全言語で日本語音訳維持)
const GLOSSARY_PROTECTED_TERMS = [
  'bonsai',
  'niwaki',
  'karikomi',
  'nebari',
  'jin',
  'shari',
  'kokedama',
  'yamadori',
  'mame',
  'shohin',
  'akadama',
  'kusamono',
  'sabamiki',
  'bunjin',
  'ishizuki',
];

function parseArgs(argv) {
  const args = { input: null, dryRun: false, glossary: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--glossary') args.glossary = argv[++i];
    else if (!a.startsWith('--')) args.input = a;
  }
  return args;
}

function validateSchema(data, inputPath) {
  if (!data || typeof data !== 'object') {
    return [`Input ${inputPath} root must be object`];
  }
  if (!data.translations || typeof data.translations !== 'object') {
    return [`Input ${inputPath} must have "translations" object`];
  }
  const errors = [];
  for (const [key, langMap] of Object.entries(data.translations)) {
    if (!langMap || typeof langMap !== 'object') {
      errors.push(`Key "${key}" value must be lang→string map`);
      continue;
    }
    for (const [lang, value] of Object.entries(langMap)) {
      if (lang === 'ja') {
        errors.push(`Key "${key}" must not include "ja" (ja は SoT)`);
      }
      if (!LANGS.includes(lang)) {
        errors.push(
          `Key "${key}" has unknown lang "${lang}" (expected one of: ${LANGS.join(', ')})`,
        );
      }
      if (typeof value !== 'string') {
        errors.push(`Key "${key}".${lang} must be string, got ${typeof value}`);
      }
    }
  }
  return errors;
}

function checkGlossary(translations) {
  const warnings = [];
  for (const [key, langMap] of Object.entries(translations)) {
    for (const [lang, value] of Object.entries(langMap)) {
      const lowerValue = value.toLowerCase();
      for (const term of GLOSSARY_PROTECTED_TERMS) {
        const lowerTerm = term.toLowerCase();
        if (lowerValue.includes(lowerTerm)) continue;
        const transliterations = {
          bonsai: ['盆栽', '盆景', 'бонсай', '분재'],
          yamadori: ['山採り', '採掘樹'],
          shohin: ['小品'],
          mame: ['豆盆栽'],
          akadama: ['赤玉土'],
          kokedama: ['苔玉'],
          niwaki: ['庭木'],
        };
        const native = transliterations[lowerTerm] || [];
        for (const n of native) {
          if (value.includes(n)) {
            warnings.push(
              `[glossary] ${key}.${lang}="${value}" — "${n}" は ADR-0033 D3 で「${term}」 音訳維持必須`,
            );
            break;
          }
        }
      }
    }
  }
  return warnings;
}

function escapeForRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeForJsString(s) {
  return s.replace(/'/g, "\\'");
}

function applyTranslations(translations, { dryRun }) {
  const summary = { perLang: {}, total: 0, missed: [] };
  for (const lang of LANGS) {
    const filePath = resolve(ROOT, `src/core/i18n/locales/${lang}.ts`);
    if (!existsSync(filePath)) {
      console.error(`[error] ${filePath} not found`);
      process.exit(2);
    }
    let content = readFileSync(filePath, 'utf8');
    let updated = 0;
    for (const [key, langMap] of Object.entries(translations)) {
      const newValue = langMap[lang];
      if (newValue == null) continue;
      const escapedKey = escapeForRegex(key);
      const re = new RegExp(`^(\\s+${escapedKey}: )'[^']*',`, 'm');
      if (re.test(content)) {
        content = content.replace(re, (_m, p1) => `${p1}'${escapeForJsString(newValue)}',`);
        updated++;
      } else {
        summary.missed.push(`${lang}: ${key}`);
      }
    }
    if (!dryRun) writeFileSync(filePath, content);
    summary.perLang[lang] = updated;
    summary.total += updated;
  }
  return summary;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.input) {
    console.error(
      'Usage: node scripts/i18n/apply-translation.mjs <input.json> [--dry-run] [--glossary <path>]',
    );
    process.exit(1);
  }
  if (!existsSync(args.input)) {
    console.error(`[error] Input ${args.input} not found`);
    process.exit(2);
  }
  const data = JSON.parse(readFileSync(args.input, 'utf8'));
  const schemaErrors = validateSchema(data, args.input);
  if (schemaErrors.length) {
    console.error('[schema error]');
    schemaErrors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  if (args.glossary) {
    if (!existsSync(args.glossary)) {
      console.error(`[error] Glossary ${args.glossary} not found`);
      process.exit(2);
    }
    const warnings = checkGlossary(data.translations);
    if (warnings.length) {
      console.warn('[glossary warnings]');
      warnings.forEach((w) => console.warn(`  - ${w}`));
    } else {
      console.log(`[glossary] ${args.glossary} 整合確認、 違反 0 件`);
    }
  }
  const keyCount = Object.keys(data.translations).length;
  const expectedTotal = keyCount * LANGS.length;
  console.log(
    `${args.dryRun ? '[dry-run] ' : ''}Input: ${args.input}, ${keyCount} keys × ${LANGS.length} langs = ${expectedTotal} expected`,
  );
  const summary = applyTranslations(data.translations, { dryRun: args.dryRun });
  for (const lang of LANGS) {
    console.log(`  ${lang}.ts: ${summary.perLang[lang]} keys updated`);
  }
  console.log(`Total: ${summary.total} string updates`);
  if (summary.missed.length) {
    console.warn(`[missed] ${summary.missed.length} key×lang not found in locale file:`);
    summary.missed.slice(0, 20).forEach((m) => console.warn(`  - ${m}`));
    if (summary.missed.length > 20) {
      console.warn(`  ... and ${summary.missed.length - 20} more`);
    }
  }
  if (args.dryRun) {
    console.log('[dry-run] no files written');
  }
}

main();
