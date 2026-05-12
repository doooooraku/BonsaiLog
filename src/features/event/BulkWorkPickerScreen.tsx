/**
 * 一括 (予定追加 / 記録) 作業選択 画面 (Phase G3a、ADR-0024 Accepted)。
 *
 * 旧 `BulkWorkPickerSheet.tsx` (`@gorhom/bottom-sheet` snap 78%) を画面化、
 * `(modals)/bulk-work-picker` route で `presentation: 'formSheet'` 配下に配置。
 *
 * Query params:
 * - mode: 'schedule' | 'log' (i18n + 後続 step 分岐)
 *
 * 選択盆栽は `usePickerStore.bulkContext.selectedBonsais` から取得 (URL params 過大化回避)。
 * 選択時に `store.setBulkWorkPickerResult({ type, mode })` + `router.back()` で caller に返却。
 */
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
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
import { usePickerStore } from '@/src/stores/pickerStore';

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

export default function BulkWorkPickerScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ mode?: 'schedule' | 'log' }>();
  const mode: 'schedule' | 'log' = params.mode === 'log' ? 'log' : 'schedule';

  const selectedBonsais = usePickerStore((s) => s.bulkContext?.selectedBonsais ?? []);
  const items = React.useMemo(() => WORK_TYPES.filter((w) => !w.pineOnly), []);

  const titleKey: TranslationKey =
    mode === 'log' ? 'bulkPickerSheetTitleLog' : 'bulkPickerSheetTitleSchedule';
  const subKey: TranslationKey = mode === 'log' ? 'bulkPickerSheetSubLog' : 'bulkPickerSheetSub';
  const noteKey: TranslationKey = mode === 'log' ? 'bulkPickerSheetNoteLog' : 'bulkPickerSheetNote';

  const handleSelect = (type: EventType) => {
    usePickerStore.getState().setBulkWorkPickerResult({ type, mode });
    router.back();
  };

  return (
    <View style={styles.container} testID="e2e_bulk_work_picker_screen">
      <View style={styles.header}>
        <ThemedText style={styles.title}>{t(titleKey)}</ThemedText>
        <ThemedText style={styles.sub}>
          {t(subKey).replace('{count}', String(selectedBonsais.length))}
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
        <View style={styles.grid}>
          {items.map((w) => (
            <Pressable
              key={w.type}
              accessibilityRole="button"
              accessibilityLabel={t(`eventType_${w.type}` as TranslationKey)}
              style={styles.cell}
              onPress={() => handleSelect(w.type)}
              testID={`e2e_bulk_work_picker_${w.type}`}
            >
              <ThemedText style={styles.emoji}>{w.emoji}</ThemedText>
              <ThemedText style={styles.label}>
                {t(`eventType_${w.type}` as TranslationKey)}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <View style={styles.noteBox}>
          <ThemedText style={styles.noteLabel}>NOTE</ThemedText>
          <ThemedText style={styles.noteText}>{t(noteKey)}</ThemedText>
        </View>
      </ScrollView>
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
