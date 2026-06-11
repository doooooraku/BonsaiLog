/**
 * 作業種別 14 種の選択 grid (Sess99 #1122 SoT 抽出)。
 *
 * 旧: WorkPickerScreen / BulkWorkPickerScreen が同一の grid + cell styles を WET 複製していた
 * (3 列 31.5% / aspectRatio 1 / WorkTypeIcon 32 + label 13)。RecurrenceFormScreen の
 * 種別インライン変更 (#1122 案 G2) で 3 箇所目が必要になったため component 化
 * (user 恒常指示: 重複は見つけ次第 関数化/コンポーネント化して資産化)。
 *
 * - selectedType: 指定時は該当 cell を tint 枠で highlighted (WorkPickerScreen 編集モード由来)
 * - testIDPrefix: `${testIDPrefix}_${type}` で cell testID を採番 (既存 testID 後方互換)
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
import { useColors } from '@/src/core/theme/useColors';
import { EVENT_TYPES, type EventType } from '@/src/db/schema';
import { WorkTypeIcon } from '@/src/features/event/WorkTypeIcon';

export function WorkTypeGrid({
  selectedType,
  onSelect,
  testIDPrefix,
}: {
  selectedType?: EventType | null;
  onSelect: (type: EventType) => void;
  testIDPrefix: string;
}) {
  const { t } = useTranslation();
  const c = useColors();
  return (
    <View style={styles.grid}>
      {EVENT_TYPES.map((type) => {
        const isCurrent = selectedType === type;
        return (
          <Pressable
            key={type}
            accessibilityRole="button"
            accessibilityLabel={t(`eventType_${type}` as TranslationKey)}
            style={[
              styles.cell,
              { backgroundColor: c.surface, borderColor: c.border },
              isCurrent && { borderColor: c.tint, borderWidth: 2 },
            ]}
            onPress={() => onSelect(type)}
            testID={`${testIDPrefix}_${type}`}
          >
            <WorkTypeIcon type={type} size={32} color={isCurrent ? c.tint : c.text} />
            <ThemedText style={[styles.label, { color: isCurrent ? c.tint : c.text }]}>
              {t(`eventType_${type}` as TranslationKey)}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 8,
  },
  label: { fontSize: 13, textAlign: 'center' },
});
