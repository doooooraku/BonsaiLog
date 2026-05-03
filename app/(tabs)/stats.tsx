/**
 * Stats タブ (F-04 Phase G-2、Issue #29 / ADR-0013 §S26)。
 *
 * - デフォルト = 全盆栽集約モード (K2 達成率)
 * - フィルター UI (BonsaiFilterSheet で個別切替) は Phase H で追加
 * - 凡例下サマリー (記録日数 / 件数) は Phase G-3 で追加
 *
 * データ取得:
 * - 全盆栽 (active のみ): bonsaiRepository.getAllActiveBonsai()
 * - 全 watering events (status='logged'): eventRepository.getAllActiveWateringEventsLogged()
 *
 * useFocusEffect で画面 focus 時にリロード。
 */
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getTzOffsetMin, nowUtc } from '@/src/core/datetime';
import { useTranslation } from '@/src/core/i18n/i18n';
import { getAllActiveBonsai } from '@/src/db/bonsaiRepository';
import { getAllActiveWateringEventsLogged } from '@/src/db/eventRepository';
import type { Bonsai, Event } from '@/src/db/schema';
import { WateringHeatmap } from '@/src/features/watering/WateringHeatmap';
import { toLocalDateKey } from '@/src/features/watering/wateringHeatmap';

export default function StatsScreen() {
  const { t } = useTranslation();
  const [bonsai, setBonsai] = useState<Bonsai[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  const reload = useCallback(async () => {
    const [bs, evs] = await Promise.all([getAllActiveBonsai(), getAllActiveWateringEventsLogged()]);
    setBonsai(bs);
    setEvents(evs);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const tzOffsetMin = getTzOffsetMin();
  const todayLocalKey = toLocalDateKey(nowUtc() as string, tzOffsetMin);

  return (
    <ThemedView style={styles.container} testID="e2e_stats_screen">
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.title}>
          {t('statsTabTitle')}
        </ThemedText>
        <ThemedText style={styles.header} testID="e2e_stats_all_bonsai_label">
          {t('statsHeaderAllBonsai').replace('{count}', String(bonsai.length))}
        </ThemedText>
        <WateringHeatmap
          events={events}
          todayLocalKey={todayLocalKey}
          tzOffsetMin={tzOffsetMin}
          mode="aggregate"
          totalBonsaiCount={bonsai.length}
          showSummary
          testID="e2e_stats_watering_heatmap"
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  title: { marginBottom: 4 },
  header: { fontSize: 14, opacity: 0.8, marginBottom: 8 },
});
