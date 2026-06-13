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
/**
 * 副次背景 (和紙派生、 Sess106 PR-2 追加)。
 * - AdBanner プレースホルダ (広告ロード前の枠予約、 CLS 解消、 ADR-0010 Sess106 Amendment §22 修正1)
 * - 将来の skeleton / divider 等の中間色背景にも展開可
 * - BG_PRIMARY (#F7F3E8) より約 5% 暗い (= ロード中であることを視覚的に示唆)
 */
export const BG_SECONDARY = '#EFE9D8';

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
/** 文字数上限到達 inline 警告 (Sess14 PR-R、 form atom 共通化、 DANGER と微妙に異なる shade で意図分離)。 */
export const OVERLIMIT = '#C62828';

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

// =========================================================================
// Badge (Sess28 ADR-0037: ×n / N 日連続 等の count badge 統一トークン)
// =========================================================================

/**
 * 「優しい」 バッジ背景 (薄緑、 washi 背景と調和、 BRAND_GREEN とコントラスト 9.5:1 = WCAG AAA)。
 * 適用: PlanScreen groupCountBadge / bonsai-detail eventCountBadge (history + timeline) /
 * timelineConsecutive (4 箇所統一)。
 */
export const BADGE_SOFT_BG = '#E8F0EA';

/** バッジ文字色 (= BRAND_GREEN、 token 統一参照のため re-export)。 */
export const BADGE_SOFT_TEXT = BRAND_GREEN;

// =========================================================================
// Button (Sess29 ADR-0038: Secondary CTA button 統一トークン)
// =========================================================================

/**
 * Secondary CTA button 背景 (薄緑、 washi 背景と調和、 design_system §22 ボタン階層の 2 段目)。
 * 適用: EventRow actionButton (個別 row 「作業を記録」) / PlanScreen + RecordTabScreen の
 * group header「全 N 件を記録」 button。
 *
 * 同色 (#E8F0EA) だが BADGE_SOFT_BG とは用途分離 (バッジ = 情報、 button = CTA)。
 * dark mode 対応は次セッション候補。
 */
export const BUTTON_SECONDARY_BG = '#E8F0EA';

/** Secondary CTA button 文字色 (= BRAND_GREEN、 token 統一参照のため re-export)。 */
export const BUTTON_SECONDARY_TEXT = BRAND_GREEN;
