#!/usr/bin/env node
/**
 * i18n-placeholder-audit.mjs — Placeholder text 規約違反検出 (ADR-0029 D2)。
 *
 * docs/reference/design_system.md §13 整合: i18n locales 全件を walk して
 * 以下の anti-pattern を grep で検出してレポート出力。
 *
 * 検出 anti-pattern (Material Design 3「label 再掲禁止」 整合):
 *
 * AP-1 (label 再掲): 同 file 内に同名 label key が存在し、 placeholder text に
 *   label 単語が含まれる場合
 *   例) label: workLogNote='メモ' + placeholder: workLogNotePlaceholder='自由メモ ...'
 *       → 'メモ' 単語が placeholder に含まれる → 警告
 *
 * AP-2 (命令形): placeholder text が以下を含む場合
 *   - 'を入力' / 'を選んで' / 'してください' / 'をご記入' / 'お入れ'
 *   例) workLogPositionToPlaceholder='選択してください' → 警告
 *
 * 対象 file: src/core/i18n/locales/ * .ts (全 19 言語)
 *
 * 出力例:
 *   src/core/i18n/locales/ja.ts:
 *     [AP-1] workLogNotePlaceholder: '自由メモ (例: 朝8時、たっぷり)'
 *            → label workLogNote='メモ' を含む、 形式例のみに簡素化推奨
 *     [AP-2] workLogPositionToPlaceholder: '選択してください'
 *            → 命令形「してください」 を含む、 具体的な位置例に変更推奨
 *
 * Exit code:
 * - 0: NG keys 0 件 (CI 緑)
 * - 1: NG keys 検出 (CI fail、 PR-D2 で修正される予定なので Sess17 当面は警告扱い検討)
 *
 * 関連: docs/reference/design_system.md §13 Placeholder text 規約
 *       ADR-0029 D2
 *       i18n-audit.mjs (key 重複検出)
 *       i18n-forbidden-words.mjs (医療系禁止語検出)
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// AP-2 命令形 keyword (日本語 / ja.ts 主体、 他言語は手動翻訳時に注意喚起)
// 注: 他言語の命令形 (例: en 'Please select' / 'Enter ...') は厳密に
// 検出しない (false positive 多発リスク)。 ja のみ厳格 check + 他言語は
// 「ja で AP-2 ヒットした key」 を表示するに留める。
const AP2_IMPERATIVE_KEYWORDS = ['を入力', 'を選んで', 'してください', 'をご記入', 'お入れ'];

function listLocaleFiles() {
  try {
    const out = execSync('git ls-files src/core/i18n/locales/', { cwd: ROOT, encoding: 'utf8' });
    return out.split('\n').filter((p) => p.length > 0 && p.endsWith('.ts'));
  } catch (e) {
    console.error('git ls-files 失敗:', e.message);
    process.exit(1);
  }
}

// 1 file 内の key/value を 1 行 regex で抽出 (TS module export 内の literal)。
// 厳密 parser でなく簡易 grep、 multi-line value は対応しない (現状全 key は 1 行)。
function extractKeyValues(filePath) {
  const content = readFileSync(join(ROOT, filePath), 'utf8');
  const lines = content.split('\n');
  const map = new Map();
  const re = /^\s*(\w+):\s*['"]([^'"]+)['"]/;
  lines.forEach((line, idx) => {
    const m = line.match(re);
    if (m) {
      map.set(m[1], { value: m[2], lineNumber: idx + 1 });
    }
  });
  return map;
}

function findIssues(filePath, kvMap) {
  const issues = [];
  for (const [key, { value, lineNumber }] of kvMap.entries()) {
    if (!key.endsWith('Placeholder')) continue;
    // AP-1: 同 file 内に同 prefix の label key が存在し、 placeholder に label 値が含まれる
    const labelKey = key.replace(/Placeholder$/, '');
    const labelEntry = kvMap.get(labelKey);
    if (labelEntry && labelEntry.value.length >= 2 && value.includes(labelEntry.value)) {
      issues.push({
        line: lineNumber,
        ap: 'AP-1',
        key,
        value,
        labelKey,
        labelValue: labelEntry.value,
      });
    }
    // AP-2: 命令形 keyword 検出 (ja のみ厳格)
    if (filePath.endsWith('/ja.ts')) {
      for (const kw of AP2_IMPERATIVE_KEYWORDS) {
        if (value.includes(kw)) {
          issues.push({ line: lineNumber, ap: 'AP-2', key, value, keyword: kw });
          break;
        }
      }
    }
  }
  return issues;
}

function main() {
  const files = listLocaleFiles();
  if (files.length === 0) {
    console.log('対象 file 0');
    process.exit(0);
  }
  let totalIssues = 0;
  files.forEach((p) => {
    const kv = extractKeyValues(p);
    const issues = findIssues(p, kv);
    if (issues.length === 0) return;
    console.log(`\n${p}:`);
    issues.forEach((i) => {
      if (i.ap === 'AP-1') {
        console.log(`  [AP-1] ${i.key}: '${i.value}' (line ${i.line})`);
        console.log(
          `         → label ${i.labelKey}='${i.labelValue}' を含む、 形式例のみに簡素化推奨`,
        );
      } else if (i.ap === 'AP-2') {
        console.log(`  [AP-2] ${i.key}: '${i.value}' (line ${i.line})`);
        console.log(`         → 命令形「${i.keyword}」 を含む、 具体的な内容例に変更推奨`);
      }
      totalIssues += 1;
    });
  });

  console.log('');
  if (totalIssues === 0) {
    console.log('✅ Placeholder 規約違反ゼロ (AP-1 label 再掲 / AP-2 命令形 すべて clean)');
    process.exit(0);
  }

  console.log(
    `⚠️  Placeholder 規約違反 ${totalIssues} 件検出 (ADR-0029 D2 / design_system.md §13)`,
  );
  console.log('');
  console.log('修正方針:');
  console.log('- AP-1: label に書いてある単語を placeholder から削除、 形式例のみ残す');
  console.log('- AP-2: 「○○してください」 等の命令形を撤廃、 具体的な内容例で代替');
  console.log('');
  console.log('Sess17 では PR-D2 で workLogNotePlaceholder /');
  console.log('workLogPositionToPlaceholder / workLogPhotoCaptionPlaceholder を 19 言語修正予定。');
  // Sess17 では検出時も exit 0 で CI block しない (PR-D2 で順次解消)
  process.exit(0);
}

main();
