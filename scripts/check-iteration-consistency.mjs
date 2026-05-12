#!/usr/bin/env node
/**
 * Maestro flow ファイル内の「N 回反復」 表記の整合性チェック (S5、2026-05-13 retro)。
 *
 * 検出パターン:
 * - エラー: 「N 回反復」 と for loop `for i in 1 2 ... N` の N が不一致
 * - 警告: R-30 現基準 (3 回) と異なる N (履歴記録として許容、要 update 検討)
 *
 * 実行: pnpm verify:iteration
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const FLOWS_DIR = 'maestro/flows';
const R30_BASELINE = 3;

let errors = 0;
let warnings = 0;

const files = readdirSync(FLOWS_DIR).filter((f) => f.endsWith('.yml'));
for (const file of files) {
  const content = readFileSync(join(FLOWS_DIR, file), 'utf-8');

  const repMatch = content.match(/(\d+)\s*回反復/);
  const loopMatch = content.match(/for i in ((?:\d+\s*)+)/);

  if (!repMatch && !loopMatch) continue; // 反復記述なし、scope 外

  if (repMatch && loopMatch) {
    const repNum = parseInt(repMatch[1], 10);
    const loopCount = loopMatch[1].trim().split(/\s+/).length;
    if (repNum !== loopCount) {
      console.error(`[ERROR] ${file}: "${repNum} 回反復" vs for loop ${loopCount} 回 (不一致)`);
      errors++;
    }
    if (repNum !== R30_BASELINE) {
      console.warn(
        `[WARN] ${file}: "${repNum} 回反復" (R-30 現基準は ${R30_BASELINE} 回、ADR-0024 retro update)`,
      );
      warnings++;
    }
  } else if (repMatch && !loopMatch) {
    console.warn(`[WARN] ${file}: "${repMatch[1]} 回反復" 記述あるが for loop 例なし`);
    warnings++;
  }
}

console.log(
  `\nIteration consistency: ${errors} errors, ${warnings} warnings (R-30 baseline: ${R30_BASELINE})`,
);
process.exit(errors > 0 ? 1 : 0);
