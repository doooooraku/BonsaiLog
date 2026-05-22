#!/usr/bin/env node
/**
 * check-icon-duplication.mjs (Sess36 PR-5、 ADR-0042 D4 / R-9 昇華)
 *
 * SVG icon file 間で `export function *Icon(` の同名重複を検出して CI で fail させる。
 *
 * 動機 (ADR-0042 Context):
 * - 旧: NavIcons (UI ナビ用 24-28px) と EventIcons (event 種別用 14-18px) は意味的役割が完全に
 *   異なるが、 `_layout.tsx` で EventIcons の `DropletIcon` (size=16 watering 用) を
 *   `size={28}` 上書きして nav 用に兼用していた事故あり (記録タブで「水滴 = 水やり専用」 と
 *   誤認される機能整合性 bug)
 * - 現状重複ゼロ baseline を CI 強制 → 仕様変更で偶発的に同名 export が入った瞬間 fail で検出
 *
 * 対象 file (将来 icon file 追加時は TARGETS に追加):
 * - src/components/icons/NavIcons.tsx
 * - src/components/icons/EventIcons.tsx
 *
 * 検出 pattern: `export function (\w+Icon)\(` (関数 export のみ、 type / re-export は対象外)
 *
 * 違反検出時 exit 1。 `pnpm verify` chain (package.json) に組込。
 *
 * @see docs/adr/ADR-0042-tab-icon-and-fab-sot.md D4
 * @see docs/reference/design_system.md §25 タブアイコン
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGETS = ['src/components/icons/NavIcons.tsx', 'src/components/icons/EventIcons.tsx'];

const EXPORT_PATTERN = /export\s+function\s+(\w+Icon)\s*\(/g;

const errors = [];
const iconRegistry = new Map(); // iconName -> [file paths]

for (const relPath of TARGETS) {
  const filePath = path.join(ROOT, relPath);
  if (!fs.existsSync(filePath)) {
    errors.push(`[ENOENT] ${relPath} が存在しません`);
    continue;
  }
  const source = fs.readFileSync(filePath, 'utf8');

  // コメント行内の `export function *Icon(` 検出回避: 行頭から match
  const lines = source.split('\n');
  let inBlockComment = false;
  for (const line of lines) {
    let code = line;
    if (inBlockComment) {
      const endIdx = code.indexOf('*/');
      if (endIdx === -1) continue;
      code = code.slice(endIdx + 2);
      inBlockComment = false;
    }
    if (code.includes('/*') && !code.includes('*/')) {
      code = code.slice(0, code.indexOf('/*'));
      inBlockComment = true;
    }
    const codeOnly = code.split('//')[0];

    EXPORT_PATTERN.lastIndex = 0;
    let match;
    while ((match = EXPORT_PATTERN.exec(codeOnly)) !== null) {
      const iconName = match[1];
      if (!iconRegistry.has(iconName)) {
        iconRegistry.set(iconName, []);
      }
      iconRegistry.get(iconName).push(relPath);
    }
  }
}

// 重複検出
for (const [iconName, files] of iconRegistry.entries()) {
  if (files.length > 1) {
    errors.push(
      `[ADR-0042 D4 違反] icon 関数名 "${iconName}" が複数 file で export されています:\n  - ${files.join(
        '\n  - ',
      )}\n  → 用途が異なるなら別名 (例: NavIcons なら "WaterDropletIcon", EventIcons は "DropletIcon" のまま) で区別してください。 ADR-0042 D1 基準 2 (重複排除) 参照。`,
    );
  }
}

if (errors.length > 0) {
  console.error(`Icon duplication check: ${errors.length} error(s)`);
  for (const err of errors) {
    console.error('  - ' + err);
  }
  process.exit(1);
}

console.log(
  `Icon duplication check: 0 errors (${iconRegistry.size} unique icons across ${TARGETS.length} files)`,
);
