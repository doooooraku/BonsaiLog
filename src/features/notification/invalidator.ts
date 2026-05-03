/**
 * F-16 ローカル通知 — F-02 連携 invalidator 純関数 (Phase D、Issue #30 / ADR-0014)。
 *
 * AC8 (F-02 連携 + invalidator):
 * - AC8-1 F-02 で予定登録 → 該当日の当日まとめ通知に自動加算
 * - AC8-2 F-02 で予定削除 → invalidator 経由で該当日の通知再生成 (0 件ならキャンセル)
 * - AC8-3 盆栽削除 → 関連 planned events 削除 → 通知再生成
 * - AC8-4 F-07「外す予定日時」入力時に F-02 status='planned' 自動登録
 *
 * 副作用なし純関数:
 * - shouldRescheduleSummary(oldEvents, newEvents) - 通知再生成が必要かを判定
 * - extractAffectedDateKeys(oldEvents, newEvents) - 影響を受けた日付キー集合
 * - filterUpcomingPlanned(events, now) - 「今後 7 日以内」の planned events を抽出
 *
 * scheduler.ts の `rescheduleSummaryNotifications()` 呼出可否を判定するための前段ロジック。
 * 実際の Notifications API 呼出は呼出側 (scheduler) の責務。
 */

import { toLocalDateKey } from '@/src/features/watering/wateringHeatmap';

import type { PlannedEventLike } from './dailySummary';

/** 7 日ローリング (AC3-1 当日 + 6 日先) の対象日数。 */
export const RESCHEDULE_WINDOW_DAYS = 7;

/**
 * 2 つの planned events 集合から「影響を受けた日付キー集合」を返す純関数。
 *
 * - 追加されたイベント → その日付
 * - 削除されたイベント → その日付
 * - tzOffset / occurredAtUtc いずれかが変更 → 旧日付 + 新日付 両方
 *
 * 同じ id の event が両方にあれば「変更」、片方にしかなければ「追加 or 削除」。
 *
 * @param oldEvents 旧 planned events (id をキーとしてマッチ)
 * @param newEvents 新 planned events
 */
export function extractAffectedDateKeys(
  oldEvents: readonly (PlannedEventLike & { id: string })[],
  newEvents: readonly (PlannedEventLike & { id: string })[],
): Set<string> {
  const result = new Set<string>();
  const oldMap = new Map(oldEvents.map((e) => [e.id, e]));
  const newMap = new Map(newEvents.map((e) => [e.id, e]));

  // 追加 + 変更 (新側基準)
  for (const [id, neu] of newMap) {
    const old = oldMap.get(id);
    if (old == null) {
      // 追加
      result.add(toLocalDateKey(neu.occurredAtUtc, neu.tzOffsetMin));
    } else if (old.occurredAtUtc !== neu.occurredAtUtc || old.tzOffsetMin !== neu.tzOffsetMin) {
      // 変更: 両日付
      result.add(toLocalDateKey(old.occurredAtUtc, old.tzOffsetMin));
      result.add(toLocalDateKey(neu.occurredAtUtc, neu.tzOffsetMin));
    }
  }

  // 削除 (旧にあって新にない)
  for (const [id, old] of oldMap) {
    if (!newMap.has(id)) {
      result.add(toLocalDateKey(old.occurredAtUtc, old.tzOffsetMin));
    }
  }

  return result;
}

/**
 * 通知再スケジュールが必要かを判定する純関数。
 *
 * - 影響日付集合が空 (= 何も変更なし) → false
 * - 1 件以上影響あり → true
 *
 * scheduler 側で本関数の戻り値が true のときのみ rescheduleSummaryNotifications を呼ぶ。
 */
export function shouldRescheduleSummary(
  oldEvents: readonly (PlannedEventLike & { id: string })[],
  newEvents: readonly (PlannedEventLike & { id: string })[],
): boolean {
  const affected = extractAffectedDateKeys(oldEvents, newEvents);
  return affected.size > 0;
}

/**
 * 「今後 7 日以内 (当日 + 6 日先)」の planned events を抽出する純関数。
 *
 * AC3-1 (7 日ローリング予約) の入力ソース。scheduler 側で本関数で絞ってから
 * `buildSummarySchedules` に渡す想定。
 *
 * @param events 全 planned events
 * @param now 現在時刻 (Date オブジェクト、UI 層が `new Date(nowUtc())` で生成)
 * @param tzOffsetMin ユーザーローカルの UTC オフセット (分単位)
 */
export function filterUpcomingPlanned<T extends PlannedEventLike>(
  events: readonly T[],
  now: Date,
  tzOffsetMin: number,
): T[] {
  const todayKey = toLocalDateKey(now.toISOString(), tzOffsetMin);
  const todayMs = Date.UTC(
    Number(todayKey.slice(0, 4)),
    Number(todayKey.slice(5, 7)) - 1,
    Number(todayKey.slice(8, 10)),
  );
  const horizonMs = todayMs + (RESCHEDULE_WINDOW_DAYS - 1) * 86_400_000;

  return events.filter((event) => {
    const eventKey = toLocalDateKey(event.occurredAtUtc, event.tzOffsetMin);
    const eventMs = Date.UTC(
      Number(eventKey.slice(0, 4)),
      Number(eventKey.slice(5, 7)) - 1,
      Number(eventKey.slice(8, 10)),
    );
    return eventMs >= todayMs && eventMs <= horizonMs;
  });
}
