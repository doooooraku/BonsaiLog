#!/usr/bin/env node
/**
 * scripts/i18n-remove-key.mjs (Sess26 PR-η-2、 ADR-0036 Future Work + Sess25 PR-⑧ 学び #1 解消)
 *
 * i18n key 削除専用 script。 既存 `i18n-add-key.mjs` の逆処理。
 * **multi-line value 対応** (Sess25 PR-⑧ で 8 言語 syntax error 事故由来):
 *   sed -d で 1 行マッチすると、 key 行が `key:` で終わり次行に value がある場合に value 行が
 *   orphan 残存し syntax error。 本 script は **multi-line pattern を検出して 2 行同時削除**。
 *
 * Usage:
 *   pnpm i18n:remove-key <keyName>
 *   pnpm i18n:remove-key <keyName1> <keyName2> <keyName3>  # 複数同時
 *   pnpm i18n:remove-key <keyName> --dry-run                # 確認のみ (削除しない)
 *
 * 動作:
 * 1. 全 19 locale (en/ja/de/es/fr/hi/id/it/ko/nl/pl/pt/ru/sv/th/tr/vi/zhHans/zhHant) で該当 key 行を削除
 * 2. multi-line pattern (`key:\n    'value',`) の場合 2 行同時削除
 * 3. 削除後の line count を locale 別に report
 * 4. --dry-run 時は実 write せず、 削除対象行を stdout に出力
 *
 * 制約 / 安全策:
 * - キー名は valid JS identifier のみ受領 (正規表現 injection 防止)
 * - 全 19 locale で 0 件 hit の場合は exit 1 (typo 検出)
 * - 一致しなかった locale は skip + warn (key 存在しない場合の冪等性)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { argv, exit } from 'node:process';

const args = argv.slice(2);
let dryRun = false;
const keyNames = [];

for (const arg of args) {
  if (arg === '--dry-run') {
    dryRun = true;
  } else if (arg.startsWith('--')) {
    console.error(`Unknown option: ${arg}`);
    exit(1);
  } else {
    keyNames.push(arg);
  }
}

if (keyNames.length === 0) {
  console.error(
    'Usage: pnpm i18n:remove-key <keyName> [<keyName2> ...] [--dry-run]\n' +
      '  pnpm i18n:remove-key eventDeleteConfirmTitle eventDeleteConfirmDesc\n' +
      '  pnpm i18n:remove-key planEventDeleteConfirmTitle --dry-run',
  );
  exit(1);
}

// valid JS identifier のみ (regex injection 防止)
for (const key of keyNames) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
    console.error(`Invalid key name: ${key} (must be a valid JS identifier)`);
    exit(1);
  }
}

const ROOT = resolve(import.meta.dirname ?? '.', '..');
const LOCALES_DIR = resolve(ROOT, 'src/core/i18n/locales');

const ALL_LOCALES = [
  'en',
  'ja',
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

/**
 * locale ファイル content から key 行を削除 (multi-line value 対応)。
 * @returns {{ newContent: string, removedLines: string[] }}
 */
function removeKeyFromContent(content, keyName) {
  const lines = content.split('\n');
  const newLines = [];
  const removedLines = [];

  // 1 行 pattern: `  keyName: 'value',` (escape された \' を含む可能性、 末尾 comma optional)
  const singleLineRegex = new RegExp(`^\\s*${keyName}:\\s*['"].*?['"],?\\s*$`);
  // multi-line pattern (key 行のみ、 value は次行): `  keyName:` (末尾 : で終わる、 後ろに何もない)
  const multiLineKeyRegex = new RegExp(`^\\s*${keyName}:\\s*$`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (singleLineRegex.test(line)) {
      removedLines.push(line);
      continue;
    }

    if (multiLineKeyRegex.test(line)) {
      removedLines.push(line);
      // 次行 (orphan value 行、 `    'value',` pattern) も同時削除
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        // value 行 pattern: `    'value',` (4 space indent + quote 始まり)
        if (/^\s+['"].*?['"],?\s*$/.test(nextLine)) {
          removedLines.push(nextLine);
          i++; // skip next line
        }
      }
      continue;
    }

    newLines.push(line);
  }

  return { newContent: newLines.join('\n'), removedLines };
}

let totalRemoved = 0;
const reportByLocale = {};

for (const locale of ALL_LOCALES) {
  const filePath = resolve(LOCALES_DIR, `${locale}.ts`);
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch (e) {
    console.warn(`[skip] ${locale}.ts not readable: ${e.message}`);
    continue;
  }

  let modifiedContent = content;
  const removedPerKey = {};

  for (const key of keyNames) {
    const { newContent, removedLines } = removeKeyFromContent(modifiedContent, key);
    modifiedContent = newContent;
    if (removedLines.length > 0) {
      removedPerKey[key] = removedLines.length;
      totalRemoved += removedLines.length;
    }
  }

  reportByLocale[locale] = removedPerKey;

  if (Object.keys(removedPerKey).length === 0) {
    continue;
  }

  if (dryRun) {
    console.log(
      `[dry-run] ${locale}.ts: ${Object.entries(removedPerKey)
        .map(([k, n]) => `${k}=${n} lines`)
        .join(', ')}`,
    );
  } else {
    writeFileSync(filePath, modifiedContent, 'utf8');
    console.log(
      `[removed] ${locale}.ts: ${Object.entries(removedPerKey)
        .map(([k, n]) => `${k}=${n} lines`)
        .join(', ')}`,
    );
  }
}

console.log('');
console.log(
  `${dryRun ? 'Would remove' : 'Removed'}: ${totalRemoved} lines across ${
    Object.values(reportByLocale).filter((r) => Object.keys(r).length > 0).length
  } locales`,
);

if (totalRemoved === 0) {
  console.error(`\n✗ No keys matched in any locale. Check key names: ${keyNames.join(', ')}`);
  exit(1);
}

console.log(
  '\nNext steps:\n' +
    '  1. pnpm verify:type-check  (TypeScript syntax 確認)\n' +
    '  2. pnpm i18n:check         (i18n 整合確認、 callsite 残存も検出)\n' +
    '  3. git diff src/core/i18n/locales/  (削除内容目視確認、 R-1 整合)',
);
