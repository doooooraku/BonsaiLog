#!/usr/bin/env node
/**
 * S6 (2026-05-13): Screen testID 必須化 lint (ADR-0024 Phase G retro)。
 *
 * `src/features/**\/*Screen.tsx` で root JSX に `testID="e2e_<name>_screen"` 形式の
 * testID 不在を error 検出。Maestro flow で確実に画面遷移をフックできるよう構造的に強制。
 *
 * 実行: pnpm verify:screen-testid
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FEATURES_DIR = 'src/features';
const errors = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full);
    } else if (/Screen\.tsx$/.test(name)) {
      const content = readFileSync(full, 'utf-8');
      // 「testID="e2e_<lower_snake>_screen"」 形式があるか確認
      if (!/testID=["']e2e_[a-z_]+_screen["']/.test(content)) {
        errors.push(full);
      }
    }
  }
}

walk(FEATURES_DIR);

if (errors.length > 0) {
  console.error(`[ERROR] 以下の Screen に testID="e2e_<name>_screen" がありません (S6 ルール):`);
  errors.forEach((e) => console.error(`  - ${e}`));
  console.error(
    `\nADR-0024 Phase G retro: Maestro flow の確実な hook 用に必須化。\n` +
      `例: <View testID="e2e_species_picker_screen">`,
  );
  process.exit(1);
}

console.log('Screen testID check: 0 errors');
