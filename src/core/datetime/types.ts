/**
 * 日時 Branded Type 定義 (P2-03 PR-A、ADR-0008 §TZ 3 層防御)。
 *
 * Related:
 * - Issue #17 F-02 AC2-3
 * - ADR-0008 (events STI + datetime ラッパー)
 * - constraints.md §1-2 (UTC ISO 8601 TEXT + tz_offset_min INTEGER)
 *
 * 目的:
 * - 文字列 / 数値だけでは TZ 関連の混同を防げない
 * - Branded Type で互換性のないキャストをコンパイル時にエラー化
 *
 * 仕様:
 * - IsoUtc: "YYYY-MM-DDTHH:mm:ss.sssZ" 形式の UTC タイムスタンプ
 * - TzOffsetMin: UTC からのオフセット分 (JST=+540, PST=-480、符号 ad-hoc 反転禁止)
 * - TzIana: IANA タイムゾーン名 (例: "Asia/Tokyo"、DST 対応)
 *
 * 使い方:
 * - 生成は `clock.ts` / `tz.ts` の専用関数経由のみ (ESLint で `new Date()` 引数なし禁止)
 * - 受け渡しは Branded Type を maintain
 * - DB 保存時は `branded as string` でアンラップ (writer の責務)
 */

declare const isoUtcBrand: unique symbol;
declare const tzOffsetBrand: unique symbol;
declare const tzIanaBrand: unique symbol;

/** UTC ISO 8601 タイムスタンプ (例: "2026-05-02T01:30:00.000Z")。 */
export type IsoUtc = string & { readonly [isoUtcBrand]: 'IsoUtc' };

/** UTC からのオフセット分 (JST=+540, PST=-480)。**符号反転は tz.ts 内のみ**で実施。 */
export type TzOffsetMin = number & { readonly [tzOffsetBrand]: 'TzOffsetMin' };

/** IANA タイムゾーン名 (例: "Asia/Tokyo"、"Europe/Berlin")。DST 自動対応。 */
export type TzIana = string & { readonly [tzIanaBrand]: 'TzIana' };

// ---------------------------------------------------------------------------
// アンセーフキャスト (clock.ts / tz.ts 内部のみで使用、外部呼出禁止)
// ---------------------------------------------------------------------------

export function unsafeAsIsoUtc(value: string): IsoUtc {
  return value as IsoUtc;
}

export function unsafeAsTzOffsetMin(value: number): TzOffsetMin {
  return value as TzOffsetMin;
}

export function unsafeAsTzIana(value: string): TzIana {
  return value as TzIana;
}
