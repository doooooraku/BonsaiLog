/**
 * 作業選択 画面 (Phase G2 part 1、ADR-0024 Accepted)。
 *
 * 旧 `WorkPickerSheet.tsx` (`@gorhom/bottom-sheet` snap 62%) を画面化、
 * `(modals)/work-picker` route で `presentation: 'modal'` 配下に配置 (ADR-0024 Notes Amended
 * 2026-05-15 で formSheet → modal 一本化)。Sess16 PR-A1 で nav title を mode URL param で
 * 動的化 (log → 「作業を記録」 / schedule → 「予定を追加」)。
 *
 * 14 種別の作業タイプを 3 列 grid (WorkTypeIcon SVG outline + ラベル) で表示。
 * Sess16 PR-Q (2026-05-20): candle_cut の松類限定表示を撤廃、 user 真意「どんな盆栽でも全種別表示」
 * シンプル化反映。 EVENT_TYPES を直接使用 (filter なし)。
 *
 * Sess18 PR-1 (2026-05-21、 ADR-0030 D2): mode による navigation 分岐。
 * - log mode: 直接 router.push('/work-log-confirm') (Case C → 解消、 戻る挙動 1 step)
 * - schedule mode: setWorkPickerResult + router.back() (Case A、 caller で DatePicker dialog)
 *
 * Query params:
 * - bonsaiName: 表示用 (サブタイトル)
 * - mode: `'log'` (作業記録) or `'schedule'` (予定追加)、デフォルト `'log'`
 */
import { router, useLocalSearchParams, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import { BG_PRIMARY, BG_SURFACE, BORDER_DEFAULT, TEXT_PRIMARY } from '@/src/core/theme/colors';
import { EVENT_TYPES, type EventType } from '@/src/db/schema';
import { WorkTypeIcon } from '@/src/features/event/WorkTypeIcon';
import { usePickerStore, type WorkPickerMode } from '@/src/stores/pickerStore';

export default function WorkPickerScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    bonsaiName?: string;
    mode?: WorkPickerMode;
  }>();
  const bonsaiName = params.bonsaiName ?? '';
  const mode: WorkPickerMode = params.mode === 'schedule' ? 'schedule' : 'log';

  const items = EVENT_TYPES;
  const handleSelect = (type: EventType) => {
    if (mode === 'log') {
      // Sess18 PR-1 (ADR-0030 D2): Case C 解消、 WorkLogConfirm に直接 push。
      // user 体感「← で 1 画面ずつ戻る」 達成 (Stack: detail → picker → confirm)。
      router.push(
        `/work-log-confirm?bonsaiName=${encodeURIComponent(bonsaiName)}&type=${type}` as Href,
      );
    } else {
      // schedule mode: caller (bonsai-detail) で DatePicker dialog を呼ぶ Case A、
      // store-callback pattern 維持 (ADR-0030 §17-2 P2 整合)。
      usePickerStore.getState().setWorkPickerResult({ type, mode });
      router.back();
    }
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
