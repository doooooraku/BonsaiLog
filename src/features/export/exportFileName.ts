/**
 * F-10 エクスポート — ファイル名生成 純関数 (Phase D-1、Issue #33 / ADR-0016 AC9)。
 *
 * AC9 (ファイル名 NM3) 仕様:
 * - 形式: `bonsailog-{kind}-{YYYYMMDD-HHMM}.{csv|pdf}`
 * - ASCII のみ (multibyte 禁止)
 * - Forbidden chars 置換 (`/\:*?"<>|` → `_`)
 * - 連続 `_` を 1 つに圧縮 + 端 `_` 除去
 * - 端末ローカル時刻 (expo-localization、呼出側で生成した Date 渡す)
 *
 * 純関数のため expo-localization に依存しない。Date を呼出側で生成して渡す。
 */

export type ExportKind = 'bonsai-csv' | 'events-csv' | 'species-csv' | 'bonsai-pdf' | 'list-pdf';

export type ExportExt = 'csv' | 'pdf';

const FORBIDDEN_CHARS = /[/\\:*?"<>|]/g;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Date をローカル時刻ベースで `YYYYMMDD-HHMM` に変換する純関数。
 *
 * - 引数 Date のローカルタイムゾーン (`getFullYear` 等) を使用
 * - 呼出側が `new Date()` を渡せば端末 TZ に従う
 *
 * @example
 *   formatLocalTimestamp(new Date('2026-05-03T12:34:00')) // → '20260503-1234' (端末 TZ)
 */
export function formatLocalTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hour = pad2(date.getHours());
  const minute = pad2(date.getMinutes());
  return `${year}${month}${day}-${hour}${minute}`;
}

/**
 * AC9 NM3 ファイル名サニタイズ純関数。
 *
 * - 非 ASCII 文字を `_` に置換
 * - Forbidden chars (`/\:*?"<>|`) を `_` に置換
 * - 制御文字 (改行 / TAB 等) を `_` に置換
 * - 連続 `_` を 1 つに圧縮
 * - 端 `_` 除去
 */
export function sanitizeExportSegment(value: string): string {
  if (typeof value !== 'string' || value.length === 0) return '';
  // 非 ASCII を _ に
  let out = value.replace(/[^\x20-\x7E]/g, '_');
  // forbidden chars を _ に
  out = out.replace(FORBIDDEN_CHARS, '_');
  // 制御文字 (\x00-\x1F + \x7F) を _ に

  out = out.replace(/[\x00-\x1F\x7F]/g, '_');
  // 連続 _ を 1 つに圧縮
  out = out.replace(/_+/g, '_');
  // 前後 _ を除去
  out = out.replace(/^_+|_+$/g, '');
  return out;
}

/**
 * AC9 ファイル名を生成する純関数。
 *
 * @param params kind / ext / 端末ローカル Date
 * @returns `bonsailog-{kind}-{YYYYMMDD-HHMM}.{ext}` (ASCII safe + forbidden 除去済)
 *
 * @example
 *   buildExportFileName({
 *     kind: 'events-csv',
 *     ext: 'csv',
 *     date: new Date('2026-05-03T12:34:00')
 *   })
 *   // → 'bonsailog-events-csv-20260503-1234.csv'
 */
export function buildExportFileName(params: {
  kind: ExportKind;
  ext: ExportExt;
  date: Date;
}): string {
  const { kind, ext, date } = params;
  const timestamp = formatLocalTimestamp(date);
  const stem = `bonsailog-${kind}-${timestamp}`;
  const sanitized = sanitizeExportSegment(stem);
  // 空 stem 防御 (理論上発生しないが念のため)
  const safe = sanitized.length > 0 ? sanitized : 'bonsailog';
  return `${safe}.${ext}`;
}
