/**
 * 記録タブ画面 (Sess29 ADR-0038 D1、 RecordTabScreen 新規実装)。
 *
 * PlanScreen と同等の画面構造 (月カレンダー + 日付選択 + 予定/記録 listing) を採用、
 * 違いは 2 点のみ:
 *   1. **default 日付**: 今日 (PlanScreen は明日)
 *   2. **FAB action**: `useBulkActionFlow('log')` (PlanScreen は 'schedule') = 「作業を記録」 flow 起動
 *
 * 旧 stub 実装 (ADR-0025 §② 案 X、 Sess23 D6 で revert) は完全置換。
 * `app/(tabs)/_layout.tsx` の `handleRecordTabPress` (preventDefault + router.push) を撤去、
 * 通常の tab navigation でタブハイライト「記録」 に自然遷移。
 *
 * D7 動線 (予定→記録 atomic 変換): 本画面でも planned section の「作業を記録」 button 維持。
 * Future Work: PlanScreen との共通 component 抽出 refactor (重複コード解消、 本 PR スコープ外)。
 */
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DropletIcon, EventIcon, MoreVerticalIcon, PlusIcon } from '@/src/components/icons';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { RowActionMenu, type RowActionMenuItem } from '@/src/components/RowActionMenu';
import { useToastStore } from '@/src/components/Toast';
import { getTzOffsetMin } from '@/src/core/datetime';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BADGE_SOFT_BG,
  BADGE_SOFT_TEXT,
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  DANGER,
  ON_BRAND,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { getAllActiveBonsai } from '@/src/db/bonsaiRepository';
import { bulkSoftDeleteEvents, getAllActivePlannedAndLoggedEvents } from '@/src/db/eventRepository';
import { EVENT_TYPES, type Bonsai, type Event, type EventType } from '@/src/db/schema';
import { SearchHeader } from '@/src/features/bonsai/SearchHeader';
import { EventRow } from '@/src/features/event/EventRow';
import { useBulkActionFlow } from '@/src/features/event/useBulkActionFlow';
import { cancelForEvents } from '@/src/features/notification/cancelForEvent';
import { CalendarDot } from '@/src/features/plan/CalendarDot';
import { CalendarLegend } from '@/src/features/plan/CalendarLegend';
import { computeDotsByDay } from '@/src/features/plan/dotsByDay';
import { toLocalDateKey } from '@/src/features/watering/wateringHeatmap';
import { usePickerStore } from '@/src/stores/pickerStore';
import { useSettingsStore } from '@/src/stores/settingsStore';

function getMonthDays(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDow(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export default function RecordTabScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const tabBarHeight = useBottomTabBarHeight();
  // Sess29 ADR-0038 D1: 記録タブ FAB は 'log' mode で「作業を記録」 flow 起動 (PlanScreen は 'schedule')
  const { startBulkAction } = useBulkActionFlow('log');

  const today = new Date();
  const todayLocalKey = toLocalDateKey(today.toISOString(), getTzOffsetMin());

  // Sess29 ADR-0038 D1: 記録タブ default = 今日 (PlanScreen は明日)。
  // URL param `?selectedDateKey=YYYY-MM-DD` で記録/予定追加後の遷移先日付を受信 (ADR-0031 D1)。
  const params = useLocalSearchParams<{ selectedDateKey?: string }>();
  const urlDateKey = params.selectedDateKey ?? null;

  const storedDateKey = usePickerStore.getState().planSelectedDateKey;
  const initialDateKey = urlDateKey ?? storedDateKey ?? todayLocalKey;
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

  // URL param 変化時に該当日付を選択状態に (記録保存後の遷移時)
  useEffect(() => {
    if (urlDateKey) {
      setSelectedDateKey(urlDateKey);
      setYear(Number(urlDateKey.slice(0, 4)));
      setMonth(Number(urlDateKey.slice(5, 7)) - 1);
    }
  }, [urlDateKey, setSelectedDateKey]);

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

  const plannedGroupedEvents = useMemo<readonly (readonly [EventType, readonly Event[]])[]>(() => {
    const groups = new Map<EventType, Event[]>();
    for (const e of selectedDayEvents) {
      if (e.status !== 'planned') continue;
      const t = e.type as EventType;
      if (!groups.has(t)) groups.set(t, []);
      groups.get(t)!.push(e);
    }
    return Array.from(groups.entries()).sort((a, b) => {
      const oa = EVENT_TYPES.indexOf(a[0]);
      const ob = EVENT_TYPES.indexOf(b[0]);
      return (oa === -1 ? 999 : oa) - (ob === -1 ? 999 : ob);
    });
  }, [selectedDayEvents]);

  const loggedGroupedEvents = useMemo<readonly (readonly [EventType, readonly Event[]])[]>(() => {
    const groups = new Map<EventType, Event[]>();
    for (const e of selectedDayEvents) {
      if (e.status !== 'logged') continue;
      const t = e.type as EventType;
      if (!groups.has(t)) groups.set(t, []);
      groups.get(t)!.push(e);
    }
    return Array.from(groups.entries()).sort((a, b) => {
      const oa = EVENT_TYPES.indexOf(a[0]);
      const ob = EVENT_TYPES.indexOf(b[0]);
      return (oa === -1 ? 999 : oa) - (ob === -1 ? 999 : ob);
    });
  }, [selectedDayEvents]);

  const [expandedTypes, setExpandedTypes] = useState<Set<EventType>>(new Set());

  const calendarLegendCollapsed = useSettingsStore((s) => s.calendarLegendCollapsed);
  const setCalendarLegendCollapsed = useSettingsStore((s) => s.setCalendarLegendCollapsed);
  const toggleLegend = useCallback(() => {
    setCalendarLegendCollapsed(!calendarLegendCollapsed);
  }, [calendarLegendCollapsed, setCalendarLegendCollapsed]);

  const toggleExpand = useCallback((type: EventType) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  // 予定→記録 変換動線 (ADR-0035 D7、 PlanScreen と同等の実装、 D7 維持)
  const handleSingleConvert = useCallback(
    (ev: Event) => {
      const b = bonsaiMap.get(ev.bonsaiId);
      const bonsaiNameParam = encodeURIComponent(b?.name ?? '');
      router.push(
        `/work-log-confirm?bonsaiId=${ev.bonsaiId}&bonsaiName=${bonsaiNameParam}&type=${ev.type}&fromPlannedId=${ev.id}` as Href,
      );
    },
    [bonsaiMap, router],
  );

  const handleBulkConvert = useCallback(
    (type: EventType, groupEvents: readonly Event[]) => {
      const csvIds = groupEvents.map((e) => e.id).join(',');
      const selectedBonsais = groupEvents.map((e) => ({
        id: e.bonsaiId,
        name: bonsaiMap.get(e.bonsaiId)?.name ?? '',
      }));
      usePickerStore.getState().setBulkContext({ selectedBonsais });
      router.push(`/bulk-log-confirm?type=${type}&fromPlannedIds=${csvIds}` as Href);
    },
    [bonsaiMap, router],
  );

  type PendingDelete = {
    eventIds: readonly string[];
    titleKey:
      | 'planEventDeleteConfirmPlannedSingleTitle'
      | 'planEventDeleteConfirmLoggedSingleTitle'
      | 'planEventDeleteConfirmPlannedGroupTitle'
      | 'planEventDeleteConfirmLoggedGroupTitle';
    count: number;
    hasWiring: boolean;
    undoMessageKey: 'undoSnackbarPlannedDeleteN' | 'undoSnackbarLoggedDeleteN';
  };
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  type KebabMenu = {
    type: EventType;
    events: readonly Event[];
    status: 'planned' | 'logged';
  };
  const [kebabMenu, setKebabMenu] = useState<KebabMenu | null>(null);

  const triggerLongPressHaptic = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const showIndividualDeleteDialog = useCallback((ev: Event) => {
    setPendingDelete({
      eventIds: [ev.id],
      titleKey:
        ev.status === 'planned'
          ? 'planEventDeleteConfirmPlannedSingleTitle'
          : 'planEventDeleteConfirmLoggedSingleTitle',
      count: 1,
      hasWiring: ev.type === 'wiring',
      undoMessageKey:
        ev.status === 'planned' ? 'undoSnackbarPlannedDeleteN' : 'undoSnackbarLoggedDeleteN',
    });
  }, []);

  const confirmDeleteEvent = useCallback(
    (ev: Event) => {
      triggerLongPressHaptic();
      showIndividualDeleteDialog(ev);
    },
    [triggerLongPressHaptic, showIndividualDeleteDialog],
  );

  const confirmDeleteGroup = useCallback(
    (status: 'planned' | 'logged', type: EventType, groupEvents: readonly Event[]) => {
      triggerLongPressHaptic();
      const hasWiring = type === 'wiring' || groupEvents.some((e) => e.type === 'wiring');
      const isSingle = groupEvents.length === 1;
      setPendingDelete({
        eventIds: groupEvents.map((e) => e.id),
        titleKey: isSingle
          ? status === 'planned'
            ? 'planEventDeleteConfirmPlannedSingleTitle'
            : 'planEventDeleteConfirmLoggedSingleTitle'
          : status === 'planned'
            ? 'planEventDeleteConfirmPlannedGroupTitle'
            : 'planEventDeleteConfirmLoggedGroupTitle',
        count: groupEvents.length,
        hasWiring,
        undoMessageKey:
          status === 'planned' ? 'undoSnackbarPlannedDeleteN' : 'undoSnackbarLoggedDeleteN',
      });
    },
    [triggerLongPressHaptic],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const { eventIds, count, undoMessageKey } = pendingDelete;
    setPendingDelete(null);
    await bulkSoftDeleteEvents(eventIds);
    await cancelForEvents(eventIds, t);
    await reload();
    useToastStore.getState().show(t(undoMessageKey).replace('{count}', String(count)));
  }, [pendingDelete, t, reload]);

  const handleCancelDelete = useCallback(() => setPendingDelete(null), []);

  const handleKebabPress = useCallback(
    (status: 'planned' | 'logged', type: EventType, groupEvents: readonly Event[]) => {
      setKebabMenu({ type, events: groupEvents, status });
    },
    [],
  );
  const handleKebabDismiss = useCallback(() => setKebabMenu(null), []);

  const confirmDialogTitle = useMemo(() => {
    if (!pendingDelete) return '';
    const base = t(pendingDelete.titleKey).replace('{count}', String(pendingDelete.count));
    if (pendingDelete.hasWiring && pendingDelete.eventIds.length > 1) {
      return `${base} ${t('planEventDeleteConfirmWiringCascadeNote')}`;
    }
    return base;
  }, [pendingDelete, t]);

  const formatGroupCount = useCallback(
    (groupEvents: readonly Event[]): string => {
      const uniqueBonsaiCount = new Set(groupEvents.map((e) => e.bonsaiId)).size;
      if (groupEvents.length === uniqueBonsaiCount) return `×${groupEvents.length}`;
      return `×${groupEvents.length} (${t('planListingBonsaiCount').replace('{count}', String(uniqueBonsaiCount))})`;
    },
    [t],
  );

  const formatGroupAccessibility = useCallback(
    (groupLabel: string, groupEvents: readonly Event[], toggleText: string): string => {
      const uniqueBonsaiCount = new Set(groupEvents.map((e) => e.bonsaiId)).size;
      if (groupEvents.length === uniqueBonsaiCount) {
        return `${groupLabel} ×${groupEvents.length}, ${toggleText}`;
      }
      return `${groupLabel} ${groupEvents.length}件 ${uniqueBonsaiCount}鉢, ${toggleText}`;
    },
    [],
  );

  const daysInMonth = getMonthDays(year, month);
  const firstDow = getFirstDow(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = `${year}${t('planMonthYearSuffix')} ${month + 1}${t('planMonthSuffix')}`;

  const goPrevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else setMonth(month - 1);
  };
  const goNextMonth = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else setMonth(month + 1);
  };

  const dowLabels: readonly { label: string; color: string }[] = [
    { label: t('dowSun'), color: DANGER },
    { label: t('dowMon'), color: TEXT_MUTED },
    { label: t('dowTue'), color: TEXT_MUTED },
    { label: t('dowWed'), color: TEXT_MUTED },
    { label: t('dowThu'), color: TEXT_MUTED },
    { label: t('dowFri'), color: TEXT_MUTED },
    { label: t('dowSat'), color: BRAND_GREEN },
  ];

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_record_screen"
    >
      <SearchHeader title={t('tabRecord')} showSearch={false} testIdSuffix="record" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.monthRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('planPrevMonth')}
            onPress={goPrevMonth}
            style={styles.monthArrow}
            testID="e2e_record_prev_month"
          >
            <ThemedText style={styles.monthArrowText}>{'‹'}</ThemedText>
          </Pressable>
          <ThemedText style={[styles.monthLabel, { color: c.text }]}>{monthLabel}</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('planNextMonth')}
            onPress={goNextMonth}
            style={styles.monthArrow}
            testID="e2e_record_next_month"
          >
            <ThemedText style={styles.monthArrowText}>{'›'}</ThemedText>
          </Pressable>
        </View>

        <CalendarLegend collapsed={calendarLegendCollapsed} onToggle={toggleLegend} />

        <View style={styles.dowRow}>
          {dowLabels.map((d, i) => (
            <ThemedText key={i} style={[styles.dowText, { color: d.color }]}>
              {d.label}
            </ThemedText>
          ))}
        </View>

        <View style={styles.grid}>
          {Array.from({ length: Math.ceil(cells.length / 7) }).map((_, w) => (
            <View key={w} style={styles.weekRow}>
              {cells.slice(w * 7, w * 7 + 7).map((d, i) => {
                if (d == null) return <View key={i} style={styles.cell} />;
                const dateKey = `${year}-${pad(month + 1)}-${pad(d)}`;
                const dotData = dotsByDay.get(dateKey) ?? {
                  plannedTypes: new Set<EventType>(),
                  loggedTypes: new Set<EventType>(),
                };
                const loggedUniqueCount = dotData.loggedTypes.size;
                const plannedUniqueCount = dotData.plannedTypes.size;
                const totalUniqueCount = loggedUniqueCount + plannedUniqueCount;
                const isSel = dateKey === selectedDateKey;
                const isToday = dateKey === todayLocalKey;
                const renderedPlanned = Math.min(plannedUniqueCount, 3);
                const remainingSlots = Math.max(0, 3 - renderedPlanned);
                const renderedLogged = Math.min(loggedUniqueCount, remainingSlots);
                return (
                  <Pressable
                    key={i}
                    accessibilityRole="button"
                    accessibilityLabel={`${d}日, ${t('planLegendDotPlannedLabel').replace(' (○)', '')} ${renderedPlanned}件, ${t('planLegendDotRecordedLabel').replace(' (●)', '')} ${renderedLogged}件`}
                    style={[styles.cell, isSel && styles.cellSel]}
                    onPress={() => setSelectedDateKey(dateKey)}
                    testID={`e2e_record_cell_${dateKey}`}
                  >
                    <ThemedText
                      style={[
                        styles.cellText,
                        { color: isToday ? BRAND_GREEN : c.text },
                        isToday && styles.cellTextToday,
                      ]}
                    >
                      {d}
                    </ThemedText>
                    <View style={styles.dotRow}>
                      {Array.from({ length: renderedPlanned }).map((_, k) => (
                        <CalendarDot key={`planned-${k}`} status="planned" />
                      ))}
                      {Array.from({ length: renderedLogged }).map((_, k) => (
                        <CalendarDot key={`logged-${k}`} status="logged" />
                      ))}
                      {totalUniqueCount > 3 && <ThemedText style={styles.dotPlus}>+</ThemedText>}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.listSection}>
          <ThemedText style={styles.listLabel}>
            {selectedDateKey === todayLocalKey
              ? t('planSelectedListTodayLabel').replace('{count}', String(selectedDayEvents.length))
              : t('planSelectedListLabel')
                  .replace('{date}', selectedDateKey)
                  .replace('{count}', String(selectedDayEvents.length))}
          </ThemedText>
          {selectedDayEvents.length === 0 ? (
            <ThemedText style={styles.emptyText}>{t('planSelectedEmpty')}</ThemedText>
          ) : (
            <>
              {plannedGroupedEvents.length > 0 && (
                <>
                  <ThemedText style={styles.sectionHeader} testID="e2e_record_section_upcoming">
                    {t('planSectionScheduled')} (
                    {plannedGroupedEvents.reduce((sum, [, evs]) => sum + evs.length, 0)} 件)
                  </ThemedText>
                  {plannedGroupedEvents.map(([type, events]) => {
                    const isExpanded = expandedTypes.has(type);
                    const groupLabel = t(`eventType_${type}` as Parameters<typeof t>[0]);
                    const toggleText = isExpanded ? t('planGroupCollapse') : t('planGroupExpand');
                    const hasOverdue = events.some(
                      (e) => toLocalDateKey(e.occurredAtUtc, tzOffsetMin) < todayLocalKey,
                    );
                    return (
                      <View key={`planned-${type}`}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={formatGroupAccessibility(
                            groupLabel,
                            events,
                            toggleText,
                          )}
                          accessibilityState={{ expanded: isExpanded }}
                          style={[styles.groupRow, hasOverdue && styles.groupRowOverdue]}
                          onPress={() => toggleExpand(type)}
                          onLongPress={() => confirmDeleteGroup('planned', type, events)}
                          testID={`e2e_record_group_planned_${type}`}
                        >
                          <View style={styles.groupIconBox}>
                            {type === 'watering' ? (
                              <DropletIcon size={18} />
                            ) : (
                              <EventIcon type={type} size={18} />
                            )}
                          </View>
                          <ThemedText
                            style={[styles.groupLabel, hasOverdue && styles.groupLabelOverdue]}
                            numberOfLines={1}
                          >
                            {groupLabel}
                          </ThemedText>
                          <View style={styles.groupCountBadge}>
                            <ThemedText style={styles.groupCountBadgeText}>
                              {formatGroupCount(events)}
                            </ThemedText>
                          </View>
                          <View style={styles.groupSpacer} />
                          <ThemedText style={styles.groupToggleText}>
                            {toggleText} {isExpanded ? '▲' : '▼'}
                          </ThemedText>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('rowActionMenuDelete')}
                            style={styles.kebabButton}
                            hitSlop={8}
                            onPress={() => handleKebabPress('planned', type, events)}
                            testID={`e2e_record_group_kebab_planned_${type}`}
                          >
                            <MoreVerticalIcon size={20} color={TEXT_SECONDARY} />
                          </Pressable>
                        </Pressable>
                        {isExpanded && (
                          <View style={styles.expandedContainer}>
                            {events.map((e) => {
                              const b = bonsaiMap.get(e.bonsaiId);
                              const isOverdue =
                                toLocalDateKey(e.occurredAtUtc, tzOffsetMin) < todayLocalKey;
                              return (
                                <View
                                  key={e.id}
                                  style={isOverdue && styles.eventCardOverdue}
                                  testID={`e2e_record_event_${e.id}`}
                                >
                                  <EventRow
                                    ev={e}
                                    eventsForBonsai={events.filter(
                                      (x) => x.bonsaiId === e.bonsaiId,
                                    )}
                                    bonsaiName={b?.name}
                                    lang={lang}
                                    t={t}
                                    onPress={(ev) =>
                                      router.push(
                                        `/(tabs)/bonsai/${ev.bonsaiId}?tab=timeline` as Href,
                                      )
                                    }
                                    onLongPress={confirmDeleteEvent}
                                    onKebabPress={showIndividualDeleteDialog}
                                    kebabTestID={`e2e_record_event_kebab_${e.id}`}
                                    actionButtonLabel={t('planEventRecordButtonSingle')}
                                    onActionPress={handleSingleConvert}
                                    actionButtonTestID={`e2e_record_event_record_button_${e.id}`}
                                    showBonsaiName
                                    indent
                                  />
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </>
              )}
              {loggedGroupedEvents.length > 0 && (
                <>
                  <ThemedText style={styles.sectionHeader} testID="e2e_record_section_done">
                    {t('planSectionRecorded')} (
                    {loggedGroupedEvents.reduce((sum, [, evs]) => sum + evs.length, 0)} 件)
                  </ThemedText>
                  {loggedGroupedEvents.map(([type, events]) => {
                    const isExpanded = expandedTypes.has(type);
                    const groupLabel = t(`eventType_${type}` as Parameters<typeof t>[0]);
                    const toggleText = isExpanded ? t('planGroupCollapse') : t('planGroupExpand');
                    return (
                      <View key={`logged-${type}`}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={formatGroupAccessibility(
                            groupLabel,
                            events,
                            toggleText,
                          )}
                          accessibilityState={{ expanded: isExpanded }}
                          style={styles.groupRow}
                          onPress={() => toggleExpand(type)}
                          onLongPress={() => confirmDeleteGroup('logged', type, events)}
                          testID={`e2e_record_group_logged_${type}`}
                        >
                          <View style={styles.groupIconBox}>
                            {type === 'watering' ? (
                              <DropletIcon size={18} />
                            ) : (
                              <EventIcon type={type} size={18} />
                            )}
                          </View>
                          <ThemedText style={styles.groupLabel} numberOfLines={1}>
                            {groupLabel}
                          </ThemedText>
                          <View style={styles.groupCountBadge}>
                            <ThemedText style={styles.groupCountBadgeText}>
                              {formatGroupCount(events)}
                            </ThemedText>
                          </View>
                          <View style={styles.groupSpacer} />
                          <ThemedText style={styles.groupToggleText}>
                            {toggleText} {isExpanded ? '▲' : '▼'}
                          </ThemedText>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('rowActionMenuDelete')}
                            style={styles.kebabButton}
                            hitSlop={8}
                            onPress={() => handleKebabPress('logged', type, events)}
                            testID={`e2e_record_group_kebab_logged_${type}`}
                          >
                            <MoreVerticalIcon size={20} color={TEXT_SECONDARY} />
                          </Pressable>
                        </Pressable>
                        {isExpanded && (
                          <View style={styles.expandedContainer}>
                            {events.map((e) => {
                              const b = bonsaiMap.get(e.bonsaiId);
                              return (
                                <View key={e.id} testID={`e2e_record_event_${e.id}`}>
                                  <EventRow
                                    ev={e}
                                    eventsForBonsai={events.filter(
                                      (x) => x.bonsaiId === e.bonsaiId,
                                    )}
                                    bonsaiName={b?.name}
                                    lang={lang}
                                    t={t}
                                    onPress={(ev) =>
                                      router.push(
                                        `/(tabs)/bonsai/${ev.bonsaiId}?tab=history` as Href,
                                      )
                                    }
                                    onLongPress={confirmDeleteEvent}
                                    onKebabPress={showIndividualDeleteDialog}
                                    kebabTestID={`e2e_record_event_kebab_${e.id}`}
                                    showBonsaiName
                                    indent
                                  />
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Sess29 ADR-0038 D1: 記録タブ FAB は 'log' mode で「作業を記録」 flow 起動。
          過去日選択時も「過去日に記録を追加」 は意味があるため disabled にしない (予定追加とは違う)。 */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('recordFabLabel')}
        style={[styles.fab, { backgroundColor: c.tint, bottom: tabBarHeight + 16 }]}
        onPress={() =>
          startBulkAction(
            bonsai.map((b) => ({ id: b.id, name: b.name })),
            selectedDateKey,
          )
        }
        testID="e2e_record_fab_action"
      >
        <PlusIcon size={28} color={ON_BRAND} />
      </Pressable>

      <ConfirmDialog
        visible={pendingDelete !== null}
        title={confirmDialogTitle}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        testID="e2e_record_confirm_delete"
      />

      <RowActionMenu
        visible={kebabMenu !== null}
        items={
          kebabMenu === null
            ? []
            : kebabMenu.status === 'planned'
              ? ([
                  {
                    key: 'delete',
                    label: t('rowActionMenuDelete'),
                    destructive: true,
                    onPress: () => confirmDeleteGroup('planned', kebabMenu.type, kebabMenu.events),
                    testID: `e2e_record_kebab_delete_${kebabMenu.type}`,
                  },
                  {
                    key: 'record-all',
                    label: t('rowActionMenuRecordAll').replace(
                      '{count}',
                      String(kebabMenu.events.length),
                    ),
                    onPress: () => handleBulkConvert(kebabMenu.type, kebabMenu.events),
                    testID: `e2e_record_kebab_record_all_${kebabMenu.type}`,
                  },
                ] satisfies RowActionMenuItem[])
              : ([
                  {
                    key: 'delete',
                    label: t('rowActionMenuDelete'),
                    destructive: true,
                    onPress: () => confirmDeleteGroup('logged', kebabMenu.type, kebabMenu.events),
                    testID: `e2e_record_kebab_delete_${kebabMenu.type}`,
                  },
                ] satisfies RowActionMenuItem[])
        }
        onDismiss={handleKebabDismiss}
        testID="e2e_record_kebab_menu"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 96 },
  listSection: { padding: 16, gap: 8 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  monthArrow: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  monthArrowText: { fontSize: 24, color: TEXT_SECONDARY },
  monthLabel: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 18,
    color: TEXT_PRIMARY,
    letterSpacing: 0.5,
  },
  dowRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 2 },
  dowText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    paddingVertical: 6,
    letterSpacing: 0.6,
    color: TEXT_MUTED,
  },
  grid: { paddingHorizontal: 16, gap: 2 },
  weekRow: { flexDirection: 'row', gap: 2 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    gap: 3,
  },
  cellSel: {
    borderWidth: 1,
    borderColor: BRAND_GREEN,
    backgroundColor: 'rgba(31,58,46,0.06)',
  },
  cellText: { fontSize: 15, color: TEXT_PRIMARY },
  cellTextToday: { fontWeight: '700' },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 6 },
  dotPlus: { fontSize: 10, lineHeight: 10, color: BRAND_GREEN, fontWeight: '700' },
  sectionHeader: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginTop: 12,
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  groupRowOverdue: { opacity: 0.6 },
  groupLabelOverdue: { color: TEXT_MUTED },
  kebabButton: { padding: 6, marginLeft: 4, alignItems: 'center', justifyContent: 'center' },
  eventCardOverdue: { opacity: 0.6 },
  listLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    letterSpacing: 1.4,
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  emptyText: { fontSize: 14, color: TEXT_SECONDARY, textAlign: 'center', paddingVertical: 24 },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
  },
  groupIconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupLabel: { fontSize: 15, fontWeight: '500', color: TEXT_PRIMARY },
  // Sess28 ADR-0037 D3: BADGE_SOFT token 参照 (薄緑 + 濃緑文字、 design_system §20 整合)。
  groupCountBadge: {
    backgroundColor: BADGE_SOFT_BG,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupCountBadgeText: { color: BADGE_SOFT_TEXT, fontSize: 12, fontWeight: '600' },
  groupSpacer: { flex: 1 },
  groupToggleText: { fontSize: 12, color: TEXT_SECONDARY },
  expandedContainer: {
    marginTop: 8,
    marginLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: BRAND_GREEN,
    paddingLeft: 12,
    gap: 6,
  },
  fab: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
