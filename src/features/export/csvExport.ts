/**
 * F-10 エクスポート Phase A — events を CSV 文字列に変換する純関数 (Issue #33 / ADR-0016)。
 *
 * Phase A: events のみ CSV 出力 (全盆栽の作業ログを 1 ファイルに集約)。
 * Phase B (別 PR): bonsai / photos / tags の CSV、PDF、7 画面構成、Repolog `pdfService.ts` 流用。
 *
 * 設計方針:
 * - Pro 限定 (UI 層で `useProStore.isPro` で guard、本ファイルは純関数)
 * - UTF-8 BOM 付き (Excel での文字化け回避)
 * - RFC 4180 準拠の CSV エスケープ (ダブルクォート / 改行 / カンマ)
 * - 列順は固定: id / bonsai_id / type / status / occurred_at_utc / tz_offset_min / tz_iana / duration_min / note / created_at / updated_at
 *   (deleted_at / payload_json は除外、ゴミ箱対象は呼出側でフィルタ)
 */

import type { Event } from '@/src/db/schema';

/** UTF-8 BOM (Excel が UTF-8 を認識するため、CSV 先頭に付与)。 */
export const CSV_BOM = '﻿';

/** RFC 4180 準拠の CSV フィールドエスケープ。null → 空文字。 */
export function escapeCsvField(value: string | number | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  // ダブルクォート / カンマ / CR / LF を含む場合はダブルクォートで囲み、内部の " は "" に。
  if (/["\n\r,]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** events を CSV 行配列に変換 (header 含まず、配列のまま返す純関数)。 */
export function eventsToCsvRows(events: readonly Event[]): string[] {
  const header = [
    'id',
    'bonsai_id',
    'type',
    'status',
    'occurred_at_utc',
    'tz_offset_min',
    'tz_iana',
    'duration_min',
    'note',
    'created_at',
    'updated_at',
  ].join(',');

  const rows = events.map((e) =>
    [
      escapeCsvField(e.id),
      escapeCsvField(e.bonsaiId),
      escapeCsvField(e.type),
      escapeCsvField(e.status),
      escapeCsvField(e.occurredAtUtc),
      escapeCsvField(e.tzOffsetMin),
      escapeCsvField(e.tzIana),
      escapeCsvField(e.durationMin),
      escapeCsvField(e.note),
      escapeCsvField(e.createdAt),
      escapeCsvField(e.updatedAt),
    ].join(','),
  );

  return [header, ...rows];
}

/** events を完全な CSV 文字列に変換 (UTF-8 BOM + CRLF 改行)。 */
export function eventsToCsvString(events: readonly Event[]): string {
  const rows = eventsToCsvRows(events);
  return CSV_BOM + rows.join('\r\n');
}
