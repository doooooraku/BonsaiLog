/**
 * F-15 テーマ解決 — 純関数 (Phase D、Issue #32 / ADR-0015 Notes Amended 2026-05-10)。
 *
 * AC2 (3 mode 切替: Auto / Light / Dark) のロジック純関数化。
 * 屋外モード (outdoor) は ADR-0015 Notes Amended (2026-05-10、PR #312) で v1.0 不採用、E4 PR で削除済。
 *
 * 設計方針:
 * - app/_layout.tsx 内のインライン式 (themeMode === 'system' ? systemScheme : themeMode) を
 *   テスト可能な純関数に切り出し
 * - system mode 時は OS scheme を尊重、null/undefined は light フォールバック
 */

/** ユーザー選択可能なテーマモード (Settings UI のセグメント値)。 */
export type ThemeMode = 'system' | 'light' | 'dark';

/** 実効的に適用されるテーマスキーム (UI 描画で使用)。 */
export type EffectiveScheme = 'light' | 'dark';

/**
 * テーマモード + OS scheme から実効テーマを解決する純関数。
 *
 * 優先順位:
 * 1. themeMode='system' → systemScheme を採用 (null/undefined は 'light' フォールバック)
 * 2. themeMode='light' / 'dark' → そのまま返却
 *
 * @example
 *   resolveEffectiveScheme('system', 'dark') === 'dark'
 *   resolveEffectiveScheme('system', null) === 'light' (フォールバック)
 *   resolveEffectiveScheme('light', 'dark') === 'light' (ユーザー選択)
 */
export function resolveEffectiveScheme(
  themeMode: ThemeMode,
  systemScheme: EffectiveScheme | null | undefined,
): EffectiveScheme {
  if (themeMode === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return themeMode;
}

/**
 * outdoor mode 削除に伴い、Settings の「テーマ」セグメントが disabled になるケースは無い。
 * 後方互換のため stub として残置 (常に false 返却)、v1.x で完全削除予定。
 */
export function isThemeSelectionDisabled(): boolean {
  return false;
}

/**
 * テーマ選択理由を表す型 (UI 表示・診断ログ用)。
 */
export type ThemeResolutionReason =
  | 'user_explicit' // themeMode='light' or 'dark' を明示選択
  | 'system_dark' // system → OS dark
  | 'system_light' // system → OS light
  | 'system_fallback'; // system + null/undefined → light フォールバック

/**
 * 実効テーマと選択理由を返す純関数 (UI 表示・診断ログ用)。
 *
 * resolveEffectiveScheme と整合性を保つため、ロジックは同じ。理由を追加で返す。
 */
export function resolveThemeWithReason(
  themeMode: ThemeMode,
  systemScheme: EffectiveScheme | null | undefined,
): { scheme: EffectiveScheme; reason: ThemeResolutionReason } {
  if (themeMode === 'system') {
    if (systemScheme === 'dark') return { scheme: 'dark', reason: 'system_dark' };
    if (systemScheme === 'light') return { scheme: 'light', reason: 'system_light' };
    return { scheme: 'light', reason: 'system_fallback' };
  }
  return { scheme: themeMode, reason: 'user_explicit' };
}
