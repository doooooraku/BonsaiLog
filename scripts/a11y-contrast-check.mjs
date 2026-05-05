#!/usr/bin/env node
/**
 * a11y contrast check (WCAG AA 4.5:1 必達 / AAA 7:1 推奨)。
 *
 * design_system.md §2 の各 theme 内で「テキスト色 × 背景色」の組み合わせを
 * 計算し、AA (4.5:1) 不達なら error。
 *
 * 出典: WCAG 2.1 §1.4.3 (text contrast minimum)。
 *
 * Phase B-0: warning モード (--strict 未指定なら exit 0、verify chain 通過)。
 * Phase B-3 完遂後に --strict 必須化、AAA 7:1 ゲート化を予定。
 */

const STRICT = process.argv.includes('--strict');

/** 16 進カラーを sRGB linear に変換 (WCAG 2.1 算式)。 */
function relativeLuminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Invalid hex color: ${hex}`);
  const v = parseInt(m[1], 16);
  const ch = [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** design_system.md §2 で定義された 3 themes × 主要色対 (テキスト × 背景)。 */
const PAIRS = [
  // light theme (washi 背景)
  { theme: 'light', label: 'TEXT_PRIMARY × BG_SURFACE', fg: '#1A1A1A', bg: '#FFFFFF' },
  { theme: 'light', label: 'TEXT_PRIMARY × BG_PRIMARY', fg: '#1A1A1A', bg: '#F7F3E8' },
  { theme: 'light', label: 'TEXT_SECONDARY × BG_SURFACE', fg: '#5A5248', bg: '#FFFFFF' },
  { theme: 'light', label: 'TEXT_SECONDARY × BG_PRIMARY', fg: '#5A5248', bg: '#F7F3E8' },
  { theme: 'light', label: 'TEXT_MUTED × BG_SURFACE', fg: '#767066', bg: '#FFFFFF' },
  { theme: 'light', label: 'BRAND_GREEN × BG_PRIMARY', fg: '#1F3A2E', bg: '#F7F3E8' },
  { theme: 'light', label: 'ON_BRAND × BRAND_GREEN', fg: '#FFFFFF', bg: '#1F3A2E' },
  { theme: 'light', label: 'DANGER × BG_PRIMARY', fg: '#8B2E2E', bg: '#F7F3E8' },
  // dark theme
  { theme: 'dark', label: 'TEXT_PRIMARY × BG_PRIMARY', fg: '#E8E4D6', bg: '#0A0E1A' },
  { theme: 'dark', label: 'TEXT_PRIMARY × BG_SURFACE', fg: '#E8E4D6', bg: '#131826' },
  { theme: 'dark', label: 'TEXT_SECONDARY × BG_PRIMARY', fg: '#B0A897', bg: '#0A0E1A' },
  { theme: 'dark', label: 'BRAND_GREEN × BG_PRIMARY', fg: '#6B9B7F', bg: '#0A0E1A' },
  // outdoor theme (WCAG AAA 7:1 目標)
  { theme: 'outdoor', label: 'TEXT × BG (AAA)', fg: '#000000', bg: '#FFFFFF', aaa: true },
  { theme: 'outdoor', label: 'PRIMARY × BG (AAA)', fg: '#000080', bg: '#FFFFFF', aaa: true },
];

const AA = 4.5;
const AAA = 7.0;

let warnings = 0;
let errors = 0;

for (const p of PAIRS) {
  const ratio = contrastRatio(p.fg, p.bg);
  const required = p.aaa ? AAA : AA;
  const pass = ratio >= required;
  const tag = pass ? '✅' : p.aaa ? '❌ AAA' : '❌ AA';
  const line = `${tag} [${p.theme}] ${p.label} = ${ratio.toFixed(2)}:1 (required ${required}:1)`;
  if (!pass) {
    if (STRICT) errors++;
    else warnings++;
    console.error(line);
  } else {
    console.log(line);
  }
}

console.log('');
if (errors > 0) {
  console.error(`a11y:contrast FAILED — ${errors} contrast violations`);
  process.exit(1);
}
if (warnings > 0) {
  console.warn(
    `a11y:contrast PASSED with ${warnings} warnings (Phase B-0、--strict で error 化予定)`,
  );
} else {
  console.log('a11y:contrast PASSED — 全 pair で WCAG AA 達成');
}
process.exit(0);
