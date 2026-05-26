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

// bonsai_csv は人間可読再設計 (Sess47 / ADR-0016 Amended) のため
// `src/features/export/bonsaiCsvRow.ts` の buildBonsaiCsvRow + cellsToCsvString で生成する
// (旧 bonsaiToCsvRows/bonsaiToCsvString = 生 DB ダンプ + 英語 style コードは撤去)。

// species_csv は「保有樹種の集計」へ作り替え (Sess47 / ADR-0016 Amended) のため
// `src/features/export/speciesSummary.ts` の buildSpeciesSummaryRows + cellsToCsvString で生成する
// (旧 speciesToCsvRows/speciesToCsvString = 樹種マスタ辞書ダンプは撤去)。
