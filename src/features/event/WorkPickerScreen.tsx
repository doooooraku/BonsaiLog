/**
 * 作業選択 画面 (Phase G2 part 1、ADR-0024 Provisionally Accepted)。
 *
 * 旧 `WorkPickerSheet.tsx` (`@gorhom/bottom-sheet` snap 62%) を画面化、
 * `(modals)/work-picker` route で `presentation: 'formSheet'` 配下に配置。
 *
 * 13 種別の作業タイプを 3 列 grid (絵文字 + ラベル) で表示。
 * 松類でない場合は `candle_cut` (芽切り) を除外。
 *
 * Query params:
 * - bonsaiName: 表示用 (サブタイトル)
 * - isPine: 松類フラグ (`'true'` で松、他は非松)
 * - mode: `'log'` (作業記録) or `'schedule'` (予定追加)、デフォルト `'log'`
 *
 * 選択時に `usePickerStore.setWorkPickerResult({ type, mode })` + `router.back()` で caller に返却。
 */
import { router, useLocalSearchParams } from 'expo-router';
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
import { usePickerStore, type WorkPickerMode } from '@/src/stores/pickerStore';

type WorkType = {
  type: EventType;
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

export default function WorkPickerScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    bonsaiName?: string;
    isPine?: string;
    mode?: WorkPickerMode;
  }>();
  const bonsaiName = params.bonsaiName ?? '';
  const isPine = params.isPine === 'true';
  const mode: WorkPickerMode = params.mode === 'schedule' ? 'schedule' : 'log';

  const items = React.useMemo(() => WORK_TYPES.filter((w) => !w.pineOnly || isPine), [isPine]);
  const titleKey = mode === 'schedule' ? 'addScheduleTitle' : 'workPickerTitle';

  const handleSelect = (type: EventType) => {
    usePickerStore.getState().setWorkPickerResult({ type, mode });
    router.back();
  };

  return (
    <View style={styles.container} testID="e2e_work_picker_screen">
      <View style={styles.header}>
        <ThemedText style={styles.title}>{t(titleKey)}</ThemedText>
        <ThemedText style={styles.subject}>{bonsaiName}</ThemedText>
      </View>
      <View style={styles.grid} testID="e2e_work_picker_grid">
        {items.map((w) => (
          <Pressable
            key={w.type}
            accessibilityRole="button"
            accessibilityLabel={t(`eventType_${w.type}` as Parameters<typeof t>[0])}
            style={styles.cell}
            onPress={() => handleSelect(w.type)}
            testID={`e2e_work_picker_${w.type}`}
          >
            <ThemedText style={styles.emoji}>{w.emoji}</ThemedText>
            <ThemedText style={styles.label}>
              {t(`eventType_${w.type}` as Parameters<typeof t>[0])}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_PRIMARY, paddingHorizontal: 16, paddingTop: 16 },
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
});
