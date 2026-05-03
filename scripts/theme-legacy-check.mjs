#!/usr/bin/env node
/**
 * theme:check - F-15 旧 theme トークン残存検出
 *
 * Issue #32 / ADR-0015 で削除した旧 theme トークン (neonPink / neonGreen /
 * cyberBlue) や旧 hex (#39FF14 ネオン緑 / #0A0E1A 出典不明 / #FFFF00 屋外黄)
 * が src/ や app/ に残存していないことを保証する。
 *
 * 終了コード: 0 = OK, 1 = 残存検出
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const TARGETS = ['src', 'app'];
const FORBIDDEN = ['neonGreen', 'neonPink', 'cyberBlue', '#39FF14', '#0A0E1A', '#FFFF00'];
const errors = [];

function walk(dir, callback) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, callback);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      callback(full);
    }
  }
}

for (const target of TARGETS) {
  walk(join(ROOT, target), (file) => {
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      for (const token of FORBIDDEN) {
        if (line.includes(token)) {
          errors.push(
            `${relative(ROOT, file)}:${i + 1}  ${token} が残存: ${line.trim().slice(0, 80)}`,
          );
        }
      }
    });
  });
}

if (errors.length > 0) {
  console.error('❌ theme:check failed (Issue #32 / ADR-0015 違反)');
  errors.forEach((e) => console.error('  ' + e));
  console.error(`\n合計 ${errors.length} 件の旧 theme トークン残存。削除してください。`);
  process.exit(1);
}

console.log('✅ theme:check passed (旧 theme トークン残存ゼロ)');
