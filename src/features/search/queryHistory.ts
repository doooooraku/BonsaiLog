/**
 * F-09 検索クエリ正規化 + 検索履歴管理 (Phase D、Issue #31 / ADR-0008 改訂)。
 *
 * AC9 (その他) Y4-Y10 + AC7 (検索履歴) の純関数:
 * - normalizeSearchQuery: Y4 前後 trim + Y5 case-insensitive 正規化
 * - pushSearchHistory: 最大 20 件 FIFO + 重複排除 (新しい順)
 * - clearSearchHistory: 履歴全クリア
 *
 * 副作用なし純関数のため、AsyncStorage 永続化は呼出側 (UI 層) で実施。
 * 本ファイルは「履歴配列の不変変換」だけを責務とする。
 */

/** 検索クエリの最大長 (UI 入力時にこの長さで切る、シニア UX 配慮)。 */
export const MAX_QUERY_LENGTH = 100;

/** 検索履歴の最大保持件数 (AC7-1 AsyncStorage 最大 20 件 FIFO)。 */
export const MAX_HISTORY_SIZE = 20;

/**
 * 検索クエリを正規化する純関数。
 *
 * - Y4: 前後空白 trim
 * - Y5: case-insensitive のため `toLocaleLowerCase()` で小文字化
 * - 連続空白を 1 つに圧縮 (内部空白の正規化、search 側 LIKE / FTS 検索の安定性)
 * - 空文字列は空のまま返却 (UI 側で「2 文字以上」ガード)
 *
 * @param raw 入力クエリ (任意の string、null/undefined は空文字扱い)
 */
export function normalizeSearchQuery(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (trimmed.length === 0) return '';
  // 連続空白 (全角 / 半角混在) を半角 1 つに統一
  const collapsed = trimmed.replace(/[\s　]+/g, ' ');
  return collapsed.toLocaleLowerCase();
}

/**
 * 検索履歴に新しいクエリを追加する純関数 (FIFO + 重複排除)。
 *
 * - 既存に同じクエリがあれば削除してから先頭に追加 (= 最近使った順を維持)
 * - 最大 `max` 件まで保持、超過分は末尾から切り捨て
 * - クエリは `normalizeSearchQuery` 済みを想定 (呼出側で正規化)
 * - 空文字列は履歴に追加しない (no-op、history をそのまま返す)
 *
 * @param history 既存の履歴 (新しい順)
 * @param query 追加するクエリ (正規化済推奨)
 * @param max 最大保持件数 (default: MAX_HISTORY_SIZE)
 */
export function pushSearchHistory(
  history: readonly string[],
  query: string,
  max: number = MAX_HISTORY_SIZE,
): string[] {
  if (max <= 0) return [];
  if (typeof query !== 'string' || query.length === 0) return [...history].slice(0, max);

  const without = history.filter((item) => item !== query);
  const next = [query, ...without];
  return next.slice(0, max);
}

/**
 * 履歴を全クリアする純関数 (AC7-3 「履歴を削除」ボタン用)。
 *
 * - 単純に空配列を返すだけだが、UI から呼ぶ際の意図を明示するため named export
 */
export function clearSearchHistory(): string[] {
  return [];
}

/**
 * 履歴から特定クエリを 1 件削除する純関数 (拡張用、Phase E 以降の個別削除 UI で使用想定)。
 *
 * - 該当なしならそのまま history を返す (no-op)
 */
export function removeFromSearchHistory(history: readonly string[], query: string): string[] {
  if (typeof query !== 'string' || query.length === 0) return [...history];
  return history.filter((item) => item !== query);
}
