/**
 * F-04 水やり履歴の可視化 — ヒートマップ専用 純関数 (Issue #29 / ADR-0013)。
 *
 * Phase A の cross-feature shared util (toLocalDateKey 他) は `dateUtils.ts` に分離済
 * (PR-A、ADR-0039 (F-04 ヒートマップ撤廃) 前段の安全 refactor)。本ファイルは PR-B で完全削除予定。
 *
 * 後方互換のため shared util を re-export しているが、新規 import は `dateUtils.ts` から
 * 直接行うこと。
 */

import type { Event } from '@/src/db/schema';

import { toLocalDateKey } from './dateUtils';

// PR-B 完全削除までの後方互換用 re-export。
// 新規 import は `@/src/features/watering/dateUtils` から行う。
export {
  classifyLastWatered,
  diffDayKeys,
  getDaysSinceLastWatering,
  getLastWatering,
  toLocalDateKey,
  type LastWateredKind,
} from './dateUtils';

/**
 * Phase B: events 配列から「日別水やり回数 (count)」マップを返す純関数。
 *
 * - kind='watering' / status='logged' / deletedAt=null のみカウント。
 * - 同日に複数回水やった場合はカウント加算 (= count >= 2)。
 * - キーは toLocalDateKey で算出した YYYY-MM-DD (ユーザー TZ ベース)。
 */
export function getDailyWateringCounts(
  events: readonly Event[],
  tzOffsetMin: number,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.type !== 'watering') continue;
    if (event.status !== 'logged') continue;
    if (event.deletedAt != null) continue;
    const key = toLocalDateKey(event.occurredAtUtc, tzOffsetMin);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Phase B: 配色レベル (L0-L3) を返す純関数 (ColorBrewer Greens 4-class、color-blind safe)。
 *
 * - 0 → 'L0' (空) / 1 → 'L1' / 2 → 'L2' / 3+ → 'L3'
 * 配色値の RGB マッピングは WateringHeatmap.tsx 側で行う。
 */
export type WateringHeatmapLevel = 'L0' | 'L1' | 'L2' | 'L3';

export function getHeatmapLevel(count: number): WateringHeatmapLevel {
  if (count <= 0) return 'L0';
  if (count === 1) return 'L1';
  if (count === 2) return 'L2';
  return 'L3';
}

/**
 * Phase B: today から 過去 N 日分の YYYY-MM-DD キー配列を返す (新しい順 = today が index 0)。
 */
export function buildHeatmapDateKeys(todayLocalKey: string, days: number): string[] {
  const keys: string[] = [];
  const todayUtc = Date.UTC(
    Number(todayLocalKey.slice(0, 4)),
    Number(todayLocalKey.slice(5, 7)) - 1,
    Number(todayLocalKey.slice(8, 10)),
  );
  for (let i = 0; i < days; i++) {
    const ms = todayUtc - i * 86_400_000;
    const d = new Date(ms);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

/**
 * Phase D-1 (AC7): events からヒートマップサマリーを算出する純関数。
 *
 * @param events 対象 events 配列 (取得側で bonsaiId / 期間フィルタ済を想定)
 * @param tzOffsetMin ユーザーローカルの UTC オフセット (分単位)
 * @param windowDays 集計対象日数 (例: 365 なら直近 1 年)、optional
 * @param todayLocalKey windowDays 指定時の起点 (YYYY-MM-DD)、optional
 *
 * @returns
 *   - recordedDays: 水やり記録があった日数 (1 日複数記録は 1 日カウント)
 *   - totalEvents: 水やり記録の総件数 (1 日複数記録は加算)
 *
 * windowDays 指定時は [todayLocalKey - (windowDays-1) ..= todayLocalKey] の範囲で集計、
 * 未指定時は全 events を対象。
 */
export type HeatmapSummary = {
  recordedDays: number;
  totalEvents: number;
};

export function buildHeatmapSummary(
  events: readonly Event[],
  tzOffsetMin: number,
  windowDays?: number,
  todayLocalKey?: string,
): HeatmapSummary {
  const days = new Set<string>();
  let total = 0;
  let windowStartKey: string | null = null;

  if (windowDays != null && todayLocalKey != null) {
    const startMs =
      Date.UTC(
        Number(todayLocalKey.slice(0, 4)),
        Number(todayLocalKey.slice(5, 7)) - 1,
        Number(todayLocalKey.slice(8, 10)),
      ) -
      (windowDays - 1) * 86_400_000;
    windowStartKey = new Date(startMs).toISOString().slice(0, 10);
  }

  for (const event of events) {
    if (event.type !== 'watering') continue;
    if (event.status !== 'logged') continue;
    if (event.deletedAt != null) continue;

    const key = toLocalDateKey(event.occurredAtUtc, tzOffsetMin);
    if (windowStartKey != null && todayLocalKey != null) {
      if (key < windowStartKey || key > todayLocalKey) continue;
    }

    days.add(key);
    total += 1;
  }

  return { recordedDays: days.size, totalEvents: total };
}

/**
 * Phase D-1 (AC5): 指定日 (YYYY-MM-DD) に該当する events を返す純関数 (BottomSheet 詳細用)。
 *
 * - kind フィルタなし (watering / fertilizing / wiring 全て対象)
 * - status='logged' / deletedAt=null のみ (planned events は別途扱い)
 * - occurredAtUtc 昇順 (古い時刻が先)
 *
 * @param events 対象 events 配列 (取得側で bonsaiId フィルタ済を想定)
 * @param dateKey 対象日 (YYYY-MM-DD ローカル日付)
 * @param tzOffsetMin ユーザーローカルの UTC オフセット (分単位)
 */
export function getEventsForDay(
  events: readonly Event[],
  dateKey: string,
  tzOffsetMin: number,
): Event[] {
  const matched: Event[] = [];
  for (const event of events) {
    if (event.status !== 'logged') continue;
    if (event.deletedAt != null) continue;
    const key = toLocalDateKey(event.occurredAtUtc, tzOffsetMin);
    if (key !== dateKey) continue;
    matched.push(event);
  }
  matched.sort((a, b) => (a.occurredAtUtc < b.occurredAtUtc ? -1 : 1));
  return matched;
}

/**
 * ADR-0020 Phase 3: SS 222921 整合の水やり履歴サマリー (個別盆栽)。
 *
 * 戻り値:
 * - currentStreakDays: 「連続記録」(直近 N 日連続で水やり記録がある日数、今日が水やり済の場合のみカウント)
 * - daysWithMultipleRecords: 「2回の日」(window 内で 1 日に 2 回以上水やり記録がある日数)
 * - recordedDays / totalEvents: window 内の記録日数と総回数
 *
 * @param events 個別盆栽の events 配列 (bonsaiId フィルタ済を想定)
 * @param tzOffsetMin ユーザーローカルの UTC オフセット (分単位)
 * @param windowDays 集計期間 (例: 30 / 90 / 365)
 * @param todayLocalKey 今日のローカル日付キー (YYYY-MM-DD)
 */
export type IndividualHeatmapSummary = {
  currentStreakDays: number;
  daysWithMultipleRecords: number;
  recordedDays: number;
  totalEvents: number;
};

export function buildIndividualSummary(
  events: readonly Event[],
  tzOffsetMin: number,
  windowDays: number,
  todayLocalKey: string,
): IndividualHeatmapSummary {
  const counts = new Map<string, number>();
  let total = 0;
  const startMs =
    Date.UTC(
      Number(todayLocalKey.slice(0, 4)),
      Number(todayLocalKey.slice(5, 7)) - 1,
      Number(todayLocalKey.slice(8, 10)),
    ) -
    (windowDays - 1) * 86_400_000;
  const windowStartKey = new Date(startMs).toISOString().slice(0, 10);

  for (const event of events) {
    if (event.type !== 'watering') continue;
    if (event.status !== 'logged') continue;
    if (event.deletedAt != null) continue;
    const key = toLocalDateKey(event.occurredAtUtc, tzOffsetMin);
    if (key < windowStartKey || key > todayLocalKey) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    total += 1;
  }

  const recordedDays = counts.size;
  let daysWithMultipleRecords = 0;
  for (const c of counts.values()) {
    if (c >= 2) daysWithMultipleRecords += 1;
  }

  // currentStreakDays: 今日から遡って連続で記録がある日数
  let streak = 0;
  let cursorKey = todayLocalKey;
  while (counts.has(cursorKey)) {
    streak += 1;
    const cursorMs =
      Date.UTC(
        Number(cursorKey.slice(0, 4)),
        Number(cursorKey.slice(5, 7)) - 1,
        Number(cursorKey.slice(8, 10)),
      ) - 86_400_000;
    cursorKey = new Date(cursorMs).toISOString().slice(0, 10);
  }

  return {
    currentStreakDays: streak,
    daysWithMultipleRecords,
    recordedDays,
    totalEvents: total,
  };
}
