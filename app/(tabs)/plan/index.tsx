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
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DropletIcon, EventIcon } from '@/src/components/icons';
import { getTzOffsetMin } from '@/src/core/datetime';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  ACCENT_BARK,
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  DANGER,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { getAllActiveBonsai } from '@/src/db/bonsaiRepository';
import { getAllActivePlannedAndLoggedEvents } from '@/src/db/eventRepository';
import type { Bonsai, Event, EventType } from '@/src/db/schema';
import { SearchHeader } from '@/src/features/bonsai/SearchHeader';
import { toLocalDateKey } from '@/src/features/watering/wateringHeatmap';

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

  const today = new Date();
  const todayLocalKey = toLocalDateKey(today.toISOString(), getTzOffsetMin());

  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayLocalKey);
  const [events, setEvents] = useState<Event[]>([]);
  const [bonsai, setBonsai] = useState<Bonsai[]>([]);

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

  const dotsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      const key = toLocalDateKey(e.occurredAtUtc, tzOffsetMin);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [events, tzOffsetMin]);

  const selectedDayEvents = useMemo(
    () => events.filter((e) => toLocalDateKey(e.occurredAtUtc, tzOffsetMin) === selectedDateKey),
    [events, selectedDateKey, tzOffsetMin],
  );

  const bonsaiMap = useMemo(() => new Map(bonsai.map((b) => [b.id, b])), [bonsai]);

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
      <SearchHeader title={t('planScreenTitle')} showSearch={false} testIdSuffix="plan" />

      {/* Issue #456: 「針金がけ一覧」 row を削除。mockup `plan-tab-{01,02}.png` 整合、
          動線は CareHub (ふりかえりタブ) → 針金がけ一覧 カード経由が単一情報源。
          principles.md v1.3 動線整合性ルール参照。 */}

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
              const dots = dotsByDay.get(dateKey) ?? 0;
              const isSel = dateKey === selectedDateKey;
              const isToday = dateKey === todayLocalKey;
              return (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={`${d}`}
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
                    {Array.from({ length: Math.min(dots, 3) }).map((_, k) => (
                      <View key={k} style={styles.dot} />
                    ))}
                    {/* Issue #321: mockup v1.0 「●●●+」 整合、4+ で「+」 インジケーター */}
                    {dots > 3 && <ThemedText style={styles.dotPlus}>+</ThemedText>}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
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
          selectedDayEvents.map((e) => {
            const b = bonsaiMap.get(e.bonsaiId);
            return (
              <Pressable
                key={e.id}
                accessibilityRole="button"
                accessibilityLabel={b?.name ?? ''}
                style={styles.eventCard}
                onPress={() => router.push(`/(tabs)/bonsai/${e.bonsaiId}` as Href)}
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
                {e.status === 'planned' && (
                  <ThemedText style={styles.plannedLabel}>{t('planEventPlanned')}</ThemedText>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: BRAND_GREEN },
  // Issue #321: 4+ events で「+」インジケーター (mockup v1.0「●●●+」整合)
  dotPlus: { fontSize: 10, lineHeight: 10, color: BRAND_GREEN, fontWeight: '700' },
  listContent: { padding: 16, gap: 8, paddingBottom: 96 },
  listLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    letterSpacing: 1.4,
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  emptyText: { fontSize: 14, color: TEXT_SECONDARY, textAlign: 'center', paddingVertical: 24 },
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
});
