#!/usr/bin/env node
// i18n 翻訳ファイル全体に対して、禁止語の有無をチェックする。
// CI で実行され、検出されたら exit 1 で失敗させる。
//
// 根拠: .claude/recurrence-prevention.md R-3 (UI 文言の品の良さ)

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LOCALES_DIR = path.join(ROOT, 'src/core/i18n/locales');

// constraints §5-2 に明記されている禁止語 + R-3 で追加された再発防止語
const FORBIDDEN_WORDS = {
  // 医療的・命令的（既存 constraints §5-2）
  medical: ['診断', '判定', '推奨', 'べき', '危険', '病気', '治療'],
  // 技術用語の医療ニュアンス（既存）
  techMedical: ['reminder', 'tracker', 'alert'],
  // 直接的すぎる表現（R-3 で追加、再発防止）
  tooBlunt: ['うるさい', 'うざい', 'やめよう', 'やめましょう'],
};

// 警告のみ（エラーにはしない、ペルソナ評価で再評価する）
const WARNING_WORDS = {
  // 第三者団体名訴求（R-3 で追加）
  authority: ['協会推奨', '公認', '推薦', 'official endorsed'],
  // 金額分解訴求（R-3、シニア層に刺さらない）
  priceDecomposition: ['1 日 ¥', '1日¥', '1 日 \\$', 'a day for \\$'],
};

function extractDictBody(fileText) {
  const markerMatch = /const\s+[A-Za-z0-9_]+\s*=\s*{/m.exec(fileText);
  if (!markerMatch) return null;
  const start = markerMatch.index + markerMatch[0].length;
  const rest = fileText.slice(start);
  const end = rest.indexOf('\n};');
  if (end < 0) return null;
  return rest.slice(0, end);
}

function extractStringValues(dictBody) {
  // "key: 'value'" or 'key: "value"' のパターンから value を抽出
  const pattern = /^\s*([A-Za-z0-9_]+)\s*:\s*['"`]([^'"`\n]+)['"`]/gm;
  const values = [];
  let match;
  while ((match = pattern.exec(dictBody)) != null) {
    values.push({ key: match[1], value: match[2] });
  }
  return values;
}

function checkLocale(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const dictBody = extractDictBody(text);
  if (!dictBody) return { errors: [], warnings: [] };
  const entries = extractStringValues(dictBody);
  const errors = [];
  const warnings = [];

  for (const { key, value } of entries) {
    for (const [category, words] of Object.entries(FORBIDDEN_WORDS)) {
      for (const word of words) {
        if (value.includes(word)) {
          errors.push({ key, value, word, category });
        }
      }
    }
    for (const [category, words] of Object.entries(WARNING_WORDS)) {
      for (const word of words) {
        const re = new RegExp(word);
        if (re.test(value)) {
          warnings.push({ key, value, word, category });
        }
      }
    }
  }
  return { errors, warnings };
}

function run() {
  if (!fs.existsSync(LOCALES_DIR)) {
    console.log(`[i18n-forbidden-words] locales dir not found: ${LOCALES_DIR}`);
    return;
  }

  const localeFiles = fs.readdirSync(LOCALES_DIR).filter((f) => /\.ts$/.test(f));
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const file of localeFiles) {
    const filePath = path.join(LOCALES_DIR, file);
    const { errors, warnings } = checkLocale(filePath);

    for (const e of errors) {
      console.error(
        `ERROR [${file}] ${e.key}: 禁止語「${e.word}」(${e.category}) を含む: ${e.value}`,
      );
      totalErrors += 1;
    }
    for (const w of warnings) {
      console.warn(
        `WARN  [${file}] ${w.key}: 注意語「${w.word}」(${w.category}) を含む: ${w.value}`,
      );
      totalWarnings += 1;
    }
  }

  console.log('');
  console.log(`Forbidden words check: ${totalErrors} errors, ${totalWarnings} warnings`);
  console.log('根拠: .claude/recurrence-prevention.md R-3 (UI 文言の品の良さ)');

  if (totalErrors > 0) {
    process.exit(1);
  }
}

try {
  run();
} catch (error) {
  console.error(`[i18n-forbidden-words] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
