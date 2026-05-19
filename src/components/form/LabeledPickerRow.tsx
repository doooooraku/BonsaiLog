/**
 * LabeledPickerRow — picker row 用共通 component (Sess14 PR-M)。
 *
 * 提供する UX (Q-12 a 仕様 + 残課題④):
 * - Label + 任意/必須 badge
 * - Pressable row (tap で picker 画面遷移)
 * - 選択中: row 右端に「×」 (clear button、 排他的に ChevronRight 非表示)
 * - 未選択: row 右端に「›」 (ChevronRight、 排他的に × 非表示)
 * - placeholder: 未選択時の表示文 (default '―')
 *
 * 用途: BonsaiBasicForm の 樹種 / 樹形 (DatePicker と同 pattern 統一)。
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChevronRightIcon } from '@/src/components/icons';
import { BG_SURFACE, BORDER_DEFAULT, TEXT_MUTED } from '@/src/core/theme/colors';

export type LabeledPickerRowProps = {
  label: string;
  optional?: boolean;
  optionalText?: string;
  /** 選択中の表示テキスト (null/undefined = 未選択)。 */
  valueText?: string | null;
  /** 未選択時の placeholder (default '―')。 */
  placeholder?: string;
  /** row tap (picker 画面遷移など)。 */
  onPress: () => void;
  /** × tap (未選択に戻す)。 渡されない場合は × 非表示。 */
  onClear?: () => void;
  testID?: string;
  testIDClear?: string;
};

export function LabeledPickerRow({
  label,
  optional,
  optionalText,
  valueText,
  placeholder = '―',
  onPress,
  onClear,
  testID,
  testIDClear,
}: LabeledPickerRowProps) {
  const hasValue = valueText != null && valueText.length > 0;

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <ThemedText type="defaultSemiBold">{label}</ThemedText>
        {optional && optionalText && (
          <ThemedText style={styles.optionalText}>{optionalText}</ThemedText>
        )}
      </View>
      <View style={styles.rowWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          style={[styles.row, hasValue && styles.rowSelected]}
          onPress={onPress}
          testID={testID}
        >
          <ThemedText style={hasValue ? undefined : styles.placeholderText}>
            {hasValue ? valueText : placeholder}
          </ThemedText>
          {!hasValue && <ChevronRightIcon size={20} color={TEXT_MUTED} />}
        </Pressable>
        {hasValue && onClear && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}: clear`}
            style={styles.clearButton}
            onPress={onClear}
            testID={testIDClear}
          >
            <ThemedText style={styles.clearText}>×</ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionalText: { fontSize: 10, color: TEXT_MUTED, letterSpacing: 0.8 },
  rowWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row: {
    flex: 1,
    height: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    backgroundColor: BG_SURFACE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowSelected: { borderColor: BORDER_DEFAULT },
  placeholderText: { color: TEXT_MUTED },
  clearButton: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: BG_SURFACE,
  },
  clearText: { fontSize: 22, color: TEXT_MUTED, lineHeight: 24 },
});
