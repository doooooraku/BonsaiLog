#!/usr/bin/env node
/**
 * S2 (2026-05-13): modal/Screen 内 TextInput autoFocus 禁止 lint (ADR-0024 Phase G retro)。
 *
 * `app/(modals)/**.tsx` + `src/features/**\/*Screen.tsx` で `<TextInput ... autoFocus` を
 * error 検出 (`autoFocus={false}` 明示は許可)。
 *
 * 理由: 2026-05-12 PR #493 で BonsaiCreate modal の TextInput auto focus →
 * keyboard が画面下 submit を隠す → Maestro flow で 5 回試行ロス。
 * `scrollUntilVisible` で間接 dismiss が対処、ただし設計上 autoFocus 禁止が筋。
 *
 * 実行: pnpm verify:modal-autofocus
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const TARGETS = ['app/(modals)', 'src/features'];
const errors = [];

function walk(dir, filter) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full, filter);
    } else if (filter(name)) {
      const content = readFileSync(full, 'utf-8');
      // <TextInput ... autoFocus (without ={false}) を検出
      // パターン: TextInput が出現する行から数行内で autoFocus が出現
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (/<TextInput\b/.test(lines[i])) {
          // 次の 10 行以内に autoFocus 検査
          for (let j = i; j < Math.min(i + 10, lines.length); j++) {
            if (/\bautoFocus\b/.test(lines[j]) && !/autoFocus=\{false\}/.test(lines[j])) {
              errors.push(`${full}:${j + 1}: <TextInput autoFocus> (modal/Screen 内では禁止)`);
              break;
            }
            // TextInput タグの終端 / が見えたら break
            if (/\/?>$/.test(lines[j])) break;
          }
        }
      }
    }
  }
}

for (const target of TARGETS) {
  try {
    walk(target, (n) => (target === 'app/(modals)' ? /\.tsx$/.test(n) : /Screen\.tsx$/.test(n)));
  } catch {
    // ディレクトリ無視
  }
}

if (errors.length > 0) {
  console.error(
    `[ERROR] modal/Screen 内 TextInput autoFocus 禁止 (S2 ルール、計 ${errors.length} 件):`,
  );
  errors.forEach((e) => console.error(`  - ${e}`));
  console.error(
    `\nADR-0024 Phase G retro: modal 表示時の keyboard 自動起動で submit が隠れ、Maestro 試行ロス発生 (PR #493、5 回反復ロス)。\n` +
      `対処: autoFocus={false} 明示、または focus 制御を別経路 (Pressable + useRef) に移行。`,
  );
  process.exit(1);
}

console.log('Modal/Screen autoFocus check: 0 errors');
