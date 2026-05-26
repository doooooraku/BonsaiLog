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

import type { Bonsai, Species } from '@/src/db/schema';

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

/**
 * 整形済みセル配列 (1 行目 = ヘッダ、以降 = データ) を UTF-8 BOM + CRLF の CSV 文字列へ。
 * ローカライズ/日付整形/payload 抽出は呼出側 (exportFlow) で済ませ、本関数は escape + 連結のみ。
 */
export function cellsToCsvString(
  rows: readonly (readonly (string | number | null | undefined)[])[],
): string {
  const lines = rows.map((cells) => cells.map(escapeCsvField).join(','));
  return CSV_BOM + lines.join('\r\n');
}

// events_csv は人間可読再設計 (Sess47 / ADR-0016 Amended) のため
// `src/features/export/eventCsvRow.ts` の buildEventCsvRow + cellsToCsvString で生成する
// (旧 eventsToCsvRows/eventsToCsvString = 生 DB ダンプは撤去)。

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

// ---------------------------------------------------------------------------
// Phase D-4: species_csv 8 列 (Issue #33 / ADR-0016 AC2)
// ---------------------------------------------------------------------------

/**
 * Species を CSV 出力するための 8 列拡張型。
 *
 * `common_name` は呼出側で species_names から locale に応じて解決した値を渡す。
 * Species schema 自体には含まれないため、呼出側で展開する。
 */
export type SpeciesForCsv = Species & {
  /** 通称 (locale 別、呼出側で species_names から解決)。なければ空文字。 */
  commonName?: string | null;
};

/** species を CSV 行配列 (header 含む) に変換する純関数。 */
export function speciesToCsvRows(species: readonly SpeciesForCsv[]): string[] {
  const header = [
    'id',
    'scientific_name',
    'common_name',
    'family',
    'climate_zone_min',
    'climate_zone_max',
    'created_at',
    'updated_at',
  ].join(',');

  const rows = species.map((s) =>
    [
      escapeCsvField(s.id),
      escapeCsvField(s.scientificName),
      escapeCsvField(s.commonName ?? ''),
      escapeCsvField(s.family),
      escapeCsvField(s.climateZoneMin),
      escapeCsvField(s.climateZoneMax),
      escapeCsvField(s.createdAt),
      escapeCsvField(s.updatedAt),
    ].join(','),
  );

  return [header, ...rows];
}

/** species を完全な CSV 文字列に変換 (UTF-8 BOM + CRLF 改行)。 */
export function speciesToCsvString(species: readonly SpeciesForCsv[]): string {
  const rows = speciesToCsvRows(species);
  return CSV_BOM + rows.join('\r\n');
}
