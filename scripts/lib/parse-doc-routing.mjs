/**
 * parse-doc-routing.mjs — doc-routing.md (Code-to-Docs ルーティング原本) の表 parse 共通 lib
 *
 * 利用元: scripts/gen-doc-routing.mjs (rules 生成) / scripts/doc-freshness-check.mjs (鮮度検査)
 * parse 仕様を 2 script に複製しない (Doc-Truth Audit retro「固定値・仕様の多重コピー禁止」のコード版)。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const SOURCE = 'docs/reference/doc-routing.md';

/**
 * 表のデータ行を parse して { rows, errors } を返す。
 * row = { id, globs: string[], docs: string[], point: string }
 */
export function parseDocRouting(rootDir) {
  const errors = [];
  const rows = [];
  const src = readFileSync(join(rootDir, SOURCE), 'utf8');
  for (const line of src.split('\n')) {
    // データ行のみ: | id | ... | (ヘッダ行 `| ID |` と区切り行 `| ---` を除外)
    const m = line.match(/^\| ([a-z][a-z0-9-]*) +\|/);
    if (!m) continue;
    const cells = line.split('|').map((c) => c.trim());
    // cells[0] は空、[1]=ID, [2]=glob, [3]=doc, [4]=観点
    if (cells.length < 5) {
      errors.push(`列不足の行: ${line.slice(0, 60)}…`);
      continue;
    }
    const ticks = (cell) => [...cell.matchAll(/`([^`]+)`/g)].map((x) => x[1]);
    rows.push({ id: cells[1], globs: ticks(cells[2]), docs: ticks(cells[3]), point: cells[4] });
  }
  if (rows.length === 0) errors.push(`${SOURCE} からデータ行を 1 行も parse できなかった`);
  return { rows, errors };
}

/** glob の接頭 (最初の * より前、末尾 / 除去) を返す。glob でなければそのまま */
export function globPrefix(glob) {
  return glob.includes('*') ? glob.slice(0, glob.indexOf('*')).replace(/\/$/, '') : glob;
}
