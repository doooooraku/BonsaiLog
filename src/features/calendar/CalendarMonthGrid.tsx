/**
 * カレンダー月グリッド表示 (Phase 4 B1 で CalendarTabScreen god から抽出)。
 *
 * 月ナビ (前月/月名/次月) + 凡例バー + 曜日ヘッダ (日曜赤/土曜緑/平日muted) +
 * 5-6 週グリッド (ドット 0-3 + 「+」 表示)。振る舞いは元実装と完全同一。
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
// Sess68 PR #C: TEXT_MUTED / TEXT_PRIMARY / TEXT_SECONDARY は inline c.* 化。
// Sess69 PR-B: BRAND_GREEN / DANGER も scheme-aware (c.tint / c.dangerColor) に
// 移行 (dark mode で深緑/深赤が沈む罠を解消、 ADR-0015/ADR-0052 Amendment)。
import { useColors } from '@/src/core/theme/useColors';
import { type EventType } from '@/src/db/schema';
import { CalendarDot } from '@/src/features/plan/CalendarDot';
import { CalendarLegend } from '@/src/features/plan/CalendarLegend';
import { computeDotsByDay } from '@/src/features/plan/dotsByDay';

function getMonthDays(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDow(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

type CalendarMonthGridProps = {
  year: number;
  month: number;
  setYear: (y: number) => void;
  setMonth: (m: number) => void;
  selectedDateKey: string;
  todayLocalKey: string;
  dotsByDay: ReturnType<typeof computeDotsByDay>;
  onSelectDate: (dateKey: string) => void;
  calendarLegendCollapsed: boolean;
  onToggleLegend: () => void;
  testIdPrefix: string;
};

export function CalendarMonthGrid({
  year,
  month,
  setYear,
  setMonth,
  selectedDateKey,
  todayLocalKey,
  dotsByDay,
  onSelectDate,
  calendarLegendCollapsed,
  onToggleLegend,
  testIdPrefix,
}: CalendarMonthGridProps) {
  const { t } = useTranslation();
  const c = useColors();

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
    { label: t('dowSun'), color: c.dangerColor },
    { label: t('dowMon'), color: c.textMuted },
    { label: t('dowTue'), color: c.textMuted },
    { label: t('dowWed'), color: c.textMuted },
    { label: t('dowThu'), color: c.textMuted },
    { label: t('dowFri'), color: c.textMuted },
    { label: t('dowSat'), color: c.tint },
  ];

  return (
    <>
      <View style={styles.monthRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('planPrevMonth')}
          onPress={goPrevMonth}
          style={styles.monthArrow}
          testID={`e2e_${testIdPrefix}_prev_month`}
        >
          <ThemedText style={[styles.monthArrowText, { color: c.textSecondary }]}>{'‹'}</ThemedText>
        </Pressable>
        <ThemedText style={[styles.monthLabel, { color: c.text }]}>{monthLabel}</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('planNextMonth')}
          onPress={goNextMonth}
          style={styles.monthArrow}
          testID={`e2e_${testIdPrefix}_next_month`}
        >
          <ThemedText style={[styles.monthArrowText, { color: c.textSecondary }]}>{'›'}</ThemedText>
        </Pressable>
      </View>

      <CalendarLegend collapsed={calendarLegendCollapsed} onToggle={onToggleLegend} />

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
                  style={[
                    styles.cell,
                    isSel && [
                      styles.cellSel,
                      { borderColor: c.tint, backgroundColor: c.tintSubtle },
                    ],
                  ]}
                  onPress={() => onSelectDate(dateKey)}
                  testID={`e2e_${testIdPrefix}_cell_${dateKey}`}
                >
                  <ThemedText
                    style={[
                      styles.cellText,
                      { color: isToday ? c.tint : c.text },
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
                    {totalUniqueCount > 3 && (
                      <ThemedText style={[styles.dotPlus, { color: c.tint }]}>+</ThemedText>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  monthArrow: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  monthArrowText: { fontSize: 24 },
  monthLabel: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 18,
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
  // Sess69 PR-B: borderColor / backgroundColor は inline c.tint / c.tintSubtle (scheme-aware)。
  cellSel: { borderWidth: 1 },
  cellText: { fontSize: 15 },
  cellTextToday: { fontWeight: '700' },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 6 },
  // Sess69 PR-B: color は inline c.tint (scheme-aware)。
  dotPlus: { fontSize: 10, lineHeight: 10, fontWeight: '700' },
});
