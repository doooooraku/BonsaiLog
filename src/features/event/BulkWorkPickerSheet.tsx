/**
 * 一括 (予定追加 / 記録) 作業選択 BottomSheet (ADR-0020、mockup v1.0 02-Home.html `01c` 整合)。
 *
 * mode='schedule' (Issue #342、PR #342): 一括予定追加フローの作業選択
 * mode='log'      (Issue #343、PR G9-1): 一括記録フローの作業選択
 *
 * 構造 (mockup care-screens-v2.jsx BulkWorkPickerSheet 整合):
 * - BottomSheet (snap '78%')
 * - drag handle
 * - タイトル + サブ (mode に応じて i18n 切替)
 *   - schedule: 「まとめて予定追加」/「N件の盆栽に同じ予定を追加」
 *   - log:      「まとめて記録」    /「N件の盆栽に同じ作業を記録」
 * - selected chips (横スクロール、各 chip = サムネ + 名前)
 * - 14 作業 grid (3 列、aspectRatio 1:1、`pineOnly` (candle_cut) 除外、mockup `speciesOnly` 整合)
 * - NOTE box (mode に応じて i18n 切替、松類限定が出ない理由の説明)
 *
 * onSelect 経由で親 (HomeScreen) に EventType を渡す → 親が次 step に遷移。
 */
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_PRIMARY,
  BG_SURFACE,
  BORDER_DEFAULT,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import type { EventType } from '@/src/db/schema';
import { BonsaiPlaceholder, hashSeed } from '@/src/features/bonsai/BonsaiPlaceholder';

type WorkType = {
  type: EventType;
  emoji: string;
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
  visible: boolean;
  /** 一括予定追加 (schedule) or 一括記録 (log)。i18n 切替に使用。 */
  mode: 'schedule' | 'log';
  selectedBonsais: readonly { id: string; name: string }[];
  onSelect: (type: EventType) => void;
  onClose: () => void;
};

export function BulkWorkPickerSheet({ visible, mode, selectedBonsais, onSelect, onClose }: Props) {
  const { t } = useTranslation();
  const ref = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['78%'], []);
  // schedule / log どちらも pineOnly 除外 (mockup `items.filter(w => !w.speciesOnly)` 整合)
  const items = useMemo(() => WORK_TYPES.filter((w) => !w.pineOnly), []);

  useEffect(() => {
    ref.current?.snapToIndex(visible ? 0 : -1);
  }, [visible]);

  const titleKey = mode === 'log' ? 'bulkPickerSheetTitleLog' : 'bulkPickerSheetTitleSchedule';
  const subKey = mode === 'log' ? 'bulkPickerSheetSubLog' : 'bulkPickerSheetSub';
  const noteKey = mode === 'log' ? 'bulkPickerSheetNoteLog' : 'bulkPickerSheetNote';

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={styles.sheetBg}
    >
      <BottomSheetView style={styles.content} testID="e2e_bulk_work_picker_sheet">
        <View style={styles.header}>
          <ThemedText style={styles.title}>{t(titleKey)}</ThemedText>
          <ThemedText style={styles.sub}>
            {t(subKey).replace('{count}', String(selectedBonsais.length))}
          </ThemedText>
        </View>
        <BottomSheetScrollView
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
        </BottomSheetScrollView>
        <BottomSheetScrollView contentContainerStyle={styles.body}>
          <View style={styles.grid}>
            {items.map((w) => (
              <Pressable
                key={w.type}
                accessibilityRole="button"
                accessibilityLabel={t(`eventType_${w.type}` as Parameters<typeof t>[0])}
                style={styles.cell}
                onPress={() => onSelect(w.type)}
                testID={`e2e_bulk_work_picker_${w.type}`}
              >
                <ThemedText style={styles.emoji}>{w.emoji}</ThemedText>
                <ThemedText style={styles.label}>
                  {t(`eventType_${w.type}` as Parameters<typeof t>[0])}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          <View style={styles.noteBox}>
            <ThemedText style={styles.noteLabel}>NOTE</ThemedText>
            <ThemedText style={styles.noteText}>{t(noteKey)}</ThemedText>
          </View>
        </BottomSheetScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: BG_PRIMARY },
  content: { flex: 1 },
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
  body: { padding: 16, paddingBottom: 34, gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: {
    width: '31.5%',
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
  noteBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
  },
  noteLabel: {
    fontSize: 10,
    color: TEXT_MUTED,
    letterSpacing: 1.2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  noteText: { fontSize: 12, color: TEXT_SECONDARY, lineHeight: 19 },
});
