/**
 * Stats タブ (F-04 Phase G〜H、Issue #29 / ADR-0013 §S26)。
 *
 * - デフォルト = 全盆栽集約モード (K2 達成率)
 * - BonsaiFilterSheet で個別盆栽選択 → K1 (回数) モード切替
 * - 凡例下サマリー (記録日数 / 件数)
 *
 * データ取得:
 * - 全盆栽 (active のみ): bonsaiRepository.getAllActiveBonsai()
 * - 全 watering events (status='logged'): eventRepository.getAllActiveWateringEventsLogged()
 * - selectedBonsaiId が非 null の時は events を bonsaiId フィルタして個別モード
 *
 * useFocusEffect で画面 focus 時にリロード。
 */
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getTzOffsetMin, nowUtc } from '@/src/core/datetime';
import { useTranslation } from '@/src/core/i18n/i18n';
import { getAllActiveBonsai } from '@/src/db/bonsaiRepository';
import { getAllActiveWateringEventsLogged } from '@/src/db/eventRepository';
import type { Bonsai, Event } from '@/src/db/schema';
import { BonsaiFilterSheet } from '@/src/features/watering/BonsaiFilterSheet';
import { WateringHeatmap } from '@/src/features/watering/WateringHeatmap';
import { toLocalDateKey } from '@/src/features/watering/wateringHeatmap';
import { useRecentBonsaiStore } from '@/src/stores/recentBonsaiStore';

export default function StatsScreen() {
  const { t } = useTranslation();
  const [bonsai, setBonsai] = useState<Bonsai[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  // Phase H-3: 個別/集約モード切替 state
  const [selectedBonsaiId, setSelectedBonsaiId] = useState<string | null>(null);
  const recentIds = useRecentBonsaiStore((s) => s.recentIds);

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

  // 個別モード時は対象盆栽の events のみ。集約モード時は全 events。
  const displayEvents = useMemo(() => {
    if (selectedBonsaiId == null) return events;
    return events.filter((e) => e.bonsaiId === selectedBonsaiId);
  }, [events, selectedBonsaiId]);

  const heatmapMode = selectedBonsaiId == null ? 'aggregate' : 'individual';

  // BonsaiFilterSheet 内部で FlatList (VirtualizedList) を使うため、外側を ScrollView に
  // すると "VirtualizedLists should never be nested inside plain ScrollViews" 警告が出る。
  // stats タブのコンテンツは少量 (タイトル + フィルター + ヒートマップ + サマリー) のため
  // ScrollView は不要、View で十分。スクロール可能領域を将来的に確保したい場合は
  // 外側 FlatList の ListHeaderComponent / ListFooterComponent パターンに移行する。
  return (
    <ThemedView style={styles.container} testID="e2e_stats_screen">
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          {t('statsTabTitle')}
        </ThemedText>
        <BonsaiFilterSheet
          bonsai={bonsai}
          recentIds={recentIds}
          selectedId={selectedBonsaiId}
          onSelect={setSelectedBonsaiId}
        />
        <WateringHeatmap
          events={displayEvents}
          todayLocalKey={todayLocalKey}
          tzOffsetMin={tzOffsetMin}
          mode={heatmapMode}
          totalBonsaiCount={bonsai.length}
          showSummary
          testID="e2e_stats_watering_heatmap"
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 16, gap: 12 },
  title: { marginBottom: 4 },
});
