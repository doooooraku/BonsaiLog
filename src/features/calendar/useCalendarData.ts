/**
 * カレンダータブ画面のデータ + 日付選択ロジック (Phase 4 B1 で CalendarTabScreen god から抽出)。
 *
 * 責務:
 * - 今日/明日/初期選択日の算出 (ADR-0008 §TZ nowUtc 経由、 ADR-0035 D2 予定=明日 default)
 * - URL param (?selectedDateKey / ?source=tab) 追従 + pickerStore 同期
 * - year/month/selectedDateKey state
 * - events / bonsai の読み込み (useFocusEffect で focus 毎 reload)
 * - 派生 memo: dotsByDay / selectedDayEvents / bonsaiMap / planned・logged グループ / FAB 無効判定
 *
 * 振る舞いは CalendarTabScreen の元実装と完全同一 (純粋な抽出)。
 */
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { getTzOffsetMin, nowUtc } from '@/src/core/datetime';
import { getAllActiveBonsai } from '@/src/db/bonsaiRepository';
import { getAllActivePlannedAndLoggedEvents } from '@/src/db/eventRepository';
import { EVENT_TYPES, type Bonsai, type Event, type EventType } from '@/src/db/schema';
import { computeDotsByDay } from '@/src/features/plan/dotsByDay';
import { toLocalDateKey } from '@/src/features/watering/dateUtils';
import { usePickerStore } from '@/src/stores/pickerStore';

import type { CalendarTabMode } from './calendarTabTypes';

type GroupedEvents = readonly (readonly [EventType, readonly Event[]])[];

function groupByTypeWithStatus(
  selectedDayEvents: readonly Event[],
  status: 'planned' | 'logged',
): GroupedEvents {
  const groups = new Map<EventType, Event[]>();
  for (const e of selectedDayEvents) {
    if (e.status !== status) continue;
    const t = e.type as EventType;
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t)!.push(e);
  }
  return Array.from(groups.entries()).sort((a, b) => {
    const oa = EVENT_TYPES.indexOf(a[0]);
    const ob = EVENT_TYPES.indexOf(b[0]);
    return (oa === -1 ? 999 : oa) - (ob === -1 ? 999 : ob);
  });
}

export type UseCalendarData = {
  year: number;
  month: number;
  setYear: (y: number) => void;
  setMonth: (m: number) => void;
  selectedDateKey: string;
  setSelectedDateKey: (dateKey: string) => void;
  todayLocalKey: string;
  tzOffsetMin: number;
  events: Event[];
  bonsai: Bonsai[];
  bonsaiMap: Map<string, Bonsai>;
  reload: () => Promise<void>;
  dotsByDay: ReturnType<typeof computeDotsByDay>;
  selectedDayEvents: Event[];
  plannedGroupedEvents: GroupedEvents;
  loggedGroupedEvents: GroupedEvents;
  isFabDisabled: boolean;
};

export function useCalendarData(mode: CalendarTabMode): UseCalendarData {
  // ADR-0008 §TZ 3 層防御: new Date() 引数なし禁止、 nowUtc() 経由。
  const today = new Date(nowUtc() as string);
  const todayLocalKey = toLocalDateKey(today.toISOString(), getTzOffsetMin());

  // ADR-0035 D2 (Sess23 PR-2-1): 予定タブ tap = 明日 default
  const tomorrowLocalKey = useMemo(() => {
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    return toLocalDateKey(tomorrow.toISOString(), getTzOffsetMin());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // URL param: ?selectedDateKey + ?source (plan のみ source=tab 受信)
  const params = useLocalSearchParams<{ selectedDateKey?: string; source?: string }>();
  const urlDateKey = params.selectedDateKey ?? null;
  const sourceIsTab = params.source === 'tab';

  const storedDateKey = usePickerStore.getState().planSelectedDateKey;
  // mode 切替: plan は (source=tab + URL なし) で tomorrow、 record は常に urlDateKey > stored > today
  const initialDateKey = (() => {
    if (urlDateKey) return urlDateKey;
    if (mode === 'plan' && sourceIsTab) return tomorrowLocalKey;
    return storedDateKey ?? todayLocalKey;
  })();
  const initialYear = Number(initialDateKey.slice(0, 4));
  const initialMonth = Number(initialDateKey.slice(5, 7)) - 1;

  const [year, setYear] = useState<number>(initialYear);
  const [month, setMonth] = useState<number>(initialMonth);
  const [selectedDateKey, setSelectedDateKeyState] = useState<string>(initialDateKey);
  const [events, setEvents] = useState<Event[]>([]);
  const [bonsai, setBonsai] = useState<Bonsai[]>([]);

  const setSelectedDateKey = useCallback((dateKey: string) => {
    setSelectedDateKeyState(dateKey);
    usePickerStore.getState().setPlanSelectedDateKey(dateKey);
  }, []);

  // URL param 変化時の追従 (mode = plan は source=tab かつ urlDateKey 不在 → tomorrow)
  // Sess108 PR-E (React Compiler 整合): URL param (= 外部システムとの sync) → 内部 state の追従は
  // useEffect の正規用途 (React 公式 "Synchronizing with External Systems")。 ここは複数 setState を
  // 連動して切り替える必要があるため、 react-hooks/set-state-in-effect は block disable で意図明示。
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- URL param 同期 (外部システム連携) */
    if (urlDateKey) {
      setSelectedDateKey(urlDateKey);
      setYear(Number(urlDateKey.slice(0, 4)));
      setMonth(Number(urlDateKey.slice(5, 7)) - 1);
    } else if (mode === 'plan' && sourceIsTab) {
      setSelectedDateKey(tomorrowLocalKey);
      setYear(Number(tomorrowLocalKey.slice(0, 4)));
      setMonth(Number(tomorrowLocalKey.slice(5, 7)) - 1);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [urlDateKey, sourceIsTab, tomorrowLocalKey, setSelectedDateKey, mode]);

  const reload = useCallback(async () => {
    const [evs, bs] = await Promise.all([
      getAllActivePlannedAndLoggedEvents(),
      getAllActiveBonsai(),
    ]);
    setEvents(evs);
    setBonsai(bs);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const tzOffsetMin = getTzOffsetMin();
  const dotsByDay = useMemo(() => computeDotsByDay(events, tzOffsetMin), [events, tzOffsetMin]);

  const selectedDayEvents = useMemo(
    () => events.filter((e) => toLocalDateKey(e.occurredAtUtc, tzOffsetMin) === selectedDateKey),
    [events, selectedDateKey, tzOffsetMin],
  );

  const bonsaiMap = useMemo(() => new Map(bonsai.map((b) => [b.id, b])), [bonsai]);

  // FAB disabled: plan のみ過去日で disabled、 record は過去日も有効
  const isSelectedPastDate = useMemo(
    () => selectedDateKey < todayLocalKey,
    [selectedDateKey, todayLocalKey],
  );
  const isFabDisabled = mode === 'plan' && isSelectedPastDate;

  const plannedGroupedEvents = useMemo<GroupedEvents>(
    () => groupByTypeWithStatus(selectedDayEvents, 'planned'),
    [selectedDayEvents],
  );

  const loggedGroupedEvents = useMemo<GroupedEvents>(
    () => groupByTypeWithStatus(selectedDayEvents, 'logged'),
    [selectedDayEvents],
  );

  return {
    year,
    month,
    setYear,
    setMonth,
    selectedDateKey,
    setSelectedDateKey,
    todayLocalKey,
    tzOffsetMin,
    events,
    bonsai,
    bonsaiMap,
    reload,
    dotsByDay,
    selectedDayEvents,
    plannedGroupedEvents,
    loggedGroupedEvents,
    isFabDisabled,
  };
}
