/**
 * タイムゾーン取得ヘルパー (P2-03 PR-A、ADR-0008 §TZ 3 層防御)。
 *
 * Related:
 * - Issue #17 F-02 AC2-1 (getTimezoneOffset 直接呼び禁止)
 * - Issue #17 F-02 AC2-4 (JST=+540, PST=-480、符号反転を 1 ヶ所で実施)
 * - types.ts (TzOffsetMin / TzIana Branded Type)
 *
 * 目的:
 * - `Date.prototype.getTimezoneOffset()` の符号反転 (JST が -540 を返す罠) を 1 ヶ所で吸収
 * - ESLint で外部から getTimezoneOffset を禁止
 * - IANA タイムゾーン名取得を Intl 経由で一元化
 *
 * 仕様:
 * - getTzOffsetMin(): JST=+540, PST=-480 (UTC + offset で local time を導出可能)
 * - getTzIana(): "Asia/Tokyo" 等の IANA 名
 */
import { unsafeAsTzIana, unsafeAsTzOffsetMin, type TzIana, type TzOffsetMin } from './types';

/**
 * 現在の TZ オフセット (分) を取得。JST=+540, PST=-480。
 *
 * 注: `Date.prototype.getTimezoneOffset()` は JST=-540 (符号反転) を返すため、
 * **本関数の戻り値 = `-getTimezoneOffset()`** で UTC + offset = local の意味に揃える。
 *
 * @param at - オフセット計算時点 (DST 境界の確認用、省略時は現在)
 */
export function getTzOffsetMin(at?: Date): TzOffsetMin {
  const date = at ?? new Date();
  // 符号反転を 1 ヶ所で実施 (Date.getTimezoneOffset() は UTC - local を返すため負号を付与)
  return unsafeAsTzOffsetMin(-date.getTimezoneOffset());
}

/**
 * 現在の IANA タイムゾーン名を取得 (例: "Asia/Tokyo"、"Europe/Berlin")。
 * `Intl.DateTimeFormat().resolvedOptions().timeZone` 経由で取得、
 * 失敗時は `"UTC"` フォールバック (Hermes Intl 不安定対策)。
 */
export function getTzIana(): TzIana {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && typeof tz === 'string') {
      return unsafeAsTzIana(tz);
    }
  } catch {
    // ignore
  }
  return unsafeAsTzIana('UTC');
}
