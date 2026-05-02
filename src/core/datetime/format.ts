/**
 * 日時フォーマッター (P2-03 PR-A、ADR-0008 §TZ 3 層防御)。
 *
 * Related:
 * - Issue #17 F-02 AC2-5 (DST 境界での UTC 保存安定)
 * - Issue #17 F-02 AC2-6 (Hermes Intl 動作確認)
 * - types.ts (IsoUtc / TzIana Branded Type)
 *
 * 目的:
 * - DST 対応の local time フォーマットを 1 関数に集約
 * - date-fns-tz の formatInTimeZone を経由 (Hermes Intl の不安定さを補完)
 *
 * 仕様:
 * - formatLocal(isoUtc, tzIana, pattern): IANA 名で DST 対応、formatInTimeZone 経由
 * - format pattern は date-fns 形式 (例: "yyyy-MM-dd HH:mm")
 */
import { formatInTimeZone } from 'date-fns-tz';

import type { IsoUtc, TzIana } from './types';

/**
 * UTC ISO 8601 タイムスタンプを指定 IANA タイムゾーンの local time にフォーマット。
 *
 * @param isoUtc - "2026-05-02T01:30:00.000Z" 等
 * @param tzIana - "Asia/Tokyo" 等
 * @param pattern - date-fns 形式 (例: "yyyy-MM-dd HH:mm")
 *
 * @example
 *   formatLocal(nowUtc(), getTzIana(), 'yyyy-MM-dd HH:mm');
 *   // JST: "2026-05-02 10:30"
 */
export function formatLocal(isoUtc: IsoUtc, tzIana: TzIana, pattern: string): string {
  return formatInTimeZone(isoUtc as string, tzIana as string, pattern);
}
