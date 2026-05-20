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
  ON_BRAND,
  TEXT_MUTED,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { formOptional, formRequired } from '@/src/core/theme/typography';

// Sess17 PR-C1: hardcoded fontSize/fontWeight → typography.ts token 経由化 (ADR-0029 D1)。

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
            hitSlop={6}
            onPress={() => onChangeText('')}
            testID={testIDClear}
          >
            {/* Sess15 PR-II: 案 a = 灰 circle 背景 + 白 X (Material chip remove 風、 tap target 明示)。 */}
            <CloseIcon size={14} color={ON_BRAND} strokeWidth={2.5} />
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
  requiredText: { ...formRequired, color: BG_PRIMARY },
  optionalText: formOptional,
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
  // Sess16 PR-P: placeholder の色を TEXT_MUTED (薄グレー) → TEXT_SECONDARY (中濃) に変更、 視認性改善。
  placeholderText: { color: TEXT_SECONDARY },
  // Sess15 PR-II: 案 a = 灰 circle 32x32 (hitSlop で 44pt 確保) + 白 X icon。
  clearButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: TEXT_MUTED,
  },
});
