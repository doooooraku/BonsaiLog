/**
 * 一括予定追加 日付選択画面 (Phase G3b、ADR-0024 Accepted、skip-list home-bulk-sched-date 解消)。
 *
 * 旧 `BulkScheduleDateSheet.tsx` (`@gorhom/bottom-sheet` snap 88%) を画面化、
 * `(modals)/bulk-schedule-date` route で `presentation: 'formSheet'` 配下に配置。
 *
 * 自前 calendar (月切替 + DOW header + 週行 day grid) を維持、ADR-0008 §TZ 3 層防御
 * (new Date() 引数なし禁止、nowUtc() 経由) も完全踏襲。
 *
 * Query params:
 * - type: 作業種別 (EventType、必須)
 *
 * 選択盆栽は `usePickerStore.bulkContext.selectedBonsais` から取得。
 * Save 時に `store.setBulkScheduleDateResult({ occurredAtUtc })` + `router.back()` で
 * caller に返却。
 */
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { nowUtc } from '@/src/core/datetime';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
import {
  BG_PRIMARY,
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
import type { EventType } from '@/src/db/schema';
import { BonsaiPlaceholder, hashSeed } from '@/src/features/bonsai/BonsaiPlaceholder';
import { usePickerStore } from '@/src/stores/pickerStore';

export default function BulkScheduleDateScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const params = useLocalSearchParams<{ type?: EventType }>();
  const type = (params.type ?? null) as EventType | null;
  const selectedBonsais = usePickerStore((s) => s.bulkContext?.selectedBonsais ?? []);

  const today = React.useMemo(() => new Date(nowUtc() as string), []);
  const [year, setYear] = React.useState(today.getFullYear());
  const [month, setMonth] = React.useState(today.getMonth() + 1);
  const [day, setDay] = React.useState(today.getDate());

  const daysInMonth = React.useMemo(() => new Date(year, month, 0).getDate(), [year, month]);
  const firstDow = React.useMemo(() => new Date(year, month - 1, 1).getDay(), [year, month]);

  // 週行に分割 (MEMORY: calendar-grid-saturday-overflow.md PR #318 の罠回避、weeks row + flex:1)
  const weeks = React.useMemo<(number | null)[][]>(() => {
    const total = firstDow + daysInMonth;
    const weekCount = Math.ceil(total / 7);
    const result: (number | null)[][] = [];
    for (let w = 0; w < weekCount; w++) {
      const week: (number | null)[] = [];
      for (let dow = 0; dow < 7; dow++) {
        const idx = w * 7 + dow;
        if (idx < firstDow) week.push(null);
        else if (idx - firstDow < daysInMonth) week.push(idx - firstDow + 1);
        else week.push(null);
      }
      result.push(week);
    }
    return result;
  }, [firstDow, daysInMonth]);

  const goPrev = () => {
    let m = month - 1;
    let y = year;
    if (m < 1) {
      m = 12;
      y--;
    }
    setMonth(m);
    setYear(y);
    setDay((d) => Math.min(d, new Date(y, m, 0).getDate()));
  };
  const goNext = () => {
    let m = month + 1;
    let y = year;
    if (m > 12) {
      m = 1;
      y++;
    }
    setMonth(m);
    setYear(y);
    setDay((d) => Math.min(d, new Date(y, m, 0).getDate()));
  };

  if (type == null) return null;
  const dowLabels = t('bulkScheduleDowLabels').split(',');
  const monthLabel = t('bulkScheduleMonthLabel')
    .replace('{year}', String(year))
    .replace('{month}', String(month));
  const workLabel = t(`eventType_${type}` as TranslationKey);

  const handleSave = () => {
    const local = new Date(year, month - 1, day, 0, 0, 0, 0);
    const occurredAtUtc = local.toISOString();
    usePickerStore.getState().setBulkScheduleDateResult({ occurredAtUtc });
    router.back();
  };

  return (
    <View style={styles.container} testID="e2e_bulk_schedule_date_screen">
      <View style={styles.header}>
        <ThemedText style={styles.title}>
          {t('bulkScheduleDateTitle').replace('{label}', workLabel)}
        </ThemedText>
        <ThemedText style={styles.sub}>
          {t('bulkScheduleDateSub').replace('{count}', String(selectedBonsais.length))}
        </ThemedText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {selectedBonsais.map((b) => (
          <View key={b.id} style={styles.chip}>
            <BonsaiPlaceholder size={24} seed={hashSeed(b.id)} radius={12} />
            <ThemedText style={styles.chipText} numberOfLines={1}>
              {b.name}
            </ThemedText>
          </View>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.monthNav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="prev month"
            style={[styles.monthBtn, { backgroundColor: c.background, borderColor: c.border }]}
            onPress={goPrev}
            testID="e2e_bulk_schedule_prev_month"
          >
            <ThemedText style={styles.monthBtnText}>‹</ThemedText>
          </Pressable>
          <ThemedText style={styles.monthLabel}>{monthLabel}</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="next month"
            style={[styles.monthBtn, { backgroundColor: c.background, borderColor: c.border }]}
            onPress={goNext}
            testID="e2e_bulk_schedule_next_month"
          >
            <ThemedText style={styles.monthBtnText}>›</ThemedText>
          </Pressable>
        </View>

        <View style={styles.dowRow}>
          {dowLabels.map((dow, i) => (
            <View key={`${dow}-${i}`} style={styles.dowCell}>
              <ThemedText
                style={[
                  styles.dowText,
                  { color: i === 0 ? DANGER : i === 6 ? BRAND_GREEN : TEXT_MUTED },
                ]}
              >
                {dow}
              </ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.dayGrid}>
          {weeks.map((week, wi) => (
            <View key={`week-${wi}`} style={styles.dayWeek}>
              {week.map((d, dow) =>
                d === null ? (
                  <View key={`pad-${wi}-${dow}`} style={styles.dayCellEmpty} />
                ) : (
                  <Pressable
                    key={`day-${d}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: d === day }}
                    style={[
                      styles.dayCell,
                      d === day
                        ? styles.dayCellSelected
                        : { backgroundColor: 'transparent', borderColor: c.border },
                    ]}
                    onPress={() => setDay(d)}
                    testID={`e2e_bulk_schedule_day_${d}`}
                  >
                    <ThemedText
                      style={[
                        styles.dayText,
                        d === day
                          ? { color: ON_BRAND }
                          : { color: dow === 0 ? DANGER : TEXT_PRIMARY },
                      ]}
                    >
                      {d}
                    </ThemedText>
                  </Pressable>
                ),
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.background }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('bulkScheduleSaveCta').replace(
            '{count}',
            String(selectedBonsais.length),
          )}
          style={[styles.cta, { backgroundColor: c.tint }]}
          onPress={handleSave}
          testID="e2e_bulk_schedule_save_cta"
        >
          <ThemedText style={styles.ctaText}>
            {t('bulkScheduleSaveCta').replace('{count}', String(selectedBonsais.length))}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_PRIMARY },
  header: { paddingTop: 8, paddingBottom: 8, alignItems: 'center', gap: 4 },
  title: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 20,
    color: TEXT_PRIMARY,
    letterSpacing: 0.4,
  },
  sub: { fontSize: 12, color: TEXT_SECONDARY },
  chipsRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 10,
    borderRadius: 18,
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    maxWidth: 140,
  },
  chipText: { fontSize: 12, fontWeight: '500', color: TEXT_PRIMARY, flexShrink: 1 },
  body: { padding: 16, gap: 12 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  monthBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthBtnText: { fontSize: 18, color: TEXT_PRIMARY },
  monthLabel: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 18,
    color: TEXT_PRIMARY,
  },
  dowRow: { flexDirection: 'row', marginBottom: 4 },
  dowCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  dowText: { fontSize: 11, letterSpacing: 0.6 },
  dayGrid: { gap: 6 },
  dayWeek: { flexDirection: 'row', gap: 6 },
  dayCellEmpty: { flex: 1, aspectRatio: 1 },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: { backgroundColor: BRAND_GREEN, borderColor: BRAND_GREEN },
  dayText: { fontSize: 14 },
  footer: { padding: 16, paddingBottom: 22, borderTopWidth: 1 },
  cta: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontSize: 17, fontWeight: '500', color: ON_BRAND, letterSpacing: 0.6 },
});
