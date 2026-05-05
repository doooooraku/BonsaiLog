/**
 * 個別盆栽の水やり履歴画面 (ADR-0020 Phase 3、SS 222921 整合)。
 *
 * Claude Design `care-screens-v2.jsx HeatmapScreen` 整合:
 * - 30/90/365 日切替セグメント (SegmentedRange)
 * - ヒートマップ (個別モード、4 段階濃淡: 0回/1回/2回/3+回)
 * - 「最後の水やりから N 日」サマリー (NotoSerifJP 28pt 大表示)
 * - 4 サマリー: 連続記録 / 過去 N 日の記録日数 / 過去 N 日の記録回数 / 2回の日
 * - 注記: 「これは記録の表示です。水やりの判定はしません。」(ADR-0011 哲学)
 *
 * 上位画面: `app/(tabs)/bonsai/[id]/index.tsx` の Hero 下「水やり履歴」リンクから遷移。
 */
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
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
import { getBonsaiWithSpecies, type BonsaiWithSpecies } from '@/src/db/bonsaiRepository';
import { getActiveEventsByBonsai } from '@/src/db/eventRepository';
import type { Event } from '@/src/db/schema';
import { WateringHeatmap } from '@/src/features/watering/WateringHeatmap';
import {
  buildIndividualSummary,
  getDaysSinceLastWatering,
  toLocalDateKey,
} from '@/src/features/watering/wateringHeatmap';

type RangeOption = {
  days: 30 | 90 | 365;
  labelKey: 'wateringRange30' | 'wateringRange90' | 'wateringRange365';
};

const RANGES: readonly RangeOption[] = [
  { days: 30, labelKey: 'wateringRange30' },
  { days: 90, labelKey: 'wateringRange90' },
  { days: 365, labelKey: 'wateringRange365' },
];

export default function BonsaiWateringScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useTranslation();
  const c = useColors();
  const [bonsai, setBonsai] = useState<BonsaiWithSpecies | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [windowDays, setWindowDays] = useState<30 | 90 | 365>(90);

  const reload = useCallback(async () => {
    if (!id) return;
    const [b, evs] = await Promise.all([
      getBonsaiWithSpecies(id, lang),
      getActiveEventsByBonsai(id),
    ]);
    setBonsai(b);
    setEvents(evs);
  }, [id, lang]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const tzOffsetMin = getTzOffsetMin();
  const todayLocalKey = toLocalDateKey(nowUtc() as string, tzOffsetMin);

  const daysSinceLast = useMemo(
    () => getDaysSinceLastWatering(events, todayLocalKey, tzOffsetMin),
    [events, todayLocalKey, tzOffsetMin],
  );

  const summary = useMemo(
    () => buildIndividualSummary(events, tzOffsetMin, windowDays, todayLocalKey),
    [events, tzOffsetMin, windowDays, todayLocalKey],
  );

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_bonsai_watering_screen"
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {bonsai != null && (
          <ThemedText style={[styles.subjectLine, { color: c.textSecondary }]}>
            {bonsai.name}
            {bonsai.species != null && (
              <>
                {'  '}
                <ThemedText style={styles.scientific}>{bonsai.species.scientificName}</ThemedText>
              </>
            )}
          </ThemedText>
        )}

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
                testID={`e2e_watering_range_${r.days}`}
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

        {/* ヒートマップ (個別モードのみ、windowDays に関わらず 84 セル表示。30/365 は v1.x で本実装) */}
        <View style={styles.chartCard}>
          <WateringHeatmap
            events={events}
            todayLocalKey={todayLocalKey}
            tzOffsetMin={tzOffsetMin}
            mode="individual"
            testID="e2e_bonsai_watering_heatmap"
          />
        </View>

        {/* 「最後の水やりから」 (Claude Design SS 222921 整合の大表示) */}
        <View style={styles.lastBlock}>
          <ThemedText style={[styles.lastLabel, { color: c.textSecondary }]}>
            {t('wateringLastFromLabel')}
          </ThemedText>
          <ThemedText style={[styles.lastValue, { color: c.text }]}>
            {daysSinceLast == null
              ? t('wateringLastNoRecord')
              : daysSinceLast === 0
                ? t('elapsedToday')
                : daysSinceLast < 7
                  ? t('elapsedDays').replace('{days}', String(daysSinceLast))
                  : daysSinceLast < 30
                    ? t('elapsedWeeks').replace('{weeks}', String(Math.floor(daysSinceLast / 7)))
                    : daysSinceLast < 365
                      ? t('elapsedMonths').replace(
                          '{months}',
                          String(Math.floor(daysSinceLast / 30)),
                        )
                      : t('elapsedYears').replace(
                          '{years}',
                          String(Math.floor(daysSinceLast / 365)),
                        )}
          </ThemedText>
        </View>

        {/* 4 サマリー: 連続記録 / 期間内記録日数 + 回数 / 2 回の日 */}
        <View style={styles.summaryRow}>
          <SummaryStat
            labelKey="wateringSummaryStreak"
            value={t('elapsedDays').replace('{days}', String(summary.currentStreakDays))}
          />
          <View style={[styles.divider, { backgroundColor: BORDER_DEFAULT }]} />
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
          <View style={[styles.divider, { backgroundColor: BORDER_DEFAULT }]} />
          <SummaryStat
            labelKey="wateringSummaryDoubleDays"
            value={t('elapsedDays').replace('{days}', String(summary.daysWithMultipleRecords))}
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
    </ThemedView>
  );
}

function SummaryStat({
  labelKey,
  value,
}: {
  labelKey:
    | 'wateringSummaryStreak'
    | 'wateringSummaryRecorded30'
    | 'wateringSummaryRecorded90'
    | 'wateringSummaryRecorded365'
    | 'wateringSummaryDoubleDays';
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
  scientific: { fontStyle: 'italic' },
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
  lastBlock: { paddingTop: 8, gap: 4 },
  lastLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  lastValue: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 28,
    lineHeight: 36,
    color: TEXT_PRIMARY,
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER_DEFAULT,
  },
  divider: { width: 1 },
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
