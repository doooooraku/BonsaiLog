/**
 * 作業記録 BottomSheet (ADR-0020 Phase 4、Claude Design `care-screens.jsx WorkPickerSheet` 整合)。
 *
 * 構造:
 * - BottomSheet (snap 62%)
 * - drag handle (36×5、border-strong opacity 0.5)
 * - タイトル「作業を記録」(NotoSerifJP 20pt) + 盆栽名サブ (NotoSansJP 13pt)
 * - 3 列 grid (gap 10、aspectRatio 1:1) で 13 種別ボタン
 *   - 各ボタン: 絵文字 32px + ラベル 13pt、白背景 + border + radius 12
 *   - 松類 (盆栽 species_id 判定) でないと「芽切り (candle_cut)」を非表示
 *
 * onSelect で親に EventType を渡す → 親が createEvent + reload を実行。
 *
 * 注: 絵文字は ADR-0020 Notes (アイコン全置換は Phase 12 検討、本 Phase は維持)。
 */
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_PRIMARY,
  BG_SURFACE,
  BORDER_DEFAULT,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import type { EventType } from '@/src/db/schema';

type WorkType = {
  type: EventType;
  /** 絵文字 (Claude Design 整合)。Phase 12 で SVG 化検討。 */
  emoji: string;
  /** 松類限定 (例: candle_cut)。 */
  pineOnly?: boolean;
};

const WORK_TYPES: readonly WorkType[] = [
  { type: 'watering', emoji: '💧' },
  { type: 'pruning', emoji: '✂️' },
  { type: 'wiring', emoji: '〰️' },
  { type: 'unwiring', emoji: '✂︎' },
  { type: 'repotting', emoji: '🪴' },
  { type: 'fertilizing', emoji: '🌱' },
  { type: 'pest_control', emoji: '🦋' },
  { type: 'leaf_trimming', emoji: '🍃' },
  { type: 'defoliation', emoji: '🍂' },
  { type: 'deshoot', emoji: '🌿' },
  { type: 'candle_cut', emoji: '🔥', pineOnly: true },
  { type: 'moss_care', emoji: '🌾' },
  { type: 'position_change', emoji: '📍' },
];

type Props = {
  /** -1 = 閉、0 = 62% snap (snapToIndex で制御)。 */
  index: number;
  bonsaiName: string;
  /** 樹種が松類か (candle_cut の表示制御)。default false。 */
  isPine?: boolean;
  onSelect: (type: EventType) => void;
  onClose: () => void;
};

export const WorkPickerSheet = React.forwardRef<BottomSheet, Props>(function WorkPickerSheet(
  { index, bonsaiName, isPine = false, onSelect, onClose }: Props,
  ref,
) {
  const { t } = useTranslation();
  const snapPoints = React.useMemo(() => ['62%'], []);
  const items = React.useMemo(() => WORK_TYPES.filter((w) => !w.pineOnly || isPine), [isPine]);

  return (
    <BottomSheet
      ref={ref}
      index={index}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={styles.sheetBg}
    >
      <BottomSheetView style={styles.content}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>{t('workPickerTitle')}</ThemedText>
          <ThemedText style={styles.subject}>{bonsaiName}</ThemedText>
        </View>
        <View style={styles.grid} testID="e2e_work_picker_grid">
          {items.map((w) => (
            <Pressable
              key={w.type}
              accessibilityRole="button"
              accessibilityLabel={t(`eventType_${w.type}` as Parameters<typeof t>[0])}
              style={styles.cell}
              onPress={() => onSelect(w.type)}
              testID={`e2e_work_picker_${w.type}`}
            >
              <ThemedText style={styles.emoji}>{w.emoji}</ThemedText>
              <ThemedText style={styles.label}>
                {t(`eventType_${w.type}` as Parameters<typeof t>[0])}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: BG_PRIMARY },
  content: { flex: 1, paddingHorizontal: 16, paddingBottom: 34 },
  header: { paddingTop: 8, paddingBottom: 12, alignItems: 'center', gap: 4 },
  title: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 20,
    color: TEXT_PRIMARY,
    letterSpacing: 0.4,
  },
  subject: { fontSize: 13, color: TEXT_SECONDARY },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: {
    width: '31.5%', // 3 列 grid (gap 10 を考慮)
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 8,
  },
  emoji: { fontSize: 32, lineHeight: 36 },
  label: { fontSize: 13, color: TEXT_PRIMARY, textAlign: 'center' },
});
