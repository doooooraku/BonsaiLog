/**
 * Design Tokens (BonsaiLog Source of Truth)。
 *
 * `docs/reference/design_system.md` と Claude Design `tokens.css` に完全整合。
 * R-25 drift 解消 (feat/design-tokens-v2-1F3A2E): BRAND_GREEN を Material 緑
 * `#2E7D32` から ADR/Design 整合の深緑 fukamidori `#1F3A2E` に切替、
 * washi 背景・accent-gold・text-secondary 等の新規トークンを追加。
 *
 * Light のみ定義、Dark / Outdoor は `themeResolver.ts` 経由で参照。
 */

// =========================================================================
// Background
// =========================================================================

/** 背景 (washi 和紙色、Light モード既定)。 */
export const BG_PRIMARY = '#F7F3E8';
/** カード背景 (Surface)。 */
export const BG_SURFACE = '#FFFFFF';

// =========================================================================
// Text
// =========================================================================

/** 本文 (sumi 墨色、AAA 16:1 vs BG_SURFACE)。 */
export const TEXT_PRIMARY = '#1A1A1A';
/** 補助テキスト (AA 7.7:1 vs BG_SURFACE)。 */
export const TEXT_SECONDARY = '#5A5248';
/** 3 次テキスト (ADR-0020 Phase 10 で AA 4.5:1 適合に補正、#8A8274 → #767066)。 */
export const TEXT_MUTED = '#767066';

/** 旧名 alias (TEXT_PRIMARY と同値、AdBanner 等で利用)。 */
export const TEXT_DEFAULT = TEXT_PRIMARY;

// =========================================================================
// Brand (深緑 fukamidori)
// =========================================================================

/** Brand 緑 (深緑 fukamidori、CTA / Pressable / 選択中ボーダー、AAA 11:1 vs #FFFFFF)。 */
export const BRAND_GREEN = '#1F3A2E';
/** Brand 緑 押下時。 */
export const BRAND_GREEN_HOVER = '#2A4C3D';
/** Brand 緑の薄色 (選択中背景 / Comparison 表背景)。 */
export const BRAND_GREEN_BG = '#F1F8F2';

// =========================================================================
// Accent (樹皮 / 秋葉)
// =========================================================================

/** 樹皮色 (タグ・区切り)。 */
export const ACCENT_BARK = '#5A4637';
/** 秋葉色 (Pro バッジのみ、design_system.md §2-1)。 */
export const ACCENT_GOLD = '#C69E48';

// =========================================================================
// Status
// =========================================================================

/** 危険 (削除確認モーダル等)。 */
export const DANGER = '#8B2E2E';
/** 成功 (保存完了 toast 等)。 */
export const SUCCESS = '#3E5C39';

// =========================================================================
// Border
// =========================================================================

/** 標準ボーダー (淡、design_system.md §2-1 整合)。 */
export const BORDER_DEFAULT = '#D9D1BF';
/** 強調ボーダー。 */
export const BORDER_STRONG = '#8A8274';

// =========================================================================
// Heatmap (F-04、ColorBrewer Greens 4-class、color-blind safe)
// =========================================================================

/** ヒートマップ配色 (Brand 変更後も色相維持)。 */
export const HEATMAP_COLORS = {
  L0: '#F5F8F5',
  L1: '#BAE4B3',
  L2: '#74C476',
  L3: '#238B45',
} as const;

// =========================================================================
// Misc
// =========================================================================

/** Disabled 状態の背景 (AdMob banner / disabled CTA)。 */
export const DISABLED_BG = '#9E9E9E';

/** Brand 上のテキスト色 (Pro バッジ等)。 */
export const ON_BRAND = '#FFFFFF';
