import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import { getTzOffsetMin } from '@/src/core/datetime';
import { EVENT_TYPES, type Event, type EventType } from '@/src/db/schema';
import {
  groupContinuousEvents,
  type EventGroupEntry,
} from '@/src/features/event/groupContinuousEvents';

export type HistoryFilter = 'all' | EventType;

/**
 * 盆栽詳細「作業履歴タブ」の絞り込み + 連続日グルーピング ロジック (R6)。
 * Phase 4 A1-8 で `bonsai/[id]/index.tsx` から抽出 (挙動不変)。
 *
 * - フィルタ chip は 'all' + その盆栽に記録(logged)のある event type のみ動的生成。
 * - 選択中フィルタの種別が記録 0 件になったら 'all' に戻す (chip 消失で選択解除不能を防ぐ)。
 * - logged のみ + フィルタ + occurredAtUtc 降順 + 連続日グルーピング。
 *
 * `setHistoryFilter` / `setExpandedGroupIds` を返すのは、focusEventId 受領時に
 * index.tsx 側 effect が「フィルタ all + 対象 group 展開」を行うため (R6↔R7 coordinator)。
 */
export function useHistoryGroups({ events }: { events: Event[] }): {
  historyFilter: HistoryFilter;
  setHistoryFilter: Dispatch<SetStateAction<HistoryFilter>>;
  expandedGroupIds: Set<string>;
  setExpandedGroupIds: Dispatch<SetStateAction<Set<string>>>;
  toggleGroupExpand: (key: string) => void;
  presentEventTypes: EventType[];
  historyGroups: EventGroupEntry[];
} {
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  // 連続日まとめの展開状態 (group の events[0].id を key にして個別開閉)
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const toggleGroupExpand = useCallback((key: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Sess42 バグ3: この盆栽に記録 (logged) のある event type を EVENT_TYPES のカノニカル順で抽出。
  const presentEventTypes = useMemo<EventType[]>(() => {
    const set = new Set<EventType>();
    for (const ev of events) {
      if (ev.status === 'logged') set.add(ev.type as EventType);
    }
    return EVENT_TYPES.filter((ty) => set.has(ty));
  }, [events]);

  // 選択中フィルタの種別が記録 0 件になった場合 (削除等) は 'all' に戻す。
  useEffect(() => {
    if (historyFilter !== 'all' && !presentEventTypes.includes(historyFilter)) {
      setHistoryFilter('all');
    }
  }, [historyFilter, presentEventTypes]);

  // logged event のみ + フィルタ適用 + occurredAtUtc 降順 + 連続日グルーピング。
  const historyGroups = useMemo<EventGroupEntry[]>(() => {
    const filtered = events.filter((ev) => {
      if (ev.status !== 'logged') return false;
      if (historyFilter === 'all') return true;
      return ev.type === historyFilter;
    });
    // 既存 events は updated_at 順なので occurredAtUtc 降順に並び替える。
    const sorted = [...filtered].sort((a, b) => b.occurredAtUtc.localeCompare(a.occurredAtUtc));
    return groupContinuousEvents(sorted, getTzOffsetMin());
  }, [events, historyFilter]);

  return {
    historyFilter,
    setHistoryFilter,
    expandedGroupIds,
    setExpandedGroupIds,
    toggleGroupExpand,
    presentEventTypes,
    historyGroups,
  };
}
