/**
 * ローカル日付キー (YYYY-MM-DD) 算出 (ADR-0008 §TZ 3 層防御、 Sess67 で features/watering から core/datetime に昇格)。
 *
 * 来歴:
 * - 元 `src/features/watering/dateUtils.ts` 由来 (Sess36 PR-7 で fix/248 crash 対策込で確立)
 * - Sess67 で LabeledDateRow (components 層) が直接利用する必要が出たため、 FSD boundary
 *   (`components` → `features` 禁止) を解消するため core/datetime に正規移設
 * - `features/watering/dateUtils.ts` は本実装を re-export して後方互換維持
 *
 * 役割:
 * - UTC ISO 文字列 + TZ オフセット (分) からローカル日付キー (YYYY-MM-DD) を算出する純関数
 * - DB / FileSystem には触れない (Jest テスト容易)
 *
 * 設計意図:
 * - JS の Date は ±8.64e15 ms を超えると Invalid Date になるため、 範囲外は epoch にフォールバック
 *   (fix/248 実機 crash 対策: 旧データの occurredAtUtc が空 / 不正 / 巨大値で RangeError 防止)
 * - `toISOString().slice(0, 10)` は通常 UTC 日付を返し誤用源だが、 localMs を UTC ms に見立てて
 *   ISO 化する正規トリックで利用 (check-utc-date-slice lint で allow marker 経由 OK)
 */

/**
 * UTC ISO 文字列からローカル日付キー (YYYY-MM-DD) を取り出すヘルパー。
 *
 * @param isoUtc - UTC ISO 8601 文字列 (例: "2026-05-02T16:00:00.000Z")
 * @param tzOffsetMin - ローカル UTC オフセット (分単位、JST=540、PST=-480)
 * @returns "YYYY-MM-DD" (ローカル日付キー)、 invalid 入力は "1970-01-01" フォールバック
 *
 * @example
 *   toLocalDateKey('2026-05-02T16:00:00.000Z', 540); // → "2026-05-03" (JST 翌日)
 *   toLocalDateKey('2026-06-05T15:30:00.000Z', 540); // → "2026-06-06" (Sess67 fix シナリオ)
 */
export function toLocalDateKey(isoUtc: string, tzOffsetMin: number): string {
  const utcMs = new Date(isoUtc).getTime();
  if (!Number.isFinite(utcMs)) return '1970-01-01';
  const localMs = utcMs + tzOffsetMin * 60_000;
  // JS の Date は ±8.64e15 ms (約 ±27 万年) を超えると Invalid Date になる。
  // 通常データではあり得ないが、 ファイル破損 / 攻撃的入力に備えて clamp。
  if (Math.abs(localMs) > 8.64e15) return '1970-01-01';
  const local = new Date(localMs);
  if (Number.isNaN(local.getTime())) return '1970-01-01';
  // toISOString は常に UTC 表現なので、 ローカル時刻にオフセットを足してから
  // toISOString して "YYYY-MM-DD" 部分を取り出す技法。 new Date 直接 .getFullYear()
  // 系は環境依存のため使わない。
  return local.toISOString().slice(0, 10); // lint:utc-date-slice-allow (Sess67: 正規トリック - localMs を UTC ms に見立てて ISO 化)
}
