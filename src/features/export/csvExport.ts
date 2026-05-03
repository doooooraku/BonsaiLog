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

import type { Bonsai, Event } from '@/src/db/schema';

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

// ---------------------------------------------------------------------------
// Phase D-3: bonsai_csv 9 列 (Issue #33 / ADR-0016 AC2)
// ---------------------------------------------------------------------------

/**
 * Bonsai を CSV 出力するための 9 列拡張型。
 *
 * `species_name` は species join 後の名前 (呼出側で speciesRepository から解決)。
 * Bonsai schema 自体には species_id しか持たないため、呼出側で展開する。
 */
export type BonsaiForCsv = Bonsai & {
  /** species join 後の表示名 (なければ空文字)。 */
  speciesName?: string | null;
};

/** bonsai を CSV 行配列 (header 含む) に変換する純関数。 */
export function bonsaiToCsvRows(bonsai: readonly BonsaiForCsv[]): string[] {
  const header = [
    'id',
    'name',
    'species',
    'acquired_at',
    'style',
    'pot_info',
    'archived_at',
    'created_at',
    'updated_at',
  ].join(',');

  const rows = bonsai.map((b) =>
    [
      escapeCsvField(b.id),
      escapeCsvField(b.name),
      escapeCsvField(b.speciesName ?? ''),
      escapeCsvField(b.acquiredAt),
      escapeCsvField(b.style),
      escapeCsvField(b.potInfo),
      escapeCsvField(b.archivedAt),
      escapeCsvField(b.createdAt),
      escapeCsvField(b.updatedAt),
    ].join(','),
  );

  return [header, ...rows];
}

/** bonsai を完全な CSV 文字列に変換 (UTF-8 BOM + CRLF 改行)。 */
export function bonsaiToCsvString(bonsai: readonly BonsaiForCsv[]): string {
  const rows = bonsaiToCsvRows(bonsai);
  return CSV_BOM + rows.join('\r\n');
}
