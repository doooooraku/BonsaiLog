#!/usr/bin/env node
/**
 * check-i18n-icon-duplicate.mjs (Sess96、 Issue #1026 / Sess83-86 retro 副次発見 #1 構造防止)
 *
 * BottomCtaBar の label に渡される i18n key の value が「+」 prefix で始まっていないかを検出して
 * CI で fail させる。
 *
 * 動機 (Sess83 副次発見 #1):
 * - BottomCtaBar は component default で PlusIcon を描画する (icon + label 構成)
 * - i18n value 側にも「+ 新規追加」 と「+ 」 prefix が入っていたため、 実機で「+ +新規追加」 と
 *   二重表示された (RecurrenceList、 PR #1020 で 19 言語修正済)
 * - icon は component の責務、 文字装飾を i18n value に持たせない — を静的検出で構造防止
 *
 * 検出ロジック:
 * 1. app/ + src/ の *.tsx から `<BottomCtaBar ... />` JSX block を抽出
 * 2. block 内の `label={t('key')}` から i18n key を収集
 * 3. src/core/i18n/locales/*.ts (19 言語) で該当 key の value が /^\+/ で始まれば違反
 *
 * 違反検出時 exit 1。 `pnpm verify` chain (package.json verify:i18n-icon-duplicate) に組込。
 *
 * @see src/components/common/BottomCtaBar.tsx (icon + label 構成の SoT)
 * @see docs/reference/tasks/lessons/retro.md (Sess83-86 retro)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['app', 'src'];
const LOCALES_DIR = 'src/core/i18n/locales';

/** 再帰的に .tsx file を列挙 (node_modules / dist 等は SCAN_DIRS 配下に無い前提)。 */
function walkTsx(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTsx(full, acc);
    } else if (entry.name.endsWith('.tsx')) {
      acc.push(full);
    }
  }
  return acc;
}

// 1. BottomCtaBar callsite から label の i18n key を収集
const BLOCK_PATTERN = /<BottomCtaBar\b[\s\S]*?\/>/g;
const LABEL_KEY_PATTERN = /label=\{t\(\s*['"]([^'"]+)['"]/;

const labelKeys = new Map(); // key -> [callsite file paths]
for (const dir of SCAN_DIRS) {
  for (const file of walkTsx(path.join(ROOT, dir))) {
    const source = fs.readFileSync(file, 'utf8');
    if (!source.includes('<BottomCtaBar')) continue;
    for (const block of source.match(BLOCK_PATTERN) ?? []) {
      const m = block.match(LABEL_KEY_PATTERN);
      if (!m) continue;
      const rel = path.relative(ROOT, file);
      const sites = labelKeys.get(m[1]) ?? [];
      sites.push(rel);
      labelKeys.set(m[1], sites);
    }
  }
}

// 2. 19 言語 locale file で該当 key の value が「+」 prefix で始まるかを検査
const errors = [];
const localeFiles = fs.readdirSync(path.join(ROOT, LOCALES_DIR)).filter((f) => f.endsWith('.ts'));

for (const localeFile of localeFiles) {
  const source = fs.readFileSync(path.join(ROOT, LOCALES_DIR, localeFile), 'utf8');
  for (const [key, sites] of labelKeys) {
    // `key: '+ ...'` / `key: "+..."` (行頭 key 定義のみ、 comment 内言及は対象外)
    const valuePattern = new RegExp(`^\\s*${key}:\\s*['"](\\+[^'"]*)['"]`, 'm');
    const m = source.match(valuePattern);
    if (m) {
      errors.push(
        `[i18n-icon-duplicate] ${LOCALES_DIR}/${localeFile} の ${key}: '${m[1]}' が「+」 prefix で始まっています。` +
          ` BottomCtaBar (${sites.join(', ')}) は PlusIcon を描画するため「+ +ラベル」 と二重表示になります。 value から「+ 」 を削除してください。`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error(`❌ check-i18n-icon-duplicate: ${errors.length} 件の違反\n`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

console.log(
  `[check-i18n-icon-duplicate] OK — BottomCtaBar label key ${labelKeys.size} 件 × locale ${localeFiles.length} file で「+」 prefix 違反 0 件`,
);
