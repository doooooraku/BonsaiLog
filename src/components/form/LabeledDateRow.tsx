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
import { toLocalDateKey } from '@/src/core/datetime/localDateKey';
import { getTzOffsetMin } from '@/src/core/datetime/tz';
// Sess95 PR-1: badge は inline c.dangerColor / c.onTint。 ON_BRAND は CloseIcon (tint 上) 用に維持。
// Sess68 統合時に Sess67 TZ fix の toLocalDateKey + getTzOffsetMin import を保持。
import { ON_BRAND } from '@/src/core/theme/colors';
import { formOptional, formRequired } from '@/src/core/theme/typography';
import { useColors } from '@/src/core/theme/useColors';

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
  // Sess65 PR2-c: row bg / border + placeholder color を useColors 動的化。
  const c = useColors();

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <ThemedText type="defaultSemiBold">{label}</ThemedText>
        {required && (
          <View style={[styles.requiredBadge, { backgroundColor: c.dangerColor }]}>
            <ThemedText style={[styles.requiredText, { color: c.onTint }]}>
              {requiredText}
            </ThemedText>
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
          style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => setShow(true)}
          testID={testID}
        >
          <ThemedText style={hasValue ? { color: c.text } : { color: c.textMuted }}>
            {hasValue ? value : placeholder}
          </ThemedText>
        </Pressable>
        {hasValue && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}: clear`}
            style={[styles.clearButton, { backgroundColor: c.textMuted }]}
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
          {...(maxToday ? { maximumDate: new Date(nowUtc() as string) } : {})}
          onChange={(event: DateTimePickerEvent, date?: Date) => {
            setShow(false);
            if (event.type === 'set' && date) {
              // Sess67 fix: native picker が返す date はローカル時刻。 直接 toISOString() で UTC 化すると
              // JST 深夜 (0:00-8:59) に「今日」 を選んでも前日の YYYY-MM-DD になる (off-by-one)。
              // toLocalDateKey(isoUtc, tzOffsetMin) で local 日付キーを正しく抽出する。
              onChangeText(toLocalDateKey(date.toISOString(), getTzOffsetMin()));
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
  // Sess95 PR-1: badge は inline c.dangerColor / c.onTint (dark cascade)。
  requiredBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  requiredText: { ...formRequired },
  optionalText: formOptional,
  rowWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row: {
    flex: 1,
    height: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
  },
  // Sess15 PR-II: 案 a = 灰 circle 32x32 (hitSlop で 44pt 確保) + 白 X icon。
  // Sess66 PR6b: backgroundColor は inline c.textMuted (dark cascade)。
  clearButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
});
