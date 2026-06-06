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

/** design_system.md §2 で定義された 2 themes × 主要色対 (テキスト × 背景 / brand 色)。
 *
 * Sess69 PR-A (2026-06-06): Sess66 PR4 宵墨 (yoizumi) warm sumi pivot 反映 +
 * brand-static 撤回に伴う brand scheme-aware pair 8 種追加 (light + dark で
 * tint / tintSubtle / badgeBg / buttonSecondaryBg の 4 pair)。 計 22 pair。
 */
const PAIRS = [
  // ============= Light theme (washi 和紙背景) =============
  { theme: 'light', label: 'TEXT_PRIMARY × BG_SURFACE', fg: '#1A1A1A', bg: '#FFFFFF' },
  { theme: 'light', label: 'TEXT_PRIMARY × BG_PRIMARY', fg: '#1A1A1A', bg: '#F7F3E8' },
  { theme: 'light', label: 'TEXT_SECONDARY × BG_SURFACE', fg: '#5A5248', bg: '#FFFFFF' },
  { theme: 'light', label: 'TEXT_SECONDARY × BG_PRIMARY', fg: '#5A5248', bg: '#F7F3E8' },
  { theme: 'light', label: 'TEXT_MUTED × BG_SURFACE', fg: '#767066', bg: '#FFFFFF' },
  { theme: 'light', label: 'tint (BRAND_GREEN) × BG_PRIMARY', fg: '#1F3A2E', bg: '#F7F3E8' },
  { theme: 'light', label: 'onTint (ON_BRAND) × tint (BRAND_GREEN)', fg: '#FFFFFF', bg: '#1F3A2E' },
  { theme: 'light', label: 'DANGER × BG_PRIMARY', fg: '#8B2E2E', bg: '#F7F3E8' },
  // Sess69 PR-A: brand subtle / badge / button-secondary pair (light)
  {
    theme: 'light',
    label: 'tint × tintSubtle (BRAND_GREEN × BRAND_GREEN_BG)',
    fg: '#1F3A2E',
    bg: '#F1F8F2',
  },
  {
    theme: 'light',
    label: 'tint × badgeBg (BRAND_GREEN × BADGE_SOFT_BG)',
    fg: '#1F3A2E',
    bg: '#E8F0EA',
  },
  { theme: 'light', label: 'tint × buttonSecondaryBg', fg: '#1F3A2E', bg: '#E8F0EA' },
  // ============= Dark theme (yoizumi 宵墨 warm sumi) =============
  // Sess66 PR4 ADR-0015 Amendment: navy 寒色 → 宵墨 warm 暖墨 pivot 反映
  { theme: 'dark', label: 'TEXT_PRIMARY × BG_PRIMARY', fg: '#ECE6D6', bg: '#16140F' },
  { theme: 'dark', label: 'TEXT_PRIMARY × BG_SURFACE', fg: '#ECE6D6', bg: '#211E18' },
  { theme: 'dark', label: 'TEXT_SECONDARY × BG_PRIMARY', fg: '#B3AA97', bg: '#16140F' },
  { theme: 'dark', label: 'TEXT_SECONDARY × BG_SURFACE', fg: '#B3AA97', bg: '#211E18' },
  { theme: 'dark', label: 'TEXT_MUTED × BG_SURFACE', fg: '#837A68', bg: '#211E18' },
  { theme: 'dark', label: 'tint (苔緑 #7FA98A) × BG_PRIMARY', fg: '#7FA98A', bg: '#16140F' },
  {
    theme: 'dark',
    label: 'onTint (#1A1A1A sumi) × tint (#7FA98A 苔緑)',
    fg: '#1A1A1A',
    bg: '#7FA98A',
  },
  { theme: 'dark', label: 'DANGER (#CE7A72) × BG_PRIMARY', fg: '#CE7A72', bg: '#16140F' },
  // Sess69 PR-A: brand subtle / badge / button-secondary pair (dark)
  { theme: 'dark', label: 'tint × tintSubtle', fg: '#7FA98A', bg: '#2A3328' },
  { theme: 'dark', label: 'tint × badgeBg', fg: '#7FA98A', bg: '#2C3329' },
  { theme: 'dark', label: 'tint × buttonSecondaryBg', fg: '#7FA98A', bg: '#2C3329' },
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
