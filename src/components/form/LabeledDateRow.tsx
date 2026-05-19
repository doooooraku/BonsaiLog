/**
 * LabeledDateRow — DatePicker row 共通 component (Sess14 PR-O)。
 *
 * 提供する UX:
 * - Label + 任意/必須 badge
 * - row tap → DatePicker modal 表示 (Native Android DatePickerDialog / iOS UIDatePicker)
 * - 選択中: row 右端に「×」 (clear button)
 * - 未選択: placeholder 表示
 * - 日付 string format: 'YYYY-MM-DD' (ISO 短縮)
 *
 * 用途: 取得日 / 購入日。
 */
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CloseIcon } from '@/src/components/icons';
import { nowUtc } from '@/src/core/datetime/clock';
import {
  BG_PRIMARY,
  BG_SURFACE,
  BORDER_DEFAULT,
  DANGER,
  TEXT_MUTED,
} from '@/src/core/theme/colors';

export type LabeledDateRowProps = {
  label: string;
  required?: boolean;
  optional?: boolean;
  optionalText?: string;
  requiredText?: string;
  /** 'YYYY-MM-DD' 形式の文字列。 空文字 = 未選択。 */
  value: string;
  onChangeText: (yyyymmdd: string) => void;
  placeholder?: string;
  /** 未来日選択を禁止 (default true)。 */
  maxToday?: boolean;
  testID?: string;
  testIDClear?: string;
};

export function LabeledDateRow({
  label,
  required,
  optional,
  optionalText,
  requiredText = '必須',
  value,
  onChangeText,
  placeholder = '日付を選択',
  maxToday = true,
  testID,
  testIDClear,
}: LabeledDateRowProps) {
  const [show, setShow] = useState(false);
  const hasValue = value.length > 0;

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <ThemedText type="defaultSemiBold">{label}</ThemedText>
        {required && (
          <View style={styles.requiredBadge}>
            <ThemedText style={styles.requiredText}>{requiredText}</ThemedText>
          </View>
        )}
        {optional && optionalText && (
          <ThemedText style={styles.optionalText}>{optionalText}</ThemedText>
        )}
      </View>
      <View style={styles.rowWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          style={styles.row}
          onPress={() => setShow(true)}
          testID={testID}
        >
          <ThemedText style={hasValue ? undefined : styles.placeholderText}>
            {hasValue ? value : placeholder}
          </ThemedText>
        </Pressable>
        {hasValue && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}: clear`}
            style={styles.clearButton}
            onPress={() => onChangeText('')}
            testID={testIDClear}
          >
            {/* Sess15 PR-Z: テキスト × → SVG CloseIcon (細線 stroke、 washi 雰囲気整合)。 */}
            <CloseIcon size={18} color={TEXT_MUTED} />
          </Pressable>
        )}
      </View>
      {show && (
        <DateTimePicker
          value={value ? new Date(value) : new Date(nowUtc() as string)}
          mode="date"
          maximumDate={maxToday ? new Date(nowUtc() as string) : undefined}
          onChange={(event: DateTimePickerEvent, date?: Date) => {
            setShow(false);
            if (event.type === 'set' && date) {
              onChangeText(date.toISOString().slice(0, 10));
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // Sess14 PR-R: hardcoded color → DANGER / BG_PRIMARY 既存 theme constant 経由統合。
  requiredBadge: {
    backgroundColor: DANGER,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  requiredText: { fontSize: 10, color: BG_PRIMARY, letterSpacing: 0.8 },
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
    justifyContent: 'center',
  },
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
