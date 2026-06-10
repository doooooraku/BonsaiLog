/**
 * WeekdaySelector — 曜日 multi-select picker (Sess93 PR-3、 ADR-0056 Sess93 Amendment 整合)。
 *
 * 「毎週 + 任意曜日」 を 表すための 7 曜日 (日月火水木金土) toggle UI。
 * value = 曜日番号配列 (= 0=Sun 〜 6=Sat、 JavaScript Date.getDay() 互換)。
 * 内部で BYDAY 文字列は扱わず、 caller が `buildWeeklyByDayRrule(value)` で RRULE 化する。
 *
 * 使用箇所:
 *   - src/components/form/RecurrencePicker.tsx (= preset='weekly' 選択時のみ表示)
 *   - 将来: 単発予定 曜日指定 / 通知曜日設定 等 cross-feature 再利用想定
 *
 * 設計:
 *   - controlled component (props で state、 onChange で変更通知)
 *   - tap で toggle (= 既に含まれていれば remove、 含まれていなければ add)
 *   - dark mode: c.tint / c.tintSubtle / c.text scheme-aware token 経由
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
import { useColors } from '@/src/core/theme/useColors';

type WeekdayEntry = { value: number; labelKey: TranslationKey };

/** 曜日番号 (0=Sun 〜 6=Sat) と i18n key の対応 (Sess93 PR-3)。 */
const WEEKDAYS: readonly WeekdayEntry[] = [
  { value: 0, labelKey: 'weekdaySunShort' },
  { value: 1, labelKey: 'weekdayMonShort' },
  { value: 2, labelKey: 'weekdayTueShort' },
  { value: 3, labelKey: 'weekdayWedShort' },
  { value: 4, labelKey: 'weekdayThuShort' },
  { value: 5, labelKey: 'weekdayFriShort' },
  { value: 6, labelKey: 'weekdaySatShort' },
];

export type WeekdaySelectorProps = {
  /** 選択中の曜日番号配列 (= 0-6)、 空配列 = 何も選択していない (= 開始日基準 weekly) */
  value: readonly number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
  /** testID prefix (= `${prefix}_${0..6}` で 個別 button testID 生成) */
  testIdPrefix?: string;
};

export function WeekdaySelector({
  value,
  onChange,
  disabled = false,
  testIdPrefix,
}: WeekdaySelectorProps) {
  const { t } = useTranslation();
  const c = useColors();

  const selectedSet = React.useMemo(() => new Set(value), [value]);

  const toggleWeekday = React.useCallback(
    (day: number) => {
      if (disabled) return;
      const next = new Set(selectedSet);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      onChange(Array.from(next).sort((a, b) => a - b));
    },
    [selectedSet, onChange, disabled],
  );

  return (
    <View style={styles.row}>
      {WEEKDAYS.map((wd) => {
        const isSelected = selectedSet.has(wd.value);
        return (
          <Pressable
            key={wd.value}
            onPress={() => toggleWeekday(wd.value)}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: isSelected ? c.tint : c.surface,
                borderColor: isSelected ? c.tint : c.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected, disabled }}
            accessibilityLabel={t(wd.labelKey)}
            disabled={disabled}
            testID={testIdPrefix !== undefined ? `${testIdPrefix}_${wd.value}` : undefined}
          >
            <ThemedText
              style={[styles.label, { color: isSelected ? c.onTint : c.text }]}
              numberOfLines={1}
            >
              {t(wd.labelKey)}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    minWidth: 36,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
