/**
 * 横断 水やり履歴 画面 (Issue #361 / ADR-0020 §Decision §7)。
 *
 * mockup `care-screens.jsx CareHubScreen` L1593 「水やり履歴」カードの遷移先。
 * 個別盆栽用 `app/(tabs)/bonsai/[id]/watering.tsx` の構造を流用しつつ、横断特有の調整:
 * - 全盆栽の watering events を 1 つのヒートマップに集約 (getAllActiveWateringEventsLogged)
 * - 「最後の水やりから N 日」「連続記録」「2 回の日」は意味が薄いため非表示
 * - 「対象盆栽件数」(events から uniq な bonsaiId 数) を新規追加
 *
 * Tier 2 の編集機能完了後、CareHub Hub の watering Alert を本画面遷移に置換。
 */
import type BottomSheet from '@gorhom/bottom-sheet';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getTzOffsetMin, nowUtc } from '@/src/core/datetime';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  ON_BRAND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { getAllActiveBonsaiWithSpecies, type BonsaiWithSpecies } from '@/src/db/bonsaiRepository';
import { getAllActiveWateringEventsLogged } from '@/src/db/eventRepository';
import type { Event } from '@/src/db/schema';
import { CrossWateringCalendar } from '@/src/features/watering/CrossWateringCalendar';
import { WateringDayDetailSheet } from '@/src/features/watering/WateringDayDetailSheet';
import { WateringHeatmap } from '@/src/features/watering/WateringHeatmap';
import { buildIndividualSummary, toLocalDateKey } from '@/src/features/watering/wateringHeatmap';

type RangeOption = {
  days: 30 | 90 | 365;
  labelKey: 'wateringRange30' | 'wateringRange90' | 'wateringRange365';
};

const RANGES: readonly RangeOption[] = [
  { days: 30, labelKey: 'wateringRange30' },
  { days: 90, labelKey: 'wateringRange90' },
  { days: 365, labelKey: 'wateringRange365' },
];

export default function CrossWateringHistoryScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const [events, setEvents] = useState<Event[]>([]);
  const [windowDays, setWindowDays] = useState<30 | 90 | 365>(90);
  const [bonsaiList, setBonsaiList] = useState<BonsaiWithSpecies[]>([]);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const dayDetailSheetRef = useRef<BottomSheet>(null);

  const reload = useCallback(async () => {
    const [evs, bs] = await Promise.all([
      getAllActiveWateringEventsLogged(),
      getAllActiveBonsaiWithSpecies(lang),
    ]);
    setEvents(evs);
    setBonsaiList(bs);
  }, [lang]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const tzOffsetMin = getTzOffsetMin();
  const todayLocalKey = toLocalDateKey(nowUtc() as string, tzOffsetMin);

  // 横断: events から uniq な bonsaiId 数 = 対象盆栽件数
  const bonsaiCount = useMemo(() => {
    const ids = new Set<string>();
    for (const e of events) ids.add(e.bonsaiId);
    return ids.size;
  }, [events]);

  // 横断版サマリー: 個別画面の helper を流用 (recordedDays / totalEvents は横断でも有意)。
  const summary = useMemo(
    () => buildIndividualSummary(events, tzOffsetMin, windowDays, todayLocalKey),
    [events, tzOffsetMin, windowDays, todayLocalKey],
  );

  // 日付タップ → BottomSheet で当日詳細を表示。
  const bonsaiById = useMemo(() => new Map(bonsaiList.map((b) => [b.id, b])), [bonsaiList]);
  const selectedDayEvents = useMemo(() => {
    if (selectedDateKey == null) return [];
    return events.filter((e) => toLocalDateKey(e.occurredAtUtc, tzOffsetMin) === selectedDateKey);
  }, [events, selectedDateKey, tzOffsetMin]);

  const handleDayPress = useCallback((dateKey: string) => {
    setSelectedDateKey(dateKey);
    dayDetailSheetRef.current?.snapToIndex(0);
  }, []);

  const handleDayDetailClose = useCallback(() => {
    setSelectedDateKey(null);
  }, []);

  const handlePressEntry = useCallback(
    (bonsaiId: string) => {
      dayDetailSheetRef.current?.close();
      router.push(`/(tabs)/bonsai/${bonsaiId}` as Href);
    },
    [router],
  );

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_cross_watering_history_screen"
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText style={[styles.subjectLine, { color: c.textSecondary }]}>
          {t('wateringHistoryAllSubtitle')}
          {'  ·  '}
          {t('wateringHistoryAllBonsaiCount').replace('{count}', String(bonsaiCount))}
        </ThemedText>

        {/* Range セグメント (30/90/365) */}
        <View style={styles.segmentWrap}>
          {RANGES.map((r) => {
            const on = r.days === windowDays;
            return (
              <Pressable
                key={r.days}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t(r.labelKey)}
                style={[styles.segmentBtn, on && styles.segmentBtnOn]}
                onPress={() => setWindowDays(r.days)}
                testID={`e2e_cross_watering_range_${r.days}`}
              >
                <ThemedText
                  style={[
                    styles.segmentText,
                    on ? styles.segmentTextOn : { color: c.textSecondary },
                  ]}
                >
                  {t(r.labelKey)}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* ヒートマップ (横断 events 全部、windowDays に応じて 30/90/365 列表示) */}
        <View style={styles.chartCard}>
          <WateringHeatmap
            events={events}
            todayLocalKey={todayLocalKey}
            tzOffsetMin={tzOffsetMin}
            windowDays={windowDays}
            testID="e2e_cross_watering_heatmap"
          />
        </View>

        {/* 月別カレンダー (Issue #361 追加スコープ、ヒートマップとは別の月単位ビュー、日付タップで詳細 BottomSheet) */}
        <CrossWateringCalendar
          events={events}
          tzOffsetMin={tzOffsetMin}
          onDayPress={handleDayPress}
        />

        {/* 期間内サマリー (個別画面の「最後の水やりから / 連続記録 / 2 回の日」は横断では意味が薄いため省略)。 */}
        <View style={styles.summaryRow}>
          <SummaryStat
            labelKey={
              windowDays === 30
                ? 'wateringSummaryRecorded30'
                : windowDays === 90
                  ? 'wateringSummaryRecorded90'
                  : 'wateringSummaryRecorded365'
            }
            value={t('wateringSummaryRecordedValue')
              .replace('{days}', String(summary.recordedDays))
              .replace('{events}', String(summary.totalEvents))}
          />
        </View>

        {/* 注記 (ADR-0011 哲学: 判定しない、記録のみ) */}
        <ThemedText style={[styles.disclaimer, { color: c.textSecondary }]}>
          {t('wateringDisclaimerNoJudgement')}
        </ThemedText>
        <ThemedText style={[styles.disclaimer, { color: c.textSecondary }]}>
          {t('wateringDisclaimerHeatmapMeaning')}
        </ThemedText>
      </ScrollView>

      {/* 日付タップ詳細 BottomSheet (Calendar セル tap で開く) */}
      <WateringDayDetailSheet
        ref={dayDetailSheetRef}
        dateKey={selectedDateKey}
        events={selectedDayEvents}
        bonsaiById={bonsaiById}
        onClose={handleDayDetailClose}
        onPressEntry={handlePressEntry}
      />
    </ThemedView>
  );
}

function SummaryStat({
  labelKey,
  value,
}: {
  labelKey:
    | 'wateringSummaryRecorded30'
    | 'wateringSummaryRecorded90'
    | 'wateringSummaryRecorded365';
  value: string;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.statCol}>
      <ThemedText style={styles.statLabel}>{t(labelKey)}</ThemedText>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, gap: 16 },
  subjectLine: { fontSize: 13, color: TEXT_SECONDARY },
  segmentWrap: {
    flexDirection: 'row',
    gap: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 8,
    backgroundColor: BG_SURFACE,
  },
  segmentBtn: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnOn: { backgroundColor: BRAND_GREEN },
  segmentText: { fontSize: 13, color: TEXT_SECONDARY },
  segmentTextOn: { color: ON_BRAND, fontWeight: '500' },
  chartCard: {
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER_DEFAULT,
  },
  statCol: { flex: 1, paddingHorizontal: 8, gap: 4 },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    letterSpacing: 1.2,
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
  },
  statValue: { fontSize: 17, fontWeight: '500', color: TEXT_PRIMARY },
  disclaimer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 18,
    color: TEXT_SECONDARY,
    letterSpacing: 0.4,
  },
});
