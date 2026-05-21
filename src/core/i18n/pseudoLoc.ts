/**
 * src/core/i18n/pseudoLoc.ts
 *
 * Sess20 PR-0.5 (ADR-0033 D4) — Pseudo-localization 簡易実装。
 *
 * 全 string を `[xx-{原文}-xx]` で wrap し、 ~2 倍長化することで:
 * - UI 崩れ (文字切れ / overflow / button truncation) を事前検出
 * - placeholder {type} / {count} 等は wrap 内で維持
 *
 * 使い方:
 *   - useTranslation() の lang が 'pseudo' のとき、 全 t() return value を wrap
 *   - 設定画面 (__DEV__ only) で setPseudoMode(true) で切替
 *
 * 注意:
 *   - 本番 build (__DEV__ === false) では Pseudo-loc 完全無効
 *   - placeholder {type} 等を含む string も wrap 対象 (検出力優先)
 */

export function pseudoWrap(s: string): string {
  if (s == null || s === '') return s;
  return `[xx-${s}-xx]`;
}

export function isPseudoLang(lang: string): boolean {
  return lang === 'pseudo';
}
