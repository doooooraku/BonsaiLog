/**
 * F-07 針金がけ記録改良 — 純関数 (Phase A、Issue #24 / ADR-0011)。
 *
 * 役割:
 * - 針金 event (`type='wiring'` + `status='logged'`) の装着期間 (日数) を算出
 * - ユーザー指定外し日時 (`payload.scheduled_unwire_at`) を取り出し
 * - 装着期間しきい値 (既定 6 週 = 42 日) からの状態種別を判定
 *
 * 設計方針:
 * - 推奨/命令文言を出さない (ADR-0011 「記録のみ」哲学)。「外しましょう」「作業してください」禁止。
 * - 事実のみ表示: 「装着期間 6 週経過しました」
 * - 純関数で IO なし、Jest で副作用なくテスト可能
 * - UI / scheduler 統合は Phase B (別 PR)
 */

import type { Event } from '@/src/db/schema';

/** 6 週 = 42 日 を既定の経過しきい値とする (ADR-0011 / Issue #24)。 */
export const DEFAULT_WIRING_OVERDUE_THRESHOLD_DAYS = 42;

/**
 * 針金 event の装着期間 (日数、UTC ベース) を算出する純関数。
 *
 * @param wiringEvent type='wiring' / status='logged' の event を想定 (呼出側でフィルタ済)
 * @param todayUtc 現在時刻 (Date オブジェクト、UI 層が `new Date(nowUtc())` で生成)
 *
 * @returns 装着開始 (occurred_at_utc) からの経過日数。
 *   - 負値は 0 にクランプ (occurred_at が未来を指す状況は理論上発生しないが防御)
 */
export function getDaysSinceWired(wiringEvent: Event, todayUtc: Date): number {
  const wiredAt = new Date(wiringEvent.occurredAtUtc).getTime();
  const now = todayUtc.getTime();
  const diffDays = Math.floor((now - wiredAt) / 86_400_000);
  return diffDays < 0 ? 0 : diffDays;
}

/** payload_json から `scheduled_unwire_at` を取り出す純関数 (parse 失敗は null)。 */
export function getScheduledUnwireAt(wiringEvent: Event): string | null {
  if (wiringEvent.payloadJson == null) return null;
  try {
    const payload = JSON.parse(wiringEvent.payloadJson) as Record<string, unknown>;
    const value = payload.scheduled_unwire_at;
    return typeof value === 'string' && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

/**
 * 装着期間 vs しきい値の状態種別。UI / 通知側でこの種別を見て i18n キーを選ぶ。
 *
 * - 'within': しきい値未満 (通常状態、通知不要)
 * - 'overdue': しきい値以上 (事実通知の対象)
 */
export type WiringDurationKind = 'within' | 'overdue';

export function classifyWiringDuration(
  daysSinceWired: number,
  thresholdDays: number = DEFAULT_WIRING_OVERDUE_THRESHOLD_DAYS,
): WiringDurationKind {
  return daysSinceWired >= thresholdDays ? 'overdue' : 'within';
}

/**
 * 経過日数を「週単位 (切り捨て)」に変換する純関数。
 *
 * UI 層 (盆栽詳細画面 → 針金 event 行) で「装着期間: X 週」表示に使う。
 * Phase B (Issue #24): ADR-0014 で F-07 装着期間経過通知を削除し、アプリ内事実表示に変更したため。
 *
 * @example getWeeksSinceWired(0) === 0
 * @example getWeeksSinceWired(6) === 0  // 1 週未満
 * @example getWeeksSinceWired(7) === 1
 * @example getWeeksSinceWired(42) === 6 // しきい値ちょうど
 */
export function getWeeksSinceWired(daysSinceWired: number): number {
  if (daysSinceWired < 0) return 0;
  return Math.floor(daysSinceWired / 7);
}
