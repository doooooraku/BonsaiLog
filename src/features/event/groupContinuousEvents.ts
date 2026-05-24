/**
 * 作業履歴の連続日グルーピング (Issue #440 Phase 1)。
 *
 * mockup `bonsai-detail-history-01/02/03.png` 整合:
 * - 「水やり ×3  4月20日 ～ 4月22日  3回まとめて表示 個別に開く ▼」のような表示を可能にする
 * - 同一 type の event が連続するカレンダー日 (today / today-1) に並んでいたら 1 グループに集約
 * - 他の type は単独行のまま
 *
 * 純関数: events は **occurredAtUtc 降順** で渡される前提 (新しい順 → 古い順)。
 */
import { type Event, type EventType } from '@/src/db/schema';
import { toLocalDateKey } from '@/src/features/watering/dateUtils';

export type EventGroupEntry =
  | {
      kind: 'single';
      event: Event;
    }
  | {
      kind: 'group';
      type: EventType;
      events: Event[];
      /** 集約の最古日 (YYYY-MM-DD)。表示 "4月20日 ～ 4月22日" の左側。 */
      startDate: string;
      /** 集約の最新日 (YYYY-MM-DD)。表示 "4月20日 ～ 4月22日" の右側。 */
      endDate: string;
    };

/**
 * YYYY-MM-DD の日付文字列を 1 日前にする。
 * 例: '2026-05-11' → '2026-05-10'、'2026-05-01' → '2026-04-30'。
 *
 * Date オブジェクトを経由するが TZ は使わず純粋に YMD 文字列としての計算。
 */
export function prevDay(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  // UTC で計算して TZ ノイズを排除 (出力も UTC 基準の YYYY-MM-DD)
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/**
 * 連続日 grouping。
 *
 * グループ化条件: 同 type かつ「今 walk 中の最古日 (currentOldestDay) の前日 or 同日」 で
 * 隣接している。`logged` event のみが対象、`planned` は呼び出し側で除外する想定。
 *
 * 単独 (連続 1 件) は `{ kind: 'single', event }` で返す。
 * 連続 2 件以上は `{ kind: 'group', type, events, startDate, endDate }` で返す。
 */
export function groupContinuousEvents(events: Event[], tzOffsetMin: number): EventGroupEntry[] {
  const result: EventGroupEntry[] = [];
  let i = 0;
  while (i < events.length) {
    const head = events[i];
    let lastDay = toLocalDateKey(head.occurredAtUtc as string, tzOffsetMin);
    let j = i;
    while (j + 1 < events.length) {
      const next = events[j + 1];
      if (next.type !== head.type) break;
      const nextDay = toLocalDateKey(next.occurredAtUtc as string, tzOffsetMin);
      // events は降順なので next は lastDay 以前。
      // 連続判定: 同日 (複数記録) or lastDay の前日。
      if (nextDay !== lastDay && nextDay !== prevDay(lastDay)) break;
      lastDay = nextDay;
      j++;
    }
    if (j > i) {
      // 降順なので i (新) → j (古)。startDate = 最古、endDate = 最新。
      result.push({
        kind: 'group',
        type: head.type as EventType,
        events: events.slice(i, j + 1),
        startDate: toLocalDateKey(events[j].occurredAtUtc as string, tzOffsetMin),
        endDate: toLocalDateKey(events[i].occurredAtUtc as string, tzOffsetMin),
      });
    } else {
      result.push({ kind: 'single', event: head });
    }
    i = j + 1;
  }
  return result;
}

/**
 * 昇順 (occurredAtUtc 古い → 新しい) 入力版。予定タブで未来へ向かって表示する timeline
 * (Issue #441 Phase 1) のために用意。内部で desc 反転 → group → 結果反転で実現。
 * group 内 events も最終的に asc に揃える。
 */
export function groupContinuousEventsAsc(events: Event[], tzOffsetMin: number): EventGroupEntry[] {
  const desc = [...events].reverse();
  const descGroups = groupContinuousEvents(desc, tzOffsetMin);
  // groups 自体を反転 + 各 group の events 配列も asc に反転。
  return descGroups
    .slice()
    .reverse()
    .map((g) => (g.kind === 'group' ? { ...g, events: [...g.events].reverse() } : g));
}

/**
 * 指定 eventId が連続日まとめ group 内に含まれる場合、その group の展開 key (events[0].id) を返す。
 * 単独 (kind 'single') or 見つからない場合は null。
 *
 * 改善① (検索結果タップ → 該当作業へジャンプ): 対象が畳まれた group 内にいるとき、先に
 * その group を展開してからスクロールする必要があるため、展開対象の key を算出する純関数。
 */
export function findGroupKeyForEvent(groups: EventGroupEntry[], eventId: string): string | null {
  for (const g of groups) {
    if (g.kind === 'group' && g.events.some((e) => e.id === eventId)) {
      return g.events[0].id;
    }
  }
  return null;
}
