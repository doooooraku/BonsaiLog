/**
 * 横断水やり Calendar (月別 grid、Issue #361 追加スコープ)。
 *
 * `app/(tabs)/plan/index.tsx` の月単位 Calendar 構造を流用 (week row + flex:1 で
 * Saturday overflow 解消済 PR #318)。各セルに水やり件数のドット (最大 3) を表示。
 *
 * Props:
 * - events: 全盆栽の watering events (status='logged'、getAllActiveWateringEventsLogged の戻り)
 * - tzOffsetMin: ローカルタイムゾーンオフセット (toLocalDateKey で日付集計)
 */
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { nowUtc } from '@/src/core/datetime';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  DANGER,
  TEXT_MUTED,
  TEXT_PRIMARY,
} from '@/src/core/theme/colors';
import type { Event } from '@/src/db/schema';
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

type Props = {
  events: readonly Event[];
  tzOffsetMin: number;
  /** 日付セル tap callback (任意、未指定なら tap 不可)。 */
  onDayPress?: (dateKey: string) => void;
};

export function CrossWateringCalendar({ events, tzOffsetMin, onDayPress }: Props) {
  const { t } = useTranslation();
  // ADR-0008 §TZ: new Date() 直接呼出禁止、nowUtc() 経由で生成。
  const today = useMemo(() => new Date(nowUtc() as string), []);
  const todayLocalKey = useMemo(
    () => toLocalDateKey(today.toISOString(), tzOffsetMin),
    [today, tzOffsetMin],
  );

  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth());

  // 日付 (YYYY-MM-DD) → その日の watering event 件数。
  const countsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      const key = toLocalDateKey(e.occurredAtUtc, tzOffsetMin);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [events, tzOffsetMin]);

  const daysInMonth = getMonthDays(year, month);
  const firstDow = getFirstDow(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // 表示中の月の合計件数。
  const monthTotal = useMemo(() => {
    let sum = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${pad(month + 1)}-${pad(d)}`;
      sum += countsByDay.get(key) ?? 0;
    }
    return sum;
  }, [year, month, daysInMonth, countsByDay]);

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
  const goThisMonth = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
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
    <View style={styles.container} testID="e2e_cross_watering_calendar">
      {/* セクションタイトル + 月合計 */}
      <View style={styles.headerRow}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          {t('wateringCalendarSectionTitle')}
        </ThemedText>
        <ThemedText style={styles.monthTotal}>
          {t('wateringCalendarMonthTotal').replace('{count}', String(monthTotal))}
        </ThemedText>
      </View>

      {/* 月切替 + 「今月」ボタン */}
      <View style={styles.monthRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('planPrevMonth')}
          onPress={goPrevMonth}
          style={styles.monthArrow}
          testID="e2e_cross_watering_prev_month"
        >
          <ThemedText style={styles.monthArrowText}>{'‹'}</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('wateringCalendarThisMonth')}
          onPress={goThisMonth}
          style={styles.monthLabelButton}
          testID="e2e_cross_watering_this_month"
        >
          <ThemedText style={styles.monthLabel}>{monthLabel}</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('planNextMonth')}
          onPress={goNextMonth}
          style={styles.monthArrow}
          testID="e2e_cross_watering_next_month"
        >
          <ThemedText style={styles.monthArrowText}>{'›'}</ThemedText>
        </Pressable>
      </View>

      {/* 曜日ラベル */}
      <View style={styles.dowRow}>
        {dowLabels.map((d, i) => (
          <ThemedText key={i} style={[styles.dowText, { color: d.color }]}>
            {d.label}
          </ThemedText>
        ))}
      </View>

      {/* 日付 grid */}
      <View style={styles.grid}>
        {Array.from({ length: Math.ceil(cells.length / 7) }).map((_, w) => (
          <View key={w} style={styles.weekRow}>
            {cells.slice(w * 7, w * 7 + 7).map((d, i) => {
              if (d == null) return <View key={i} style={styles.cell} />;
              const dateKey = `${year}-${pad(month + 1)}-${pad(d)}`;
              const count = countsByDay.get(dateKey) ?? 0;
              const isToday = dateKey === todayLocalKey;
              const cellContent = (
                <>
                  <ThemedText
                    style={[
                      styles.cellText,
                      isToday ? styles.cellTextToday : { color: TEXT_PRIMARY },
                    ]}
                  >
                    {d}
                  </ThemedText>
                  <View style={styles.dotRow}>
                    {Array.from({ length: Math.min(count, 3) }).map((_, k) => (
                      <View key={k} style={styles.dot} />
                    ))}
                  </View>
                </>
              );
              if (onDayPress != null) {
                return (
                  <Pressable
                    key={i}
                    accessibilityRole="button"
                    accessibilityLabel={dateKey}
                    style={styles.cell}
                    onPress={() => onDayPress(dateKey)}
                    testID={`e2e_cross_watering_cell_${dateKey}`}
                  >
                    {cellContent}
                  </Pressable>
                );
              }
              return (
                <View key={i} style={styles.cell} testID={`e2e_cross_watering_cell_${dateKey}`}>
                  {cellContent}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 14 },
  monthTotal: { fontSize: 12, color: TEXT_MUTED },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  monthArrow: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthArrowText: { fontSize: 22, color: TEXT_PRIMARY },
  monthLabelButton: { flex: 1, alignItems: 'center' },
  monthLabel: { fontSize: 15, fontWeight: '500', color: TEXT_PRIMARY },
  dowRow: { flexDirection: 'row', paddingVertical: 4 },
  dowText: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '500' },
  grid: { gap: 2 },
  weekRow: { flexDirection: 'row', gap: 2 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: 'transparent',
    paddingTop: 4,
  },
  cellText: { fontSize: 13 },
  cellTextToday: { color: BRAND_GREEN, fontWeight: '700' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2, minHeight: 6 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: BRAND_GREEN },
});
