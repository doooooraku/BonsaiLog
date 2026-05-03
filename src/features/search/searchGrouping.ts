/**
 * F-09 検索結果整形 — 3 段組み (盆栽 / 樹種 / メモ) 純関数 (Phase E、Issue #31 / ADR-0008 改訂)。
 *
 * AC2 仕様:
 * - 盆栽セクション (盆栽名「黒松「太郎」」) + 樹種セクション (「黒松」) + メモセクション (snippet) の 3 段表示
 * - 0 件セクション非表示 (SE1)
 * - 各セクション内 bm25 降順 → 同スコア updated_at 降順 (SO1)
 * - 上限 50 件 (合算)
 *
 * 純関数のため DB I/O や FTS5 呼出は呼出側で実施、本ファイルは整形のみ。
 */

/** 検索結果アイテムが共通に持つメタデータ。 */
export type SearchResultMeta = {
  /** FTS5 bm25 スコア (低いほど高い関連性、bm25 標準。負値や小さい絶対値が上位)。 */
  bm25?: number | null;
  /** 同スコア時の tiebreaker (UTC ISO 8601、新しい順)。 */
  updatedAt?: string | null;
};

/** 3 段組みのセクション種別。 */
export type SearchSectionKind = 'bonsai' | 'species' | 'note';

/** 整形後のセクション (kind + items)。0 件のセクションは結果に含まれない。 */
export type GroupedSearchSection<T> = {
  kind: SearchSectionKind;
  items: T[];
};

/** 全セクションの上限件数 (AC2)。 */
export const SEARCH_TOTAL_LIMIT = 50;

/** SO1: bm25 降順 (低いほど上位) → 同スコア updated_at 降順 (新しいほど上位)。 */
function compareSearchResults<T extends SearchResultMeta>(a: T, b: T): number {
  const aScore = a.bm25 ?? Number.POSITIVE_INFINITY;
  const bScore = b.bm25 ?? Number.POSITIVE_INFINITY;
  if (aScore !== bScore) {
    // bm25 は低いほど上位 (関連性が高い) → 昇順
    return aScore - bScore;
  }
  // 同スコア → updated_at 降順 (新しい順)
  const aTime = a.updatedAt ?? '';
  const bTime = b.updatedAt ?? '';
  if (aTime > bTime) return -1;
  if (aTime < bTime) return 1;
  return 0;
}

/**
 * 各カテゴリ配列を bm25 降順 + updated_at 降順でソートする純関数。
 * 元配列は変更しない。
 */
export function sortBySearchScore<T extends SearchResultMeta>(items: readonly T[]): T[] {
  return [...items].sort(compareSearchResults);
}

/**
 * 3 段組みに整形する純関数。
 *
 * - 0 件セクションは結果に含めない (SE1)
 * - 各セクション内をソート (SO1)
 * - セクション順序: 盆栽 → 樹種 → メモ (固定)
 * - 全体合算が SEARCH_TOTAL_LIMIT を超えたら、盆栽 → 樹種 → メモ の順に詰めて切り捨て
 *
 * @param params 各カテゴリのアイテム配列
 */
export function groupSearchResults<
  TBonsai extends SearchResultMeta,
  TSpecies extends SearchResultMeta,
  TNote extends SearchResultMeta,
>(params: {
  bonsai: readonly TBonsai[];
  species: readonly TSpecies[];
  notes: readonly TNote[];
  totalLimit?: number;
}): GroupedSearchSection<TBonsai | TSpecies | TNote>[] {
  const { bonsai, species, notes, totalLimit = SEARCH_TOTAL_LIMIT } = params;

  const sortedBonsai = sortBySearchScore(bonsai);
  const sortedSpecies = sortBySearchScore(species);
  const sortedNotes = sortBySearchScore(notes);

  const result: GroupedSearchSection<TBonsai | TSpecies | TNote>[] = [];
  let remaining = Math.max(0, totalLimit);

  if (sortedBonsai.length > 0 && remaining > 0) {
    const slice = sortedBonsai.slice(0, remaining);
    if (slice.length > 0) {
      result.push({ kind: 'bonsai', items: slice });
      remaining -= slice.length;
    }
  }

  if (sortedSpecies.length > 0 && remaining > 0) {
    const slice = sortedSpecies.slice(0, remaining);
    if (slice.length > 0) {
      result.push({ kind: 'species', items: slice });
      remaining -= slice.length;
    }
  }

  if (sortedNotes.length > 0 && remaining > 0) {
    const slice = sortedNotes.slice(0, remaining);
    if (slice.length > 0) {
      result.push({ kind: 'note', items: slice });
    }
  }

  return result;
}

/**
 * 3 段組み合算の総件数を返す純関数 (UI 「N 件見つかりました」表示用)。
 */
export function countGroupedResults<T>(sections: readonly GroupedSearchSection<T>[]): number {
  return sections.reduce((sum, s) => sum + s.items.length, 0);
}
