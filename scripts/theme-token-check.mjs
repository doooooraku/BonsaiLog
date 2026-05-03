#!/usr/bin/env node
/**
 * theme:tokens - F-15 11 トークン × 3 themes 構造検証 (Issue #32 / ADR-0015)
 *
 * Issue #32 AC「全 themes で 11 トークン (background / surface / surface2 / color /
 * muted / borderColor / accent / bonsai_heatmap_l0..l3 / bonsai_today_border) 保持」
 * を構造的に保証する。
 *
 * tamagui.config.ts の `themes:` ブロック内、light / dark / outdoor 各 theme で
 * 11 トークン全ての行 (`<tokenName>: tokens.color.<value>,`) 存在を確認する。
 *
 * 終了コード: 0 = OK, 1 = 不足検出
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const CONFIG_PATH = join(ROOT, 'tamagui.config.ts');
const REQUIRED_THEMES = ['light', 'dark', 'outdoor'];
const REQUIRED_TOKENS = [
  'background',
  'surface',
  'surface2',
  'color',
  'muted',
  'borderColor',
  'accent',
  'bonsai_heatmap_l0',
  'bonsai_heatmap_l1',
  'bonsai_heatmap_l2',
  'bonsai_heatmap_l3',
  'bonsai_today_border',
];

if (!existsSync(CONFIG_PATH)) {
  console.error('❌ tamagui.config.ts not found');
  process.exit(1);
}

const content = readFileSync(CONFIG_PATH, 'utf8');
const errors = [];

function extractThemeBlock(themeName) {
  // Match: <name>: { ... }, までをキャプチャ。ネスト無しの想定。
  const re = new RegExp(`\\b${themeName}:\\s*\\{([^}]*)\\}`, 's');
  const m = content.match(re);
  return m ? m[1] : null;
}

for (const theme of REQUIRED_THEMES) {
  const block = extractThemeBlock(theme);
  if (block === null) {
    errors.push(`[${theme}] テーマブロック自体が見つかりません`);
    continue;
  }
  for (const token of REQUIRED_TOKENS) {
    const tokenRe = new RegExp(`\\b${token}\\s*:\\s*tokens\\.`, 'm');
    if (!tokenRe.test(block)) {
      errors.push(`[${theme}] トークン "${token}" が未定義`);
    }
  }
}

if (errors.length > 0) {
  console.error('❌ theme:tokens failed (Issue #32 / ADR-0015 違反)');
  errors.forEach((e) => console.error('  ' + e));
  console.error(`\n合計 ${errors.length} 件の不整合。tamagui.config.ts を確認してください。`);
  process.exit(1);
}

console.log(
  `✅ theme:tokens passed (${REQUIRED_THEMES.length} themes × ${REQUIRED_TOKENS.length} tokens 全部存在)`,
);
