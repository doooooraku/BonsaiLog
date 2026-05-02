/**
 * F-15 Phase C カラー トークン (Issue #32 / ADR-0015)。
 *
 * Phase C 範囲:
 * - WateringHeatmap (F-04) や PaywallScreen (F-13) 等で重複していた hex 値を一元化
 * - light のみ定義 (本 PR スコープ)、dark / outdoor は Phase D で Tamagui themes 全面再設計時に追加
 *
 * Phase D 以降:
 * - Tamagui themes 全面再設計 (light / dark / outdoor の 3 themes、トークン 11 個)
 * - dark: #121212 / #E1E1E1 / #7BC97D
 * - outdoor: #FFFFFF + #000000 + #1B5E20 緑単色
 * - ESLint no-restricted-syntax で hex リテラル禁止 (このトークン経由を強制)
 *
 * 設計方針:
 * - 命名規約 TN1: 標準キー (background / color / accent) + 独自プレフィクス bonsai_*
 * - 配色 ColorBrewer Greens 4-class (color-blind safe、F-04 ヒートマップ用)
 * - WCAG AAA 7:1 必達 (light 配色)
 */

/** Brand 緑 (CTA / Pressable / 選択中ボーダー)。WCAG AAA 7.4:1 vs #FFFFFF。 */
export const BRAND_GREEN = '#2E7D32';
/** Brand 緑の薄色 (選択中背景 / Comparison 表背景)。 */
export const BRAND_GREEN_BG = '#F1F8F2';

/** ヒートマップ配色 (ColorBrewer Greens 4-class、color-blind safe、F-04)。 */
export const HEATMAP_COLORS = {
  L0: '#F5F8F5',
  L1: '#BAE4B3',
  L2: '#74C476',
  L3: '#238B45',
} as const;

/** 標準ボーダー色 (#E0E0E0、淡灰色、light 用)。 */
export const BORDER_DEFAULT = '#E0E0E0';

/** Disabled 状態の背景 (#9E9E9E、AdMob banner / disabled CTA)。 */
export const DISABLED_BG = '#9E9E9E';

/** Pro バッジ用テキスト色 (#FFFFFF on BRAND_GREEN)。 */
export const ON_BRAND = '#FFFFFF';

/** 本文標準色 (#1A1A1A、AAA 16:1 vs #FFFFFF)。 */
export const TEXT_DEFAULT = '#1A1A1A';

/** 補助テキスト色 (#666、AA 5.74:1 vs #FFFFFF、AdBanner ラベル等)。 */
export const TEXT_MUTED = '#666666';
