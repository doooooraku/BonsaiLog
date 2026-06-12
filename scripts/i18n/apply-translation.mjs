#!/usr/bin/env node
/**
 * scripts/i18n/apply-translation.mjs
 *
 * Sess20 PR-0-2 (ADR-0033 D3) — Phase 1a /tmp/apply-i18n-phase1a.mjs を本番昇格。
 * 17 言語 locale ファイル (`src/core/i18n/locales/{lang}.ts`) の指定 key 値を一括置換。
 *
 * Usage:
 *   node scripts/i18n/apply-translation.mjs <input.json> [--dry-run]
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
 *
 * 翻訳禁止リスト (ADR-0033 D3) との不整合チェックは常時実行 (SoT = 下記 PROTECTED_TERMS、
 * 旧 --glossary option は 2026-06-11 glossary.md 廃止に伴い撤去)。
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

// ADR-0033 D3 翻訳禁止リスト (全言語で日本語音訳維持)。SoT は本 list + ADR-0033 D3。
// 樹形音訳 6 語は 2026-06-11 glossary.md 廃止時に旧 glossary §5 から移管。
const PROTECTED_TERMS = [
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
  'chokkan',
  'moyogi',
  'shakan',
  'kengai',
  'han-kengai',
  'sokan',
];

function parseArgs(argv) {
  const args = { input: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
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

function checkProtectedTerms(translations) {
  const warnings = [];
  for (const [key, langMap] of Object.entries(translations)) {
    for (const [lang, value] of Object.entries(langMap)) {
      const lowerValue = value.toLowerCase();
      for (const term of PROTECTED_TERMS) {
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
          chokkan: ['直幹'],
          moyogi: ['模様木'],
          shakan: ['斜幹'],
          kengai: ['懸崖'],
          'han-kengai': ['半懸崖'],
          sokan: ['双幹'],
        };
        const native = transliterations[lowerTerm] || [];
        for (const n of native) {
          if (value.includes(n)) {
            warnings.push(
              `[terms] ${key}.${lang}="${value}" — "${n}" は ADR-0033 D3 で「${term}」 音訳維持必須`,
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
  // Sess104: 入力 JSON 由来の「実改行」をエスケープしないと TS の string literal が壊れる
  // (sv で実証: Unterminated string literal)。実改行のみ \n エスケープへ変換する。
  // 既に 2 文字表現 (backslash + n) で来た値はそのまま通す (旧来の正常系)。
  return s.replace(/'/g, "\\'").replace(/\r\n/g, '\n').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

/**
 * Sess21 PR-2 (バグ A) — multi-line value 対応。
 * 旧 regex は single-line のみ (`  key: 'value',`) 対応。
 * multi-line (`  key:\n    'value',` or formatter による複数行 'value' + ',') にも対応するため、
 * 行ベース走査で startLine (`  key:` 含む) から endLine (`',` 終端) までを 1 行に置換。
 */
function applyTranslationsToFile(content, translations, lang, missedOut) {
  const lines = content.split('\n');
  let updated = 0;
  for (const [key, langMap] of Object.entries(translations)) {
    const newValue = langMap[lang];
    if (newValue == null) continue;
    const escapedKey = escapeForRegex(key);
    // start: `  key:` or `  key: '...` を含む line
    const startRe = new RegExp(`^(\\s+)${escapedKey}:\\s*(.*)$`);
    let startLineIdx = -1;
    let indent = '';
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(startRe);
      if (m) {
        startLineIdx = i;
        indent = m[1];
        break;
      }
    }
    if (startLineIdx === -1) {
      missedOut.push(`${lang}: ${key}`);
      continue;
    }
    // end: 値の string literal がある line を quote 認識で特定する。
    // Sess104 修正: 旧実装は `'` 終端のみ前提で、double-quote 値 (`key: "Today's work",`) や
    // エスケープ `\'` を含む値で次 key の line を終端と誤認し、次 key を無言削除するバグがあった。
    // JS の string literal は raw 改行を含めないため、値は start line か直後の 1 line に必ず収まる。
    const findLiteralEnd = (line) => {
      // line 内の最初の quote (' or ") から escape 認識で閉じ quote を探す。閉じていれば true。
      const qIdx = line.search(/['"]/);
      if (qIdx === -1) return false;
      const q = line[qIdx];
      for (let p = qIdx + 1; p < line.length; p++) {
        if (line[p] === '\\') {
          p++; // escape された次の 1 文字を skip
          continue;
        }
        if (line[p] === q) return true;
      }
      return false;
    };
    let endLineIdx = -1;
    const restOfStartLine = lines[startLineIdx].replace(startRe, '$2');
    if (/['"]/.test(restOfStartLine)) {
      // 値が同 line にある: 閉じ quote まで揃っていることを確認
      if (findLiteralEnd(restOfStartLine)) endLineIdx = startLineIdx;
    } else if (startLineIdx + 1 < lines.length && findLiteralEnd(lines[startLineIdx + 1])) {
      // prettier 折返し: 値 literal は直後の line に 1 つで完結
      endLineIdx = startLineIdx + 1;
    }
    if (endLineIdx === -1) {
      missedOut.push(`${lang}: ${key}`);
      continue;
    }
    // 該当範囲を 1 行で置換
    const newLine = `${indent}${key}: '${escapeForJsString(newValue)}',`;
    lines.splice(startLineIdx, endLineIdx - startLineIdx + 1, newLine);
    updated++;
  }
  return { content: lines.join('\n'), updated };
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
    const { content: newContent, updated } = applyTranslationsToFile(
      content,
      translations,
      lang,
      summary.missed,
    );
    if (!dryRun) writeFileSync(filePath, newContent);
    summary.perLang[lang] = updated;
    summary.total += updated;
  }
  return summary;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.input) {
    console.error('Usage: node scripts/i18n/apply-translation.mjs <input.json> [--dry-run]');
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
  const termWarnings = checkProtectedTerms(data.translations);
  if (termWarnings.length) {
    console.warn('[terms warnings]');
    termWarnings.forEach((w) => console.warn(`  - ${w}`));
  } else {
    console.log('[terms] ADR-0033 D3 翻訳禁止リスト 整合確認、 違反 0 件');
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
