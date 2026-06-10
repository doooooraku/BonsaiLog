/**
 * InlineDateRow — 横並び 1 行 日付 picker row (Sess94 PR-B、 ClaudeDesign モック整合)。
 *
 * 設計:
 *   ┌────────────────────────────────────┐
 *   │ {label}       📅 {value or hint} > │
 *   └────────────────────────────────────┘
 *   - row tap → DateTimePicker modal (Native Android / iOS)
 *   - value 表示 = `formatLocalizedDateWithWeekday(value, lang)` で「2026年6月10日 (火)」
 *   - 過去日制限 = `maxToday` (default false、 開始日は未来日 OK)
 *
 * 既存 `LabeledDateRow` (= 縦並び ラベル + input box + バツ) との 使い分け:
 *   - LabeledDateRow: 取得日 / 購入日 等の 「過去日 + バツで clear」 用途
 *   - InlineDateRow: 開始日 / 編集 form 等の 「横並び 1 行 視認性」 用途 (Sess94 議論で 確定)
 *
 * Sess94 PR-B 起票背景:
 *   - ClaudeDesign モック (= 145040/145114/145144) の 開始日 layout = 横並び 1 行
 *   - 既存 RecurrencePicker は LabeledDateRow (= 縦並び ISO 表記) で モックと UI 乖離
 *   - Apple Calendar / Google Calendar / Things 3 全 業界整合 = 横並び layout
 *
 * 用途:
 *   - src/components/form/RecurrencePicker.tsx の startDate row (Sess94 PR-B)
 *   - 将来: BulkLogConfirmScreen の occurred_at row 等 cross-feature 再利用想定
 */
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CalendarIcon } from '@/src/components/icons';
import { nowUtc } from '@/src/core/datetime/clock';
import { formatLocalizedDateWithWeekday } from '@/src/core/datetime/formatLocalized';
import { toLocalDateKey } from '@/src/core/datetime/localDateKey';
import { getTzOffsetMin } from '@/src/core/datetime/tz';
import { useTranslation } from '@/src/core/i18n/i18n';
import { useColors } from '@/src/core/theme/useColors';

export type InlineDateRowProps = {
  /** ラベル文字列 (= caller 提供、 i18n 済) */
  label: string;
  /** YYYY-MM-DD 形式の文字列。 空文字 = 未選択 (placeholder 表示)。 */
  value: string;
  onChangeText: (yyyymmdd: string) => void;
  /** 未選択時の placeholder 文字列 (= caller 提供、 i18n 済) */
  placeholder?: string;
  /** 未来日選択を禁止 (default false、 開始日は未来日 OK)。 */
  maxToday?: boolean;
  disabled?: boolean;
  testID?: string;
};

export function InlineDateRow({
  label,
  value,
  onChangeText,
  placeholder,
  maxToday = false,
  disabled = false,
  testID,
}: InlineDateRowProps) {
  const [show, setShow] = useState(false);
  const c = useColors();
  const { lang } = useTranslation();
  const hasValue = value.length > 0;
  const displayValue = hasValue ? formatLocalizedDateWithWeekday(value, lang) : (placeholder ?? '');

  return (
    <>
      <Pressable
        onPress={() => setShow(true)}
        disabled={disabled}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: c.surface,
            borderColor: c.border,
            opacity: pressed || disabled ? 0.7 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${hasValue ? displayValue : (placeholder ?? '')}`}
        testID={testID}
      >
        <ThemedText style={[styles.label, { color: c.text }]} numberOfLines={1}>
          {label}
        </ThemedText>
        <View style={styles.valueWrap}>
          <CalendarIcon size={18} color={c.textSecondary} />
          <ThemedText
            style={[styles.value, { color: hasValue ? c.text : c.textMuted }]}
            numberOfLines={1}
          >
            {displayValue}
          </ThemedText>
          <ThemedText style={[styles.chevron, { color: c.textSecondary }]}>›</ThemedText>
        </View>
      </Pressable>
      {show ? (
        <DateTimePicker
          value={value ? new Date(value) : new Date(nowUtc() as string)}
          mode="date"
          {...(maxToday ? { maximumDate: new Date(nowUtc() as string) } : {})}
          onChange={(event: DateTimePickerEvent, date?: Date) => {
            setShow(false);
            if (event.type === 'set' && date) {
              // Sess67 fix 同型: ローカル日付 key を 正しく抽出 (= off-by-one 回避)
              onChangeText(toLocalDateKey(date.toISOString(), getTzOffsetMin()));
            }
          }}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 0,
  },
  valueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
  chevron: {
    fontSize: 18,
  },
});
