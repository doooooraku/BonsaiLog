/**
 * F-15 テーマ解決 — 純関数 (Phase D、Issue #32 / ADR-0015)。
 *
 * AC2 (4 mode 切替) + AC5 (Settings UI、屋外 ON 時セグメント disabled) のロジック純関数化。
 *
 * 設計方針:
 * - app/_layout.tsx 内のインライン式 (themeMode === 'system' ? systemScheme : themeMode) を
 *   テスト可能な純関数に切り出し
 * - outdoor mode が最優先 (常に light fallback)
 * - system mode 時は OS scheme を尊重、null/undefined は light フォールバック
 */

/** ユーザー選択可能なテーマモード (Settings UI のセグメント値)。 */
export type ThemeMode = 'system' | 'light' | 'dark';

/** 実効的に適用されるテーマスキーム (UI 描画で使用)。 */
export type EffectiveScheme = 'light' | 'dark';

/**
 * テーマモード + OS scheme + 屋外モードから実効テーマを解決する純関数。
 *
 * 優先順位:
 * 1. outdoorMode=true → 常に 'light' (ADR-0015 屋外モードは純白背景固定)
 * 2. themeMode='system' → systemScheme を採用 (null/undefined は 'light' フォールバック)
 * 3. themeMode='light' / 'dark' → そのまま返却
 *
 * @example
 *   resolveEffectiveScheme('system', 'dark', false) === 'dark'
 *   resolveEffectiveScheme('system', null, false) === 'light' (フォールバック)
 *   resolveEffectiveScheme('dark', 'light', true) === 'light' (outdoor 優先)
 *   resolveEffectiveScheme('light', 'dark', false) === 'light' (ユーザー選択)
 */
export function resolveEffectiveScheme(
  themeMode: ThemeMode,
  systemScheme: EffectiveScheme | null | undefined,
  outdoorMode: boolean,
): EffectiveScheme {
  if (outdoorMode) return 'light';
  if (themeMode === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return themeMode;
}

/**
 * Settings の「テーマ」セグメントが disabled 状態か判定する純関数 (AC5)。
 *
 * 屋外モード ON 時は light 固定のため、セグメントは操作不能。
 */
export function isThemeSelectionDisabled(outdoorMode: boolean): boolean {
  return outdoorMode === true;
}

/**
 * outdoor → light fallback の理由を表す型 (AC5 UI で「屋外モード中は light 固定」表示用)。
 */
export type ThemeResolutionReason =
  | 'outdoor_override' // 屋外モード優先で light 強制
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
  outdoorMode: boolean,
): { scheme: EffectiveScheme; reason: ThemeResolutionReason } {
  if (outdoorMode) return { scheme: 'light', reason: 'outdoor_override' };
  if (themeMode === 'system') {
    if (systemScheme === 'dark') return { scheme: 'dark', reason: 'system_dark' };
    if (systemScheme === 'light') return { scheme: 'light', reason: 'system_light' };
    return { scheme: 'light', reason: 'system_fallback' };
  }
  return { scheme: themeMode, reason: 'user_explicit' };
}
