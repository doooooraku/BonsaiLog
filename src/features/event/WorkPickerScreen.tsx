/**
 * 作業選択 画面 (Phase G2 part 1、ADR-0024 Accepted)。
 *
 * 旧 `WorkPickerSheet.tsx` (`@gorhom/bottom-sheet` snap 62%) を画面化、
 * `(modals)/work-picker` route で `presentation: 'modal'` 配下に配置 (ADR-0024 Notes Amended
 * 2026-05-15 で formSheet → modal 一本化)。Sess16 PR-A1 で nav title を mode URL param で
 * 動的化 (log → 「作業を記録」 / schedule → 「予定を追加」)、 823810d で削除した content
 * title の mode 情報を nav title に統合。
 *
 * 13 種別の作業タイプを 3 列 grid (WorkTypeIcon SVG outline + ラベル) で表示。
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
import { BG_PRIMARY, BG_SURFACE, BORDER_DEFAULT, TEXT_PRIMARY } from '@/src/core/theme/colors';
import type { EventType } from '@/src/db/schema';
import { WorkTypeIcon } from '@/src/features/event/WorkTypeIcon';
import { usePickerStore, type WorkPickerMode } from '@/src/stores/pickerStore';

const ALL_WORK_TYPES: readonly EventType[] = [
  'watering',
  'pruning',
  'wiring',
  'unwiring',
  'repotting',
  'fertilizing',
  'pest_control',
  'leaf_trimming',
  'defoliation',
  'deshoot',
  'candle_cut',
  'moss_care',
  'position_change',
];
const PINE_ONLY: ReadonlySet<EventType> = new Set(['candle_cut']);

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

  const items = React.useMemo(
    () => ALL_WORK_TYPES.filter((t) => !PINE_ONLY.has(t) || isPine),
    [isPine],
  );
  const handleSelect = (type: EventType) => {
    usePickerStore.getState().setWorkPickerResult({ type, mode });
    router.back();
  };

  return (
    <View style={styles.container} testID="e2e_work_picker_screen">
      <View style={styles.header}>
        <ThemedText style={styles.subject}>{bonsaiName}</ThemedText>
      </View>
      <View style={styles.grid} testID="e2e_work_picker_grid">
        {items.map((type) => (
          <Pressable
            key={type}
            accessibilityRole="button"
            accessibilityLabel={t(`eventType_${type}` as Parameters<typeof t>[0])}
            style={styles.cell}
            onPress={() => handleSelect(type)}
            testID={`e2e_work_picker_${type}`}
          >
            <WorkTypeIcon type={type} size={32} color={TEXT_PRIMARY} />
            <ThemedText style={styles.label}>
              {t(`eventType_${type}` as Parameters<typeof t>[0])}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_PRIMARY, paddingHorizontal: 16, paddingTop: 16 },
  header: { paddingTop: 8, paddingBottom: 12, alignItems: 'center' },
  subject: { fontSize: 14, color: TEXT_PRIMARY },
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
  label: { fontSize: 13, color: TEXT_PRIMARY, textAlign: 'center' },
});
