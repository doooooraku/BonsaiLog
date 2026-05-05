/**
 * F-04 Phase F ヒートマップ (Issue #29 / ADR-0013)。
 *
 * ADR-0020 Phase v1.x-7: 集約モード (aggregate) 廃止により個別モード (individual) 専用に簡素化。
 *   stats タブ削除 (Phase 1) + watering.tsx に統合 (Phase 3-A) で aggregate 参照経路はすでに無し。
 *
 * - **Skia ベース描画** (Phase F、PR #166 で追加した @shopify/react-native-skia)。
 *   View per-cell からの移行で、84 セル描画コストを GPU に移譲。
 * - 過去 12 週 (84 日) を 7 行 × 12 列で表示 (GitHub 風、新しい列 = 右端)。
 * - 配色は ColorBrewer Greens 4-class (color-blind safe)。
 * - 凡例 K1: 「水やり回数: □ 0 ■ 1 ■ 2 ■ 3+」(個別盆栽用)。
 * - constraints §5-2 禁止語 (推奨 / べき / reminder / tracker / alert) を含めない。
 *
 * 構造:
 * - 背面: Skia Canvas (絶対配置、サイズ計算済) + Rect 84 個 (背景塗り)
 * - 前面: Pressable グリッド (透明背景、tap キャプチャ + a11y label)
 *
 * Pressable と Skia Rect は同一座標で重なるため、視覚 = Skia / hit test = Pressable
 * となる二層構成。
 */
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Canvas, Rect } from '@shopify/react-native-skia';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import { HEATMAP_COLORS } from '@/src/core/theme/colors';
import {
  buildHeatmapDateKeys,
  buildHeatmapSummary,
  getDailyWateringCounts,
  getHeatmapLevel,
  type WateringHeatmapLevel,
} from '@/src/features/watering/wateringHeatmap';
import type { Event } from '@/src/db/schema';

const LEVEL_COLORS: Record<WateringHeatmapLevel, string> = HEATMAP_COLORS;

/** ADR-0020 v1.x-6: 30 / 90 / 365 日範囲の列数 (7 行固定、列は週単位)。 */
const RANGE_COLUMNS: Record<30 | 90 | 365, number> = {
  30: 5, // 5 週 × 7 = 35 マス (30 日に近い)
  90: 13, // 13 週 × 7 = 91 マス (90 日に近い、SS 222921 の標準)
  365: 53, // 53 週 × 7 = 371 マス (365 日に近い、年次表示)
};

type Props = {
  events: readonly Event[];
  todayLocalKey: string;
  tzOffsetMin: number;
  /** ADR-0020 v1.x-6: 表示範囲 (30/90/365 日)。default 90 (SS 222921 標準)。 */
  windowDays?: 30 | 90 | 365;
  /**
   * Phase G-3: 凡例下サマリー (記録日数 / 件数) 表示。デフォルト false (呼出側オプトイン)。
   * windowDays に応じて期間が変わる。
   */
  showSummary?: boolean;
  testID?: string;
};

export function WateringHeatmap({
  events,
  todayLocalKey,
  tzOffsetMin,
  windowDays = 90,
  showSummary = false,
  testID,
}: Props) {
  const { t } = useTranslation();
  const sheetRef = React.useRef<BottomSheet>(null);
  const [selected, setSelected] = React.useState<{ dateKey: string; count: number } | null>(null);
  const snapPoints = React.useMemo(() => ['25%'], []);
  const handleCellPress = React.useCallback((dateKey: string, count: number) => {
    setSelected({ dateKey, count });
    sheetRef.current?.snapToIndex(0);
  }, []);
  const handleSheetClose = React.useCallback(() => {
    setSelected(null);
  }, []);

  const cellSize = windowDays === 365 ? 6 : windowDays === 30 ? 22 : 14;
  const cellGap = windowDays === 365 ? 1 : windowDays === 30 ? 4 : 3;
  const numCols = RANGE_COLUMNS[windowDays];
  const totalCells = numCols * 7;

  // numCols 週 × 7 日 (右下 = 今日)。dateKeys は新しい順なので reverse して古い → 新しいに並べる。
  const dateKeys = React.useMemo(
    () => buildHeatmapDateKeys(todayLocalKey, totalCells).reverse(),
    [todayLocalKey, totalCells],
  );
  const counts = React.useMemo(
    () => getDailyWateringCounts(events, tzOffsetMin),
    [events, tzOffsetMin],
  );

  type CellInfo = {
    level: WateringHeatmapLevel;
    dateKey: string;
    count: number;
  };
  const cols: CellInfo[][] = React.useMemo(() => {
    const result: CellInfo[][] = [];
    for (let c = 0; c < numCols; c++) {
      const col: CellInfo[] = [];
      for (let r = 0; r < 7; r++) {
        const idx = c * 7 + r;
        const key = dateKeys[idx] ?? '';
        const cnt = counts.get(key) ?? 0;
        col.push({ level: getHeatmapLevel(cnt), dateKey: key, count: cnt });
      }
      result.push(col);
    }
    return result;
  }, [dateKeys, counts, numCols]);

  const summary = React.useMemo(
    () =>
      showSummary ? buildHeatmapSummary(events, tzOffsetMin, totalCells, todayLocalKey) : null,
    [showSummary, events, tzOffsetMin, totalCells, todayLocalKey],
  );
  const summaryPercent =
    summary != null ? Math.round((summary.recordedDays / totalCells) * 100) : 0;

  const canvasWidth = numCols * cellSize + (numCols - 1) * cellGap;
  const canvasHeight = 7 * cellSize + 6 * cellGap;

  return (
    <View style={styles.container} testID={testID ?? 'e2e_watering_heatmap'}>
      <View style={[styles.gridWrap, { width: canvasWidth, height: canvasHeight }]}>
        <Canvas
          style={[StyleSheet.absoluteFill, { width: canvasWidth, height: canvasHeight }]}
          testID="e2e_heatmap_skia_canvas"
        >
          {cols.flatMap((col, ci) =>
            col.map((cell, ri) => (
              <Rect
                key={`${ci}-${ri}`}
                x={ci * (cellSize + cellGap)}
                y={ri * (cellSize + cellGap)}
                width={cellSize}
                height={cellSize}
                color={LEVEL_COLORS[cell.level]}
              />
            )),
          )}
        </Canvas>
        <View style={[styles.grid, { gap: cellGap }]}>
          {cols.map((col, ci) => (
            <View key={ci} style={{ gap: cellGap }}>
              {col.map((cell, ri) => (
                <Pressable
                  key={ri}
                  accessibilityRole="button"
                  accessibilityLabel={t('wateringHeatmapDetailTitle')
                    .replace('{date}', cell.dateKey)
                    .replace('{count}', String(cell.count))}
                  style={{ width: cellSize, height: cellSize }}
                  testID={`e2e_heatmap_cell_${ci}_${ri}`}
                  onPress={() => handleCellPress(cell.dateKey, cell.count)}
                  hitSlop={4}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* 凡例 (個別モード K1: 0 / 1 / 2 / 3+ 回) */}
      <View style={styles.legend}>
        <ThemedText style={styles.legendLabel}>{t('wateringHeatmapLegendLabel')}</ThemedText>
        <View style={styles.legendRow}>
          <LegendItem color={LEVEL_COLORS.L0} label={t('wateringHeatmapLegend0')} />
          <LegendItem color={LEVEL_COLORS.L1} label={t('wateringHeatmapLegend1')} />
          <LegendItem color={LEVEL_COLORS.L2} label={t('wateringHeatmapLegend2')} />
          <LegendItem color={LEVEL_COLORS.L3} label={t('wateringHeatmapLegend3')} />
        </View>
        {summary != null && (
          <View style={styles.summary} testID="e2e_heatmap_summary">
            <ThemedText style={styles.summaryLine}>
              {t('wateringHeatmapSummaryRecordedDays')
                .replace('{days}', String(summary.recordedDays))
                .replace('{total}', String(totalCells))
                .replace('{percent}', String(summaryPercent))}
            </ThemedText>
            <ThemedText style={styles.summaryLine}>
              {t('wateringHeatmapSummaryTotalEvents').replace(
                '{count}',
                String(summary.totalEvents),
              )}
            </ThemedText>
          </View>
        )}
      </View>

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={handleSheetClose}
      >
        <BottomSheetView style={styles.sheetContent} testID="e2e_heatmap_cell_detail_sheet">
          {selected && (
            <>
              <ThemedText type="defaultSemiBold" style={styles.sheetTitle}>
                {t('wateringHeatmapDetailTitle').replace('{date}', selected.dateKey)}
              </ThemedText>
              <ThemedText style={styles.sheetCount}>
                {t('wateringHeatmapDetailCount').replace('{count}', String(selected.count))}
              </ThemedText>
            </>
          )}
        </BottomSheetView>
      </BottomSheet>
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

const styles = StyleSheet.create({
  container: { paddingVertical: 8, paddingHorizontal: 16, gap: 12 },
  gridWrap: { position: 'relative' },
  grid: { flexDirection: 'row' },
  legend: { gap: 6 },
  legendLabel: { fontSize: 12, opacity: 0.7 },
  legendRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSwatch: { width: 12, height: 12, borderRadius: 2 },
  legendItemText: { fontSize: 12 },
  summary: { marginTop: 4, gap: 2 },
  summaryLine: { fontSize: 12, opacity: 0.85 },
  sheetContent: { padding: 16, gap: 8 },
  sheetTitle: { fontSize: 16 },
  sheetCount: { fontSize: 14, opacity: 0.8 },
});
