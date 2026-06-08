/**
 * RecurrencePicker — 定期予定の繰り返しパターン選択 component (Sess78 PR-4、 ADR-0056 D4)。
 *
 * Apple Reminders 風 6 preset + 終了日 3 択 (default = 1 年後)。
 * 予定追加画面 (BulkLogConfirmScreen schedule mode) で `enabled=true` 時のみ表示。
 *
 * 設計:
 * - controlled component (props で state を受け取り、 変更時に onChange 通知)
 * - ADR-0011 哲学厳守: 文言は中立表現のみ、 「べき」「お忘れなく」 NG
 * - dark mode: c.tint / c.tintSubtle / c.text scheme-aware token のみ使用
 *
 * Pro 境界 (ADR-0049 ⑦ / ADR-0056 D7) は caller (BulkLogConfirmScreen) で 制御、
 * 本 component は表示と値変更のみ責務。
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LabeledDateRow } from '@/src/components/form/LabeledDateRow';
import { useTranslation, type TranslationKey } from '@/src/core/i18n/i18n';
import { useColors } from '@/src/core/theme/useColors';
import { RECURRENCE_PRESETS, type RecurrencePresetKey } from '@/src/core/recurrence/rrule';

export type RecurrenceEndType = 'oneYear' | 'specific' | 'never';

export type RecurrenceValue = {
  enabled: boolean;
  preset: RecurrencePresetKey;
  endType: RecurrenceEndType;
  endDate: string | null; // YYYY-MM-DD、 endType='specific' 時のみ使用
};

export const DEFAULT_RECURRENCE_VALUE: RecurrenceValue = {
  enabled: false,
  preset: 'weeklyMonday',
  endType: 'oneYear',
  endDate: null,
};

type Props = {
  value: RecurrenceValue;
  onChange: (next: RecurrenceValue) => void;
  /** disabled 時は visual に grayout + tap 無効化 (Pro 境界 Paywall trigger は caller 責務) */
  disabled?: boolean;
};

const PRESET_ORDER: readonly { key: RecurrencePresetKey; labelKey: TranslationKey }[] = [
  { key: 'daily', labelKey: 'recurringPresetDaily' },
  { key: 'weeklyMonday', labelKey: 'recurringPresetWeeklyMonday' },
  { key: 'weekly', labelKey: 'recurringPresetWeekly' },
  { key: 'biweekly', labelKey: 'recurringPresetBiweekly' },
  { key: 'monthly', labelKey: 'recurringPresetMonthly' },
  { key: 'every3Months', labelKey: 'recurringPresetCustom' },
];

const END_TYPE_ORDER: readonly { key: RecurrenceEndType; labelKey: TranslationKey }[] = [
  { key: 'oneYear', labelKey: 'recurringEndDateOneYear' },
  { key: 'specific', labelKey: 'recurringEndDateSpecific' },
  { key: 'never', labelKey: 'recurringEndDateNever' },
];

export function RecurrencePicker({ value, onChange, disabled = false }: Props) {
  const { t } = useTranslation();
  const c = useColors();

  const handleToggle = React.useCallback(() => {
    if (disabled) return;
    onChange({ ...value, enabled: !value.enabled });
  }, [value, onChange, disabled]);

  const handlePresetSelect = React.useCallback(
    (preset: RecurrencePresetKey) => {
      if (disabled) return;
      onChange({ ...value, preset });
    },
    [value, onChange, disabled],
  );

  const handleEndTypeSelect = React.useCallback(
    (endType: RecurrenceEndType) => {
      if (disabled) return;
      onChange({ ...value, endType, endDate: endType === 'specific' ? value.endDate : null });
    },
    [value, onChange, disabled],
  );

  const handleEndDateChange = React.useCallback(
    (endDate: string) => {
      if (disabled) return;
      onChange({ ...value, endDate });
    },
    [value, onChange, disabled],
  );

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handleToggle}
        style={({ pressed }) => [
          styles.toggleRow,
          {
            backgroundColor: value.enabled ? c.tintSubtle : c.surface,
            borderColor: value.enabled ? c.tint : c.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
        accessibilityRole="switch"
        accessibilityState={{ checked: value.enabled, disabled }}
        accessibilityLabel={t('recurringPickerToggle')}
        disabled={disabled}
        testID="e2e_recurrence_picker_toggle"
      >
        <ThemedText style={[styles.toggleLabel, { color: c.text }]}>
          {`🔁 ${t('recurringPickerToggle')}`}
        </ThemedText>
        <ThemedText style={[styles.toggleState, { color: value.enabled ? c.tint : c.textMuted }]}>
          {value.enabled ? 'ON' : 'OFF'}
        </ThemedText>
      </Pressable>

      {value.enabled ? (
        <View style={styles.expandedContent}>
          <ThemedText style={[styles.sectionLabel, { color: c.text }]}>
            {t('recurringPickerToggle')}
          </ThemedText>
          <View style={styles.presetGroup}>
            {PRESET_ORDER.map((preset) => {
              const isSelected = value.preset === preset.key;
              return (
                <Pressable
                  key={preset.key}
                  onPress={() => handlePresetSelect(preset.key)}
                  style={({ pressed }) => [
                    styles.presetChip,
                    {
                      backgroundColor: isSelected ? c.tintSubtle : c.surface,
                      borderColor: isSelected ? c.tint : c.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected, disabled }}
                  disabled={disabled}
                  testID={`e2e_recurrence_picker_preset_${preset.key}`}
                >
                  <ThemedText style={[styles.presetLabel, { color: isSelected ? c.tint : c.text }]}>
                    {t(preset.labelKey)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <ThemedText style={[styles.sectionLabel, { color: c.text }]}>
            {RECURRENCE_PRESETS[value.preset]}
          </ThemedText>

          <View style={styles.endTypeGroup}>
            {END_TYPE_ORDER.map((endType) => {
              const isSelected = value.endType === endType.key;
              return (
                <Pressable
                  key={endType.key}
                  onPress={() => handleEndTypeSelect(endType.key)}
                  style={({ pressed }) => [
                    styles.presetChip,
                    {
                      backgroundColor: isSelected ? c.tintSubtle : c.surface,
                      borderColor: isSelected ? c.tint : c.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected, disabled }}
                  disabled={disabled}
                  testID={`e2e_recurrence_picker_endtype_${endType.key}`}
                >
                  <ThemedText style={[styles.presetLabel, { color: isSelected ? c.tint : c.text }]}>
                    {t(endType.labelKey)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {value.endType === 'specific' ? (
            <LabeledDateRow
              label={t('recurringEndDateSpecific')}
              value={value.endDate ?? ''}
              onChangeText={handleEndDateChange}
              testID="e2e_recurrence_picker_enddate"
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  toggleState: {
    fontSize: 14,
    fontWeight: '600',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  presetGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  endTypeGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});
