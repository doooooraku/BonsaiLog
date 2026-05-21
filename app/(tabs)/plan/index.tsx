/**
 * 予定タブ (ADR-0020 Phase 5、Claude Design `care-screens.jsx CalendarScreen` 整合)。
 *
 * 構造:
 * - SearchHeader (タイトル「予定」+ 検索 + 屋外モードトグル)
 * - 月選択 (前月 / 当月名 / 次月、NotoSerifJP 18pt)
 * - DOW header (日曜赤 / 土曜緑 / 平日 muted、mono 11pt)
 * - 5〜6 週グリッド (aspectRatio 1、当日 BRAND_GREEN 強調 + ドット 0-3 表示)
 * - 選択日リスト (縦カード、bonsai 名 + 作業ラベル + planned バッジ)
 *
 * Phase 5 の最小実装:
 * - 当月のカレンダー表示 + 当日 ドット
 * - 選択日タップで該当 events を一覧
 * - 「今日の作業を一括記録」FAB は v1.x (現状の bonsai 詳細画面の WorkPickerSheet 経路で代替)
 * - 針金がけ一覧 (WiringListScreen) は v1.x、本 PR には含めない (機能は wiring 既存実装で維持)
 */
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DropletIcon, EventIcon, PlusIcon } from '@/src/components/icons';
import { getTzOffsetMin } from '@/src/core/datetime';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  ACCENT_BARK,
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
import { getAllActivePlannedAndLoggedEvents } from '@/src/db/eventRepository';
import { EVENT_TYPES, type Bonsai, type Event, type EventType } from '@/src/db/schema';
import { SearchHeader } from '@/src/features/bonsai/SearchHeader';
import { useBulkActionFlow } from '@/src/features/event/useBulkActionFlow';
import { CalendarDot } from '@/src/features/plan/CalendarDot';
import { CalendarLegend } from '@/src/features/plan/CalendarLegend';
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

export default function PlanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const tabBarHeight = useBottomTabBarHeight();
  const { startBulkAction } = useBulkActionFlow('schedule');

  const today = new Date();
  const todayLocalKey = toLocalDateKey(today.toISOString(), getTzOffsetMin());

  // Sess19 ADR-0031 D1: URL param `?selectedDateKey=YYYY-MM-DD` で記録/予定追加後の遷移先
  // 日付を受信。 WorkLogConfirm / BulkLogConfirm から `router.replace('/(tabs)/plan?selectedDateKey=...')`
  // で渡される。 優先順位: URL param > pickerStore.planSelectedDateKey (Sess12 PR-H) > today
  const params = useLocalSearchParams<{ selectedDateKey?: string }>();
  const urlDateKey = params.selectedDateKey ?? null;

  // Sess12 PR-H: PlanScreen 再 mount 時に pickerStore から 前回の selectedDateKey を restore
  // (PR-G router.replace で PlanScreen 再 mount され selectedDateKey が today reset される副作用 fix)
  const storedDateKey = usePickerStore.getState().planSelectedDateKey;
  const initialDateKey = urlDateKey ?? storedDateKey ?? todayLocalKey;
  const initialYear = Number(initialDateKey.slice(0, 4));
  const initialMonth = Number(initialDateKey.slice(5, 7)) - 1;

  const [year, setYear] = useState<number>(initialYear);
  const [month, setMonth] = useState<number>(initialMonth);
  const [selectedDateKey, setSelectedDateKeyState] = useState<string>(initialDateKey);
  const [events, setEvents] = useState<Event[]>([]);
  const [bonsai, setBonsai] = useState<Bonsai[]>([]);

  // Sess12 PR-H: selectedDateKey 変更時に pickerStore にも sync
  const setSelectedDateKey = useCallback((dateKey: string) => {
    setSelectedDateKeyState(dateKey);
    usePickerStore.getState().setPlanSelectedDateKey(dateKey);
  }, []);

  // Sess19 ADR-0031 D1: URL param `?selectedDateKey=...` 変化時に該当日付を選択状態に。
  // PlanScreen は tab 内 screen で permanent mount のため initial state では URL param が
  // 後続の router.replace で更新されず、 useEffect で watch して setSelectedDateKey 経由で同期。
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

  // Sess19-2 ADR-0032 D1: dotsByDay を planned/logged で別カウントに拡張
  // Pattern C: 全 logged → 緑のみ / 全 planned → 茶のみ / 混在 → 両色併記 (max 3 個まで)
  const dotsByDay = useMemo(() => {
    const map = new Map<string, { planned: number; logged: number }>();
    for (const e of events) {
      const key = toLocalDateKey(e.occurredAtUtc, tzOffsetMin);
      const cur = map.get(key) ?? { planned: 0, logged: 0 };
      if (e.status === 'planned') cur.planned += 1;
      else if (e.status === 'logged') cur.logged += 1;
      map.set(key, cur);
    }
    return map;
  }, [events, tzOffsetMin]);

  const selectedDayEvents = useMemo(
    () => events.filter((e) => toLocalDateKey(e.occurredAtUtc, tzOffsetMin) === selectedDateKey),
    [events, selectedDateKey, tzOffsetMin],
  );

  const bonsaiMap = useMemo(() => new Map(bonsai.map((b) => [b.id, b])), [bonsai]);

  // Sess12 PR-D 改善 C: 過去日選択時は FAB disable (予定追加禁止、 履歴閲覧は可)
  // ISO 'YYYY-MM-DD' 形式で字列比較 OK (日付順 = 字列辞書順)
  const isSelectedPastDate = useMemo(
    () => selectedDateKey < todayLocalKey,
    [selectedDateKey, todayLocalKey],
  );

  // Sess19-2 ADR-0032 D2: 選択日 events を「これから (planned)」 + 「完了 (logged)」 で section 分割
  // 各 section 内は type 別 group (既存 Sess12 PR-E pattern を 2 階層に拡張)
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

  // Sess22 ADR-0034 D1: カレンダー凡例 collapsible bar の折りたたみ状態 (Zustand persist 永続化)
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
      testID="e2e_plan_screen"
    >
      <SearchHeader title={t('calendarScreenTitle')} showSearch={false} testIdSuffix="plan" />

      {/* Issue #456: 「針金がけ一覧」 row を削除。mockup `plan-tab-{01,02}.png` 整合、
          動線は CareHub (ふりかえりタブ) → 針金がけ一覧 カード経由が単一情報源。
          principles.md v1.3 動線整合性ルール参照。 */}

      {/* Sess12 PR-D 改善 A: 全体スクロール (カレンダー + listing 一緒に流れる)。
          SearchHeader と FAB のみ固定、 他は ScrollView 内に配置。 */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.monthRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('planPrevMonth')}
            onPress={goPrevMonth}
            style={styles.monthArrow}
            testID="e2e_plan_prev_month"
          >
            <ThemedText style={styles.monthArrowText}>{'‹'}</ThemedText>
          </Pressable>
          <ThemedText style={[styles.monthLabel, { color: c.text }]}>{monthLabel}</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('planNextMonth')}
            onPress={goNextMonth}
            style={styles.monthArrow}
            testID="e2e_plan_next_month"
          >
            <ThemedText style={styles.monthArrowText}>{'›'}</ThemedText>
          </Pressable>
        </View>

        {/* Sess22 ADR-0034 D1: カレンダー凡例 collapsible bar (月選択 row と DOW header の間に配置) */}
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
                const dotData = dotsByDay.get(dateKey) ?? { planned: 0, logged: 0 };
                const totalDots = dotData.planned + dotData.logged;
                const isSel = dateKey === selectedDateKey;
                const isToday = dateKey === todayLocalKey;
                // Sess19-2 ADR-0032 D1: 各日 max 3 個まで dot (logged 優先で並べる、 残りを planned で埋める)
                const renderedLogged = Math.min(dotData.logged, 3);
                const remainingSlots = Math.max(0, 3 - renderedLogged);
                const renderedPlanned = Math.min(dotData.planned, remainingSlots);
                return (
                  <Pressable
                    key={i}
                    accessibilityRole="button"
                    accessibilityLabel={`${d}日, ${t('planLegendDotLoggedLabel').replace(' (●)', '')} ${renderedLogged}件, ${t('planLegendDotPlannedLabel').replace(' (○)', '')} ${renderedPlanned}件`}
                    style={[styles.cell, isSel && styles.cellSel]}
                    onPress={() => setSelectedDateKey(dateKey)}
                    testID={`e2e_plan_cell_${dateKey}`}
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
                      {/* Sess22 ADR-0034 D3: 色 + アイコン併用で WCAG 1.4.1 解消 (CalendarDot component) */}
                      {Array.from({ length: renderedLogged }).map((_, k) => (
                        <CalendarDot key={`logged-${k}`} status="logged" />
                      ))}
                      {Array.from({ length: renderedPlanned }).map((_, k) => (
                        <CalendarDot key={`planned-${k}`} status="planned" />
                      ))}
                      {/* mockup v1.0 「●●●+」 整合: 4+ で「+」 (planned + logged 合算) */}
                      {totalDots > 3 && <ThemedText style={styles.dotPlus}>+</ThemedText>}
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
              {/* Sess19-2 ADR-0032 D2: 「これから (planned)」 section、 件数 0 なら非表示 */}
              {plannedGroupedEvents.length > 0 && (
                <>
                  <ThemedText style={styles.sectionHeader} testID="e2e_plan_section_upcoming">
                    {t('planSectionUpcoming')} (
                    {plannedGroupedEvents.reduce((sum, [, evs]) => sum + evs.length, 0)} 件)
                  </ThemedText>
                  {plannedGroupedEvents.map(([type, events]) => {
                    const isExpanded = expandedTypes.has(type);
                    const groupLabel = t(`eventType_${type}` as Parameters<typeof t>[0]);
                    const toggleText = isExpanded ? t('planGroupCollapse') : t('planGroupExpand');
                    // Sess19-2 ADR-0032 D3: 期限切れ planned (occurredAtUtc < today) は警告色
                    const hasOverdue = events.some(
                      (e) => toLocalDateKey(e.occurredAtUtc, tzOffsetMin) < todayLocalKey,
                    );
                    return (
                      <View key={`planned-${type}`}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${groupLabel} ×${events.length}, ${toggleText}`}
                          accessibilityState={{ expanded: isExpanded }}
                          style={[styles.groupRow, hasOverdue && styles.groupRowOverdue]}
                          onPress={() => toggleExpand(type)}
                          testID={`e2e_plan_group_planned_${type}`}
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
                              ×{events.length}
                            </ThemedText>
                          </View>
                          <View style={styles.groupSpacer} />
                          <ThemedText style={styles.groupToggleText}>
                            {toggleText} {isExpanded ? '▲' : '▼'}
                          </ThemedText>
                        </Pressable>
                        {isExpanded && (
                          <View style={styles.expandedContainer}>
                            {events.map((e) => {
                              const b = bonsaiMap.get(e.bonsaiId);
                              const isOverdue =
                                toLocalDateKey(e.occurredAtUtc, tzOffsetMin) < todayLocalKey;
                              return (
                                <Pressable
                                  key={e.id}
                                  accessibilityRole="button"
                                  accessibilityLabel={b?.name ?? ''}
                                  style={[styles.eventCard, isOverdue && styles.eventCardOverdue]}
                                  onPress={() => {
                                    router.push(
                                      `/(tabs)/bonsai/${e.bonsaiId}?tab=timeline` as Href,
                                    );
                                  }}
                                  testID={`e2e_plan_event_${e.id}`}
                                >
                                  <View style={styles.eventIconBox}>
                                    {e.type === 'watering' ? (
                                      <DropletIcon size={18} />
                                    ) : (
                                      <EventIcon type={e.type as EventType} size={18} />
                                    )}
                                  </View>
                                  <View style={styles.eventBody}>
                                    <ThemedText
                                      style={[
                                        styles.eventBonsai,
                                        isOverdue && styles.eventBonsaiOverdue,
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {b?.name ?? ''}
                                    </ThemedText>
                                    <ThemedText style={styles.eventLabel}>
                                      {t(`eventType_${e.type}` as Parameters<typeof t>[0])}
                                    </ThemedText>
                                  </View>
                                </Pressable>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </>
              )}
              {/* Sess19-2 ADR-0032 D2: 「完了 (logged)」 section、 件数 0 なら非表示 */}
              {loggedGroupedEvents.length > 0 && (
                <>
                  <ThemedText style={styles.sectionHeader} testID="e2e_plan_section_done">
                    {t('planSectionDone')} (
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
                          accessibilityLabel={`${groupLabel} ×${events.length}, ${toggleText}`}
                          accessibilityState={{ expanded: isExpanded }}
                          style={styles.groupRow}
                          onPress={() => toggleExpand(type)}
                          testID={`e2e_plan_group_logged_${type}`}
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
                              ×{events.length}
                            </ThemedText>
                          </View>
                          <View style={styles.groupSpacer} />
                          <ThemedText style={styles.groupToggleText}>
                            {toggleText} {isExpanded ? '▲' : '▼'}
                          </ThemedText>
                        </Pressable>
                        {isExpanded && (
                          <View style={styles.expandedContainer}>
                            {events.map((e) => {
                              const b = bonsaiMap.get(e.bonsaiId);
                              return (
                                <Pressable
                                  key={e.id}
                                  accessibilityRole="button"
                                  accessibilityLabel={b?.name ?? ''}
                                  style={styles.eventCard}
                                  onPress={() => {
                                    router.push(`/(tabs)/bonsai/${e.bonsaiId}?tab=history` as Href);
                                  }}
                                  testID={`e2e_plan_event_${e.id}`}
                                >
                                  <View style={styles.eventIconBox}>
                                    {e.type === 'watering' ? (
                                      <DropletIcon size={18} />
                                    ) : (
                                      <EventIcon type={e.type as EventType} size={18} />
                                    )}
                                  </View>
                                  <View style={styles.eventBody}>
                                    <ThemedText style={styles.eventBonsai} numberOfLines={1}>
                                      {b?.name ?? ''}
                                    </ThemedText>
                                    <ThemedText style={styles.eventLabel}>
                                      {t(`eventType_${e.type}` as Parameters<typeof t>[0])}
                                    </ThemedText>
                                  </View>
                                </Pressable>
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

      {/* Sess12 PR-D 改善 C: 過去日選択時は FAB disable (灰 + 押せない)。
          履歴閲覧は selectedDateKey による listing 表示で引き続き可能。 */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('planFabLabel')}
        accessibilityState={{ disabled: isSelectedPastDate }}
        disabled={isSelectedPastDate}
        style={[
          styles.fab,
          { backgroundColor: isSelectedPastDate ? TEXT_MUTED : c.tint, bottom: tabBarHeight + 16 },
          isSelectedPastDate && styles.fabDisabled,
        ]}
        onPress={() =>
          startBulkAction(
            bonsai.map((b) => ({ id: b.id, name: b.name })),
            selectedDateKey,
          )
        }
        testID="e2e_plan_fab_action"
      >
        <PlusIcon size={28} color={ON_BRAND} />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Sess12 PR-D 改善 A: 全体 ScrollView の contentContainerStyle
  // paddingBottom 96 で FAB と被らない (tabBarHeight + 16 + 56 余裕含む)
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
  grid: {
    paddingHorizontal: 16,
    gap: 2,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 2,
  },
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
  // Sess22 ADR-0034 D3: dot render は CalendarDot component に統一、 legacy styles 削除
  // (旧 styles.dot / dotLogged / dotPlanned は CalendarDot に置換、 ADR-0032 Notes Amended で記載)
  // Issue #321: 4+ events で「+」インジケーター (mockup v1.0「●●●+」整合)
  dotPlus: { fontSize: 10, lineHeight: 10, color: BRAND_GREEN, fontWeight: '700' },
  // Sess19-2 ADR-0032 D2: section header (「これから」 / 「完了」)
  sectionHeader: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginTop: 12,
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  // Sess19-2 ADR-0032 D3: 期限切れ planned 警告色 (TEXT_MUTED で薄く、 「期限切れ」 ラベルなし)
  groupRowOverdue: { opacity: 0.6 },
  groupLabelOverdue: { color: TEXT_MUTED },
  eventCardOverdue: { opacity: 0.6 },
  eventBonsaiOverdue: { color: TEXT_MUTED },
  listLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    letterSpacing: 1.4,
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  emptyText: { fontSize: 14, color: TEXT_SECONDARY, textAlign: 'center', paddingVertical: 24 },
  // Sess12 PR-E 改善 B: 作業種別グループ row + 件数バッジ + toggle text
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
  groupCountBadge: {
    backgroundColor: BRAND_GREEN,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupCountBadgeText: { color: ON_BRAND, fontSize: 12, fontWeight: '600' },
  groupSpacer: { flex: 1 },
  groupToggleText: { fontSize: 12, color: TEXT_SECONDARY },
  // 展開コンテナ: 左 indent + 縦 border-left で 「まとまり感」 (Notion / Apple Notes パターン)
  expandedContainer: {
    marginTop: 8,
    marginLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: BRAND_GREEN,
    paddingLeft: 12,
    gap: 6,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
  },
  eventIconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventBody: { flex: 1, minWidth: 0, gap: 2 },
  eventBonsai: { fontSize: 15, fontWeight: '500', color: TEXT_PRIMARY },
  eventLabel: { fontSize: 12, color: TEXT_SECONDARY },
  plannedLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: ACCENT_BARK,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(90,70,55,0.1)',
    borderRadius: 4,
    letterSpacing: 0.6,
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
  // Sess12 PR-D 改善 C: 過去日選択時の FAB disable スタイル
  fabDisabled: { opacity: 0.5, elevation: 0, shadowOpacity: 0 },
});
