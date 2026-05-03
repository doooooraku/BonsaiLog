/**
 * F-04 ヒートマップ — 盆栽フィルター 純関数 (Phase D-2、Issue #29 / ADR-0013 AC6)。
 *
 * AC6 フィルター F1+F3 (シンプルドロップダウン + 検索シート + 最近見た 3 本):
 * - filterBonsaiByQuery(bonsai[], query) - 名前 LIKE 部分一致
 * - sortBonsaiWithRecent(bonsai[], recentIds) - 最近見た 3 本を先頭、その後アイウエオ順
 * - applyBonsaiFilter({bonsai, query, recentIds, includeArchived}) - 統合フィルタ
 *
 * AC6-1 デフォルト = 「すべての盆栽 (集約モード)」、フィルター指定なしは全 active を返す。
 * AC6-3 検索ボックス + 最近見た 3 本 + 全盆栽アイウエオ順。
 */

/** Bonsai 部分型 (テスト容易性のため schema 全部を要求しない)。 */
export type BonsaiLike = {
  id: string;
  name: string;
  archivedAt?: string | null;
};

/**
 * 盆栽名で部分一致フィルタする純関数。
 *
 * - 大文字小文字無視 (`toLocaleLowerCase`)
 * - 前後空白 trim
 * - 空 query → 全件返す
 *
 * @param bonsai 盆栽配列
 * @param query 検索文字列
 */
export function filterBonsaiByQuery<T extends BonsaiLike>(
  bonsai: readonly T[],
  query: string,
): T[] {
  if (typeof query !== 'string') return [...bonsai];
  const normalized = query.trim().toLocaleLowerCase();
  if (normalized.length === 0) return [...bonsai];
  return bonsai.filter((b) => b.name.toLocaleLowerCase().includes(normalized));
}

/**
 * アーカイブ盆栽 (archived_at != null) を除外する純関数。
 *
 * AC6 デフォルト「すべての盆栽 (active のみ)」。
 */
export function excludeArchivedBonsai<T extends BonsaiLike>(bonsai: readonly T[]): T[] {
  return bonsai.filter((b) => b.archivedAt == null);
}

/**
 * 最近見た N 本を配列の先頭に並べ、残りはアイウエオ順 (id 順) でソートする純関数。
 *
 * AC6-3 「検索ボックス + 最近見た 3 本 + 全盆栽アイウエオ順」。
 *
 * - recentIds の順番を保持 (= 最近見た順、新しい順想定)
 * - recentIds に該当しない盆栽は name でロケール対応ソート
 * - 最大 3 本までしか先頭に置かない (recentIds に 4 件以上あれば先頭 3 件のみ採用)
 *
 * @param bonsai 対象盆栽配列
 * @param recentIds 最近見た bonsai id 配列 (新しい順)
 * @param maxRecent 最大何本まで先頭固定するか (default: 3)
 */
export function sortBonsaiWithRecent<T extends BonsaiLike>(
  bonsai: readonly T[],
  recentIds: readonly string[],
  maxRecent: number = 3,
): T[] {
  const idIndex = new Map(bonsai.map((b) => [b.id, b]));
  const recentLimit = Math.max(0, maxRecent);

  // 1. 最近見た N 本 (順序保持、bonsai に存在するもののみ)
  const recent: T[] = [];
  for (const id of recentIds) {
    if (recent.length >= recentLimit) break;
    const found = idIndex.get(id);
    if (found != null && !recent.some((r) => r.id === id)) {
      recent.push(found);
    }
  }

  // 2. 残りはアイウエオ順 (name のロケール対応ソート)
  const recentIdSet = new Set(recent.map((r) => r.id));
  const others = bonsai
    .filter((b) => !recentIdSet.has(b.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'));

  return [...recent, ...others];
}

/**
 * 統合フィルタ純関数。
 *
 * 順序:
 * 1. アーカイブ除外 (`includeArchived=false` 時)
 * 2. クエリで部分一致フィルタ
 * 3. 最近見た 3 本を先頭、残りはアイウエオ順
 *
 * @param params bonsai (元配列) / query (検索) / recentIds (最近見た) / includeArchived (default false)
 */
export function applyBonsaiFilter<T extends BonsaiLike>(params: {
  bonsai: readonly T[];
  query?: string;
  recentIds?: readonly string[];
  includeArchived?: boolean;
}): T[] {
  const { bonsai, query = '', recentIds = [], includeArchived = false } = params;
  const step1 = includeArchived ? [...bonsai] : excludeArchivedBonsai(bonsai);
  const step2 = filterBonsaiByQuery(step1, query);
  return sortBonsaiWithRecent(step2, recentIds);
}
