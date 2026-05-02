/**
 * F-04 Phase B 簡易ヒートマップ (Issue #29 / ADR-0013)。
 *
 * - View ベース (Skia なし) の最小実装。Skia 移行は Phase C で実機 PoC 込みで実施。
 * - 過去 12 週 (84 日) を 7 行 × 12 列で表示 (GitHub 風、新しい列 = 右端)。
 * - 配色は ColorBrewer Greens 4-class (color-blind safe)。
 * - 数字併記なし (Phase C で WCAG 1.4.1 / Apple Differentiate Without Color 対応)。
 * - 凡例 K1: 「水やり回数: □ 0 ■ 1 ■ 2 ■ 3+」(個別盆栽用)。
 * - constraints §5-2 禁止語 (推奨 / べき / reminder / tracker / alert) を含めない。
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import { HEATMAP_COLORS } from '@/src/core/theme/colors';
import {
  buildHeatmapDateKeys,
  getDailyWateringCounts,
  getHeatmapLevel,
  type WateringHeatmapLevel,
} from '@/src/features/watering/wateringHeatmap';
import type { Event } from '@/src/db/schema';

const HEATMAP_DAYS = 84; // 7 × 12

const LEVEL_COLORS: Record<WateringHeatmapLevel, string> = HEATMAP_COLORS;

type Props = {
  events: readonly Event[];
  todayLocalKey: string;
  tzOffsetMin: number;
  testID?: string;
};

export function WateringHeatmap({ events, todayLocalKey, tzOffsetMin, testID }: Props) {
  const { t } = useTranslation();

  // 12 週 × 7 日 (右下 = 今日)。dateKeys は新しい順なので reverse して古い → 新しいに並べる。
  const dateKeys = React.useMemo(
    () => buildHeatmapDateKeys(todayLocalKey, HEATMAP_DAYS).reverse(),
    [todayLocalKey],
  );
  const counts = React.useMemo(
    () => getDailyWateringCounts(events, tzOffsetMin),
    [events, tzOffsetMin],
  );

  // 7 行 (曜日) × 12 列 (週) のグリッドに配置 (col-major)。
  const cols: WateringHeatmapLevel[][] = React.useMemo(() => {
    const result: WateringHeatmapLevel[][] = [];
    for (let c = 0; c < 12; c++) {
      const col: WateringHeatmapLevel[] = [];
      for (let r = 0; r < 7; r++) {
        const idx = c * 7 + r;
        const key = dateKeys[idx];
        const cnt = counts.get(key) ?? 0;
        col.push(getHeatmapLevel(cnt));
      }
      result.push(col);
    }
    return result;
  }, [dateKeys, counts]);

  return (
    <View style={styles.container} testID={testID ?? 'e2e_watering_heatmap'}>
      <View style={styles.grid}>
        {cols.map((col, ci) => (
          <View key={ci} style={styles.col}>
            {col.map((lv, ri) => (
              <View
                key={ri}
                style={[styles.cell, { backgroundColor: LEVEL_COLORS[lv] }]}
                testID={`e2e_heatmap_cell_${ci}_${ri}`}
              />
            ))}
          </View>
        ))}
      </View>

      <View style={styles.legend}>
        <ThemedText style={styles.legendLabel}>{t('wateringHeatmapLegendLabel')}</ThemedText>
        <View style={styles.legendRow}>
          <LegendItem color={LEVEL_COLORS.L0} label={t('wateringHeatmapLegend0')} />
          <LegendItem color={LEVEL_COLORS.L1} label={t('wateringHeatmapLegend1')} />
          <LegendItem color={LEVEL_COLORS.L2} label={t('wateringHeatmapLegend2')} />
          <LegendItem color={LEVEL_COLORS.L3} label={t('wateringHeatmapLegend3')} />
        </View>
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <ThemedText style={styles.legendItemText}>{label}</ThemedText>
    </View>
  );
}

const CELL_SIZE = 14;
const CELL_GAP = 3;

const styles = StyleSheet.create({
  container: { paddingVertical: 8, paddingHorizontal: 16, gap: 12 },
  grid: { flexDirection: 'row', gap: CELL_GAP },
  col: { gap: CELL_GAP },
  cell: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 2 },
  legend: { gap: 6 },
  legendLabel: { fontSize: 12, opacity: 0.7 },
  legendRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSwatch: { width: 12, height: 12, borderRadius: 2 },
  legendItemText: { fontSize: 12 },
});
