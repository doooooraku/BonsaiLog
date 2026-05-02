/**
 * 現在時刻取得の唯一の入口 (P2-03 PR-A、ADR-0008 §TZ 3 層防御)。
 *
 * Related:
 * - Issue #17 F-02 AC2-2 (new Date() 引数なし禁止)
 * - types.ts (IsoUtc Branded Type)
 *
 * 目的:
 * - `new Date()` 引数なしの直接呼出をコードベースから排除
 * - ESLint ルール `no-restricted-syntax` で外部から `new Date()` を禁止
 * - テストで時刻を mock しやすくする (将来 vi.setSystemTime 等)
 *
 * 仕様:
 * - nowUtc(): 現在時刻を IsoUtc 形式で返却
 * - DB 保存時は `nowUtc() as string` でアンラップ
 */
import { unsafeAsIsoUtc, type IsoUtc } from './types';

/**
 * 現在時刻を UTC ISO 8601 形式で取得する唯一の入口。
 *
 * @example
 *   const createdAt = nowUtc();
 *   await db.runAsync('INSERT INTO events (...) VALUES (?, ...)', [createdAt as string]);
 */
export function nowUtc(): IsoUtc {
  return unsafeAsIsoUtc(new Date().toISOString());
}

/**
 * 任意の Date / number / string から IsoUtc を生成 (parser として使用、引数なし new Date() は禁止)。
 *
 * @example
 *   const fromMs = isoUtcFrom(1714604400000);  // "2026-05-02T..."
 *   const fromIso = isoUtcFrom('2026-05-02T01:30:00Z');
 */
export function isoUtcFrom(value: Date | number | string): IsoUtc {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date input for isoUtcFrom: ${String(value)}`);
  }
  return unsafeAsIsoUtc(d.toISOString());
}
