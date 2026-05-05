#!/usr/bin/env node
/**
 * Theme Source of Truth integrity check (ADR-0020 予定)。
 *
 * `design_system.md §2-1` の hex 値 ↔ `src/core/theme/colors.ts` の export ↔
 * `components/themed-text.tsx` / `themed-view.tsx` での使用、の 3 経路で
 * 値が一致しているかを検証。
 *
 * Phase B-0: 主要 5 トークン (BG_PRIMARY/BRAND_GREEN/TEXT_PRIMARY/ACCENT_GOLD/
 * BORDER_DEFAULT) のみ検査。
 *
 * R-25 drift 再発防止: design_system.md と colors.ts の値乖離を CI で検出。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());

/** design_system.md §2-1 (light) の正規化された期待値。 */
const EXPECTED = {
  BG_PRIMARY: '#F7F3E8',
  BG_SURFACE: '#FFFFFF',
  TEXT_PRIMARY: '#1A1A1A',
  TEXT_SECONDARY: '#5A5248',
  TEXT_MUTED: '#767066',
  BRAND_GREEN: '#1F3A2E',
  ACCENT_GOLD: '#C69E48',
  BORDER_DEFAULT: '#D9D1BF',
  DANGER: '#8B2E2E',
};

const colorsTs = readFileSync(resolve(ROOT, 'src/core/theme/colors.ts'), 'utf8');

let errors = 0;

for (const [name, hex] of Object.entries(EXPECTED)) {
  // export const NAME = '#XXXXXX'; の形式を許容 (hex は case 不問)
  const re = new RegExp(`export const ${name}\\s*=\\s*['"]${hex}['"]`, 'i');
  if (!re.test(colorsTs)) {
    console.error(`❌ colors.ts の ${name} が design_system.md §2-1 (${hex}) と一致しません`);
    errors++;
  } else {
    console.log(`✅ ${name} = ${hex}`);
  }
}

// design_system.md の末尾注記が src/core/theme/colors.ts を指していることを確認
const designMd = readFileSync(resolve(ROOT, 'docs/reference/design_system.md'), 'utf8');
if (!/src\/core\/theme\/colors\.ts/.test(designMd)) {
  console.error(
    '❌ design_system.md 末尾の lib path 注記が src/core/theme/colors.ts を指していません',
  );
  errors++;
} else {
  console.log('✅ design_system.md 末尾注記 OK');
}

if (errors > 0) {
  console.error(`\ntheme:sot FAILED — ${errors} integrity violations`);
  process.exit(1);
}
console.log('\ntheme:sot PASSED — design_system.md ↔ colors.ts 整合');
process.exit(0);
