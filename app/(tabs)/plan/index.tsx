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
  ACCENT_BARK,
  BADGE_SOFT_BG,
  BADGE_SOFT_TEXT,
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  BUTTON_SECONDARY_BG,
  BUTTON_SECONDARY_TEXT,
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

export default function PlanScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const tabBarHeight = useBottomTabBarHeight();
  const { startBulkAction } = useBulkActionFlow('schedule');

  const today = new Date();
  const todayLocalKey = toLocalDateKey(today.toISOString(), getTzOffsetMin());

  // ADR-0035 D2 (Sess23 PR-2-1): タブ「予定」 tap = 当日+1日 (明日) default 選択
  const tomorrowLocalKey = useMemo(() => {
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    return toLocalDateKey(tomorrow.toISOString(), getTzOffsetMin());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sess19 ADR-0031 D1: URL param `?selectedDateKey=YYYY-MM-DD` で記録/予定追加後の遷移先
  // 日付を受信。 ADR-0035 D2/D6 (Sess23): `?source=tab` 付与で予定タブ tap (明日 default) /
  // 記録タブ tap (今日 selectedDateKey 明示) の入口を区別。
  // 優先順位: URL param > storedDateKey > (source=tab かつ selectedDateKey 不在 → tomorrow) > today
  const params = useLocalSearchParams<{ selectedDateKey?: string; source?: string }>();
  const urlDateKey = params.selectedDateKey ?? null;
  const sourceIsTab = params.source === 'tab';

  // Sess12 PR-H: PlanScreen 再 mount 時に pickerStore から 前回の selectedDateKey を restore
  // (PR-G router.replace で PlanScreen 再 mount され selectedDateKey が today reset される副作用 fix)
  const storedDateKey = usePickerStore.getState().planSelectedDateKey;
  const initialDateKey =
    urlDateKey ?? (sourceIsTab ? tomorrowLocalKey : (storedDateKey ?? todayLocalKey));
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
  // ADR-0035 D2 (Sess23): source=tab かつ urlDateKey なし → tomorrow に同期
  useEffect(() => {
    if (urlDateKey) {
      setSelectedDateKey(urlDateKey);
      setYear(Number(urlDateKey.slice(0, 4)));
      setMonth(Number(urlDateKey.slice(5, 7)) - 1);
    } else if (sourceIsTab) {
      setSelectedDateKey(tomorrowLocalKey);
      setYear(Number(tomorrowLocalKey.slice(0, 4)));
      setMonth(Number(tomorrowLocalKey.slice(5, 7)) - 1);
    }
  }, [urlDateKey, sourceIsTab, tomorrowLocalKey, setSelectedDateKey]);

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

  // Sess22 ADR-0034 D2: dotsByDay を「作業別 unique (Set<EventType>)」 に変更
  // 「複数盆栽でも 1 作業なら dot 1 個」 (user 真意) を構造実現。
  // 純関数 computeDotsByDay は src/features/plan/dotsByDay.ts、 5 case unit test 済。
  const dotsByDay = useMemo(() => computeDotsByDay(events, tzOffsetMin), [events, tzOffsetMin]);

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

  // ADR-0035 D7 (Sess23 PR-4-2): 予定→記録 変換動線
  // single 変換: 個別 EventRow の「作業を記録」 button tap → WorkLogConfirm に既選択 prefilled
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

  // bulk 変換: planned section group 「全 N 件を記録」 button tap → BulkLogConfirm に csv + bulkContext prefilled
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

  // ADR-0036 D1-D9 (Sess25 PR-ζ-2-⑦): カスタム ConfirmDialog + RowActionMenu + UndoSnackbar + Haptics
  // 旧 ADR-0035 D3 (Sess23 PR-3-1) の Alert.alert 経路を完全置換、 planned/logged 文言分離 + group 削除 +
  // wiring cascade + 4 秒 Undo + Haptics 2 段 fb (R-44/R-45 整合)。
  type PendingDelete = {
    eventIds: readonly string[];
    titleKey:
      | 'planEventDeleteConfirmPlannedSingleTitle'
      | 'planEventDeleteConfirmLoggedSingleTitle'
      | 'planEventDeleteConfirmPlannedGroupTitle'
      | 'planEventDeleteConfirmLoggedGroupTitle';
    count: number;
    hasWiring: boolean;
    /** Undo Snackbar 用 (planned/logged で文言分岐) */
    undoMessageKey: 'undoSnackbarPlannedDeleteN' | 'undoSnackbarLoggedDeleteN';
  };
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  // RowActionMenu (kebab) state、 ADR-0036 D7
  type KebabMenu = {
    type: EventType;
    events: readonly Event[];
    status: 'planned' | 'logged';
  };
  const [kebabMenu, setKebabMenu] = useState<KebabMenu | null>(null);

  const triggerLongPressHaptic = useCallback(() => {
    // R-45: 長押し成功時の触覚 fb (Medium、 削除 dialog 表示前 1 段目)
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  /** 個別 event 削除 dialog 表示 helper (long-press + kebab tap 共用、 Sess27 PR-5) */
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

  /** 個別 event long-press → Haptics + ConfirmDialog (R-45 触覚 fb 経路) */
  const confirmDeleteEvent = useCallback(
    (ev: Event) => {
      triggerLongPressHaptic();
      showIndividualDeleteDialog(ev);
    },
    [triggerLongPressHaptic, showIndividualDeleteDialog],
  );

  /** group 行 long-press / kebab menu「削除」 → ConfirmDialog (group まとめ削除、 wiring cascade 補足) */
  const confirmDeleteGroup = useCallback(
    (status: 'planned' | 'logged', type: EventType, groupEvents: readonly Event[]) => {
      triggerLongPressHaptic();
      const hasWiring = type === 'wiring' || groupEvents.some((e) => e.type === 'wiring');
      // Sess27 PR-6 (Issue 5): count===1 case (group ×1) で「まとめて」 は日本語として不自然、
      // 個別 row と同じ Single title key を再利用 (既存 i18n key、 追加翻訳不要)
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

  /** ConfirmDialog 「削除」 押下: bulkSoftDelete + cancelForEvents + reload + 通知 Toast (Sess27 PR-3、 ADR-0036 D5 撤回) */
  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const { eventIds, count, undoMessageKey } = pendingDelete;
    setPendingDelete(null);
    await bulkSoftDeleteEvents(eventIds);
    await cancelForEvents(eventIds, t);
    await reload();
    // Sess27 PR-3 (ADR-0036 D5 撤回、 R-44 緩和): Undo button 撤回、 通知 Toast のみ
    useToastStore.getState().show(t(undoMessageKey).replace('{count}', String(count)));
  }, [pendingDelete, t, reload]);

  const handleCancelDelete = useCallback(() => setPendingDelete(null), []);

  /** group 行 右端 kebab tap → RowActionMenu 表示 */
  const handleKebabPress = useCallback(
    (status: 'planned' | 'logged', type: EventType, groupEvents: readonly Event[]) => {
      setKebabMenu({ type, events: groupEvents, status });
    },
    [],
  );
  const handleKebabDismiss = useCallback(() => setKebabMenu(null), []);

  /** ConfirmDialog title 組立 (count placeholder + wiring cascade 補足) */
  const confirmDialogTitle = useMemo(() => {
    if (!pendingDelete) return '';
    const base = t(pendingDelete.titleKey).replace('{count}', String(pendingDelete.count));
    // ADR-0036 D8: wiring cascade 含む group の場合、 title 末尾に補足
    if (pendingDelete.hasWiring && pendingDelete.eventIds.length > 1) {
      return `${base} ${t('planEventDeleteConfirmWiringCascadeNote')}`;
    }
    return base;
  }, [pendingDelete, t]);

  // Sess22 ADR-0034 D7: listing 件数補完「×N (M 鉢)」
  // PR-2-1 で dot 粒度を作業別 unique 化したため、 listing で「同日 3 鉢 watering」 のような
  // 件数情報を補完表示。 events.length === uniqueBonsaiCount なら従来通り「×N」 簡潔表示、
  // 異なる場合「×N (M 鉢)」 で「N 件 → M 鉢」 を明示。 業務プロが視認可能。
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
      testID="e2e_plan_screen"
    >
      <SearchHeader title={t('tabPlan')} showSearch={false} testIdSuffix="plan" />

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
                // Sess22 ADR-0034 D2: 作業別 unique 集計、 size ベース render
                const dotData = dotsByDay.get(dateKey) ?? {
                  plannedTypes: new Set<EventType>(),
                  loggedTypes: new Set<EventType>(),
                };
                const loggedUniqueCount = dotData.loggedTypes.size;
                const plannedUniqueCount = dotData.plannedTypes.size;
                const totalUniqueCount = loggedUniqueCount + plannedUniqueCount;
                const isSel = dateKey === selectedDateKey;
                const isToday = dateKey === todayLocalKey;
                // ADR-0035 D5 (Sess23): planned (○) を左に並べ、 残 slot を logged (●) で右に埋める
                // (時間軸 予定 → 記録 を左→右で表現、 旧 ADR-0034 D3 logged 優先 を flip)
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
                      {/* ADR-0035 D5 (Sess23): planned (○) を左、 logged (●) を右に flip */}
                      {Array.from({ length: renderedPlanned }).map((_, k) => (
                        <CalendarDot key={`planned-${k}`} status="planned" />
                      ))}
                      {Array.from({ length: renderedLogged }).map((_, k) => (
                        <CalendarDot key={`logged-${k}`} status="logged" />
                      ))}
                      {/* mockup v1.0 「●●●+」 整合: 4+ で「+」 (Sess22 ADR-0034 D2 で unique count ベース) */}
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
              {/* Sess19-2 ADR-0032 D2: 「これから (planned)」 section、 件数 0 なら非表示 */}
              {plannedGroupedEvents.length > 0 && (
                <>
                  <ThemedText style={styles.sectionHeader} testID="e2e_plan_section_upcoming">
                    {t('planSectionScheduled')} (
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
                          accessibilityLabel={formatGroupAccessibility(
                            groupLabel,
                            events,
                            toggleText,
                          )}
                          accessibilityState={{ expanded: isExpanded }}
                          style={[styles.groupRow, hasOverdue && styles.groupRowOverdue]}
                          onPress={() => toggleExpand(type)}
                          // ADR-0036 D2 / R-44/R-45 (Sess25): group まとめ削除 (Haptics + ConfirmDialog + Undo)
                          onLongPress={() => confirmDeleteGroup('planned', type, events)}
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
                              {formatGroupCount(events)}
                            </ThemedText>
                          </View>
                          <View style={styles.groupSpacer} />
                          {/* Sess29 ADR-0038 D3: group header に「全 N 件を記録」 button 復活 (kebab menu と併存、 案 B-2)。
                              stopPropagation で親 toggleExpand 不発火、 handleBulkConvert (D7 動線) で予定→記録変換。 */}
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('rowActionMenuRecordAll').replace(
                              '{count}',
                              String(events.length),
                            )}
                            style={styles.groupRecordButton}
                            hitSlop={6}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleBulkConvert(type, events);
                            }}
                            testID={`e2e_plan_group_record_button_${type}`}
                          >
                            <ThemedText style={styles.groupRecordButtonText}>
                              {t('rowActionMenuRecordAll').replace(
                                '{count}',
                                String(events.length),
                              )}
                            </ThemedText>
                          </Pressable>
                          <ThemedText style={styles.groupToggleText}>
                            {toggleText} {isExpanded ? '▲' : '▼'}
                          </ThemedText>
                          {/* ADR-0036 D7 (Sess25): kebab menu (削除 + 全 N 件を記録)、 ADR-0038 D3 (Sess29) で group button と併存 (案 B-2) */}
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('rowActionMenuDelete')}
                            style={styles.kebabButton}
                            hitSlop={8}
                            onPress={() => handleKebabPress('planned', type, events)}
                            testID={`e2e_plan_group_kebab_planned_${type}`}
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
                              // Sess22 ADR-0034 D4/D5: EventRow 流用で bonsai-detail history と pixel 整合
                              // ADR-0035 D7 (Sess23): 個別「作業を記録」 button 配線
                              return (
                                <View
                                  key={e.id}
                                  style={isOverdue && styles.eventCardOverdue}
                                  testID={`e2e_plan_event_${e.id}`}
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
                                    kebabTestID={`e2e_plan_event_kebab_${e.id}`}
                                    actionButtonLabel={t('planEventRecordButtonSingle')}
                                    onActionPress={handleSingleConvert}
                                    actionButtonTestID={`e2e_plan_event_record_button_${e.id}`}
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
              {/* Sess19-2 ADR-0032 D2: 「完了 (logged)」 section、 件数 0 なら非表示 */}
              {loggedGroupedEvents.length > 0 && (
                <>
                  <ThemedText style={styles.sectionHeader} testID="e2e_plan_section_done">
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
                          // ADR-0036 D2 / R-44/R-45 (Sess25): logged group も まとめ削除可
                          onLongPress={() => confirmDeleteGroup('logged', type, events)}
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
                              {formatGroupCount(events)}
                            </ThemedText>
                          </View>
                          <View style={styles.groupSpacer} />
                          <ThemedText style={styles.groupToggleText}>
                            {toggleText} {isExpanded ? '▲' : '▼'}
                          </ThemedText>
                          {/* ADR-0036 D7 (Sess25): logged は kebab menu = 削除のみ 1 item */}
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('rowActionMenuDelete')}
                            style={styles.kebabButton}
                            hitSlop={8}
                            onPress={() => handleKebabPress('logged', type, events)}
                            testID={`e2e_plan_group_kebab_logged_${type}`}
                          >
                            <MoreVerticalIcon size={20} color={TEXT_SECONDARY} />
                          </Pressable>
                        </Pressable>
                        {isExpanded && (
                          <View style={styles.expandedContainer}>
                            {events.map((e) => {
                              const b = bonsaiMap.get(e.bonsaiId);
                              // Sess22 ADR-0034 D4/D5: EventRow 流用で bonsai-detail history と pixel 整合
                              return (
                                <View key={e.id} testID={`e2e_plan_event_${e.id}`}>
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
                                    kebabTestID={`e2e_plan_event_kebab_${e.id}`}
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

      {/* ADR-0036 D1/D3/D4/D8 (Sess25): カスタム ConfirmDialog (削除確認、 planned/logged 分離、 wiring cascade 補足) */}
      <ConfirmDialog
        visible={pendingDelete !== null}
        title={confirmDialogTitle}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        testID="e2e_plan_confirm_delete"
      />

      {/* ADR-0036 D7 (Sess25): RowActionMenu (kebab) — planned = 削除 + 全 N 件を記録 / logged = 削除のみ */}
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
                    testID: `e2e_plan_kebab_delete_${kebabMenu.type}`,
                  },
                  {
                    key: 'record-all',
                    label: t('rowActionMenuRecordAll').replace(
                      '{count}',
                      String(kebabMenu.events.length),
                    ),
                    onPress: () => handleBulkConvert(kebabMenu.type, kebabMenu.events),
                    testID: `e2e_plan_kebab_record_all_${kebabMenu.type}`,
                  },
                ] satisfies RowActionMenuItem[])
              : ([
                  {
                    key: 'delete',
                    label: t('rowActionMenuDelete'),
                    destructive: true,
                    onPress: () => confirmDeleteGroup('logged', kebabMenu.type, kebabMenu.events),
                    testID: `e2e_plan_kebab_delete_${kebabMenu.type}`,
                  },
                ] satisfies RowActionMenuItem[])
        }
        onDismiss={handleKebabDismiss}
        testID="e2e_plan_kebab_menu"
      />
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
  // ADR-0036 D7 (Sess25): group 行 右端 kebab (⋮) icon button、 RowActionMenu 起動
  kebabButton: {
    padding: 6,
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sess26 PR-η-1 cleanup: 旧 ADR-0035 D7 緑 button styles (groupRecordButton + groupRecordButtonText) を
  // 物理削除。 ADR-0036 D7 で kebab menu「全 N 件を記録」 item に統合済 (Sess25 PR-⑦)。
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
  // Sess28 PR-5 (ADR-0037 D3): BADGE_SOFT token 参照 (薄緑 + 濃緑文字、 design_system §20 整合)。
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
  // Sess29 ADR-0038 D3 / R-48: group header「全 N 件を記録」 button (Secondary CTA、 design_system §22)
  groupRecordButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: BUTTON_SECONDARY_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  groupRecordButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: BUTTON_SECONDARY_TEXT,
    letterSpacing: 0.3,
  },
  // 展開コンテナ: 左 indent + 縦 border-left で 「まとまり感」 (Notion / Apple Notes パターン)
  expandedContainer: {
    marginTop: 8,
    marginLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: BRAND_GREEN,
    paddingLeft: 12,
    gap: 6,
  },
  // Sess24 Phase ζ-1-③ (PR-zeta-1-3): EventRow 流用後の未使用 styles 削除
  // (eventCard / eventIconBox / eventBody / eventBonsai / eventLabel / plannedLabel /
  //  eventBonsaiOverdue 7 件、 grep 0 hit 確認後)
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
