/**
 * 水やり繰り返し通知 — 純関数 (Issue #30 / ADR-0014)。
 *
 * Related:
 * - ADR-0014 §通知の 2 系統 / §水やり通知の最大数 (5 件、H3)
 * - functional_spec §21.3.3 (DAILY trigger 1〜5 件管理)
 *
 * 設計方針:
 * - expo-notifications API に依存しない (副作用ゼロ、テスト容易)
 * - 「時刻 (hour/minute)」入力 → DAILY トリガー仕様 + identifier を計算
 * - identifier prefix `daily_watering_` を `scheduler.ts` 側でも使用 (キャンセル時の prefix マッチ)
 * - 重複時刻は重複除去、5 件超過は先頭 5 件のみ採用 (H3)
 *
 * 仕様:
 * - WATERING_NOTIFICATION_LIMIT = 5 (ADR-0014 §H3)
 * - WATERING_IDENTIFIER_PREFIX = 'daily_watering_'
 * - "HH:MM" 文字列 ↔ {hour, minute} 双方向変換
 */

/** 水やり通知の最大数 (ADR-0014 §H3、UI 5 行表示限界、朝/昼/夕/夜 + 予備で実用上十分)。 */
export const WATERING_NOTIFICATION_LIMIT = 5;

/** 水やり通知識別子の prefix (scheduler.ts のキャンセル prefix マッチでも使用)。 */
export const WATERING_IDENTIFIER_PREFIX = 'daily_watering_';

export type WateringTime = {
  hour: number; // 0-23
  minute: number; // 0-59
};

/** scheduler 層が `Notifications.scheduleNotificationAsync` に渡す DAILY trigger 仕様。 */
export type WateringScheduleSpec = {
  identifier: string;
  hour: number;
  minute: number;
};

// ---------------------------------------------------------------------------
// 検証
// ---------------------------------------------------------------------------

/**
 * "HH:MM" 形式の文字列を {hour, minute} に変換する。形式不正なら null。
 *
 * @example
 *   parseTimeString('07:30') // { hour: 7, minute: 30 }
 *   parseTimeString('25:00') // null
 *   parseTimeString('7:5')   // null (HH:MM 0 padding 必須)
 */
export function parseTimeString(value: string): WateringTime | null {
  if (typeof value !== 'string') return null;
  const m = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const hour = Number.parseInt(m[1], 10);
  const minute = Number.parseInt(m[2], 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23) return null;
  if (minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/** {hour, minute} を "HH:MM" の 0 padding 文字列に変換する。 */
export function formatTimeString(time: WateringTime): string {
  const hh = String(time.hour).padStart(2, '0');
  const mm = String(time.minute).padStart(2, '0');
  return `${hh}:${mm}`;
}

// ---------------------------------------------------------------------------
// 識別子
// ---------------------------------------------------------------------------

/** {hour, minute} から `daily_watering_HH_MM` 形式の識別子を生成する。 */
export function buildWateringIdentifier(time: WateringTime): string {
  const hh = String(time.hour).padStart(2, '0');
  const mm = String(time.minute).padStart(2, '0');
  return `${WATERING_IDENTIFIER_PREFIX}${hh}_${mm}`;
}

// ---------------------------------------------------------------------------
// 仕様生成 (純関数)
// ---------------------------------------------------------------------------

/**
 * 入力時刻リストから DAILY trigger 仕様リストを生成する。
 *
 * - 重複時刻は最初に出現したものを残し以降を除去 (identifier ユニーク性確保)
 * - WATERING_NOTIFICATION_LIMIT (5) 件を超える分は切り捨て (H3)
 * - 0-23 時 / 0-59 分の範囲外は除外
 *
 * @param times - ユーザー指定の時刻リスト (Settings から取得)
 * @returns scheduler 層が予約するべき DAILY 仕様
 */
export function buildWateringSchedules(times: readonly WateringTime[]): WateringScheduleSpec[] {
  const seen = new Set<string>();
  const result: WateringScheduleSpec[] = [];
  for (const time of times) {
    if (!Number.isFinite(time.hour) || !Number.isFinite(time.minute)) continue;
    if (time.hour < 0 || time.hour > 23) continue;
    if (time.minute < 0 || time.minute > 59) continue;
    const identifier = buildWateringIdentifier(time);
    if (seen.has(identifier)) continue;
    seen.add(identifier);
    result.push({ identifier, hour: time.hour, minute: time.minute });
    if (result.length >= WATERING_NOTIFICATION_LIMIT) break;
  }
  return result;
}
