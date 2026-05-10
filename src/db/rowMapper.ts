/**
 * SQL row の snake_case key を camelCase に変換する汎用 helper。
 *
 * 背景:
 * - expo-sqlite の `db.getFirstAsync` / `db.getAllAsync` は raw row を返す
 * - column 名は **DB のまま (snake_case)**、TypeScript の drizzle 型 (camelCase) と乖離
 * - PR #387 (photoRepository) で発覚 — それ以降の repository にも波及しているため共通化
 *
 * 使い方:
 *   const rawRow = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM bonsai ...');
 *   const bonsai = snakeToCamelRow<Bonsai>(rawRow);
 *
 *   const rawRows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM events ...');
 *   const events = snakeToCamelRows<Event>(rawRows);
 *
 * 設計方針:
 * - 単純な `_<lower>` → `<Upper>` 変換 (例: `relative_path` → `relativePath`)
 * - すでに camelCase の column もあるので idempotent (再変換でも壊れない、`xxx` 中に `_` が無ければ no-op)
 * - null / undefined はそのまま返す (caller 側で存在判定する用)
 */

/** 単一 row の snake_case key を camelCase に変換。null/undefined はそのまま返す。 */
export function snakeToCamelRow<T>(row: Record<string, unknown> | null | undefined): T | null {
  if (row == null) return null;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    result[camelKey] = row[key];
  }
  return result as T;
}

/** 複数 rows を一括変換。 */
export function snakeToCamelRows<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((r) => snakeToCamelRow<T>(r) as T);
}
