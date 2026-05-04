#!/usr/bin/env node
/**
 * template-residue-check - Expo create-expo-app テンプレート残骸の検出
 *
 * 経緯:
 * F-04 #29 実機検証で Home 画面に Expo テンプレ残骸「ここからアプリを作り始めましょう」
 * が残存していることが発覚 (15215)。ストア審査リジェクトリスク。ADR-0019 で
 * Home 画面の役割を定義 + 残骸を削除済 (#181) だが、構造的に再発を防ぐため
 * CI で検査する。
 *
 * 検査対象:
 *   app/ + src/ 配下の .ts / .tsx ファイル
 *
 * 検出パターン (Expo / React Native の代表的なテンプレ残骸):
 *   1. 日本語: 「ここからアプリを作り始めましょう」
 *   2. 英語: "Edit app/(tabs)/index.tsx to edit"
 *   3. 英語: "This is the first screen"
 *   4. デモ文言: "Hello World" / "Welcome to React Native"
 *   5. プレースホルダー: "Lorem ipsum"
 *
 * 終了コード: 0 = OK、1 = 残骸検出
 *
 * Related: ADR-0019 / Issue #29 / scripts/docs-lint.mjs (CI 拡張系の姉妹)
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const TARGETS = ['app', 'src'];
const errors = [];

// パターン定義: { pattern: RegExp, label: string }
const RESIDUE_PATTERNS = [
  {
    pattern: /ここからアプリを作り始めましょう/,
    label: 'Expo テンプレ日本語残骸 (Home 画面)',
  },
  {
    pattern: /Edit app\/\(tabs\)\/index\.tsx to edit/,
    label: 'Expo テンプレ英語残骸 (Edit instruction)',
  },
  {
    pattern: /This is the first screen/,
    label: 'Expo テンプレ英語残骸 (first screen)',
  },
  {
    pattern: /\bWelcome to React Native\b/,
    label: 'React Native 標準テンプレ残骸',
  },
  {
    pattern: /\bLorem ipsum\b/i,
    label: 'プレースホルダー (Lorem ipsum)',
  },
];

function walk(dir, callback) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, callback);
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      callback(full);
    }
  }
}

for (const target of TARGETS) {
  walk(join(ROOT, target), (file) => {
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      // コメント行 (// or /* で始まる) は検査対象外
      // (lesson 文書化のために残す箇所、本スクリプト自身の `pattern` 定義行)
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
        return;
      }
      for (const { pattern, label } of RESIDUE_PATTERNS) {
        if (pattern.test(line)) {
          errors.push(`${relative(ROOT, file)}:${i + 1}  [${label}]: ${line.trim().slice(0, 100)}`);
        }
      }
    });
  });
}

if (errors.length > 0) {
  console.error('❌ template-residue-check failed (テンプレ残骸検出、ADR-0019):');
  console.error('');
  for (const err of errors) {
    console.error(`  ${err}`);
  }
  console.error('');
  console.error('  対処: 該当箇所を本来の文言に置換してください');
  console.error('  根拠: docs/adr/ADR-0019-home-screen-role.md');
  process.exit(1);
}

console.log('✅ template-residue-check passed (テンプレ残骸ゼロ)');
