/**
 * カレンダー dot 集計純関数 (Sess22 ADR-0034 D2)。
 *
 * 「複数盆栽でも 1 作業なら dot 1 個」 (user 真意、 作業の有無 = unique by type) を構造実現。
 * 旧 logic は events.length ベース (盆栽 × 作業件数)、 新 logic は EventType の Set。
 *
 * 使用箇所:
 * - `app/(tabs)/plan/index.tsx` の `dotsByDay` useMemo
 *
 * 例:
 * - 同日 watering ×3 (異なる bonsai) → loggedTypes = Set(['watering']) で size 1
 * - 同日 mixed (watering + fertilizing) → loggedTypes.size = 2
 * - 4 種別 logged → size 4、 render 3 + 「+」 (`totalUniqueCount > 3`)
 *
 * 件数情報損失への対処は PR-2-2 で listing 「×N 鉢」 補完 (D7)。
 */
import { type Event, type EventType } from '@/src/db/schema';
import { toLocalDateKey } from '@/src/features/watering/wateringHeatmap';

export type DotsByDayEntry = {
  plannedTypes: Set<EventType>;
  loggedTypes: Set<EventType>;
};

export type DotsByDay = Map<string, DotsByDayEntry>;

export function computeDotsByDay(events: Event[], tzOffsetMin: number): DotsByDay {
  const map: DotsByDay = new Map();
  for (const e of events) {
    const key = toLocalDateKey(e.occurredAtUtc, tzOffsetMin);
    let cur = map.get(key);
    if (!cur) {
      cur = { plannedTypes: new Set<EventType>(), loggedTypes: new Set<EventType>() };
      map.set(key, cur);
    }
    if (e.status === 'planned') cur.plannedTypes.add(e.type as EventType);
    else if (e.status === 'logged') cur.loggedTypes.add(e.type as EventType);
  }
  return map;
}
