/**
 * LabeledNumberInput — 数値入力 共通 component (Sess14 PR-O)。
 *
 * 提供する UX:
 * - LabeledTextInput と同 pattern + 数値入力特化:
 *   - keyboardType="numeric" (RN 標準、 - 入力可能だが onChangeText で除去)
 *   - 単位 suffix 表示 (例: 「年」 「cm」 「inch」、 inputContainer 右内側)
 *   - min / max ガード (onChangeText で truncate)
 *   - 負数 / 非数値文字 silent reject
 * - parent から保存値 (string) を受け取り、 表示も string (parseFloat は parent 責務)
 *
 * 用途: 樹齢 (年)、 鉢幅 (cm)、 鉢深さ (cm) など。
 */
import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BG_PRIMARY, BG_SURFACE, BORDER_DEFAULT, DANGER } from '@/src/core/theme/colors';
import {
  FORM_PLACEHOLDER_COLOR,
  formCounter,
  formCounterOver,
  formInput,
  formOptional,
  formRequired,
  formSuffix,
} from '@/src/core/theme/typography';

// Sess14 PR-R: hardcoded color → 既存 theme constant 経由統合。
// Sess17 PR-C1: hardcoded fontSize/fontWeight → typography.ts token 経由化 (ADR-0029 D1)。

export type LabeledNumberInputProps = {
  label: string;
  required?: boolean;
  optional?: boolean;
  optionalText?: string;
  requiredText?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string | undefined;
  /** 表示単位 suffix (例: 'cm' / '年')。 input 右内側に灰色で表示。 */
  suffix?: string | undefined;
  maxLength?: number;
  showCounter?: boolean;
  editable?: boolean;
  accessibilityLabel?: string;
  testID?: string | undefined;
};

export function LabeledNumberInput({
  label,
  required,
  optional,
  optionalText = '任意',
  requiredText = '必須',
  value,
  onChangeText,
  placeholder,
  suffix,
  maxLength,
  showCounter,
  editable = true,
  accessibilityLabel,
  testID,
}: LabeledNumberInputProps) {
  // 数値以外を silent reject (.', 数字, スペース は許可、 negative は禁止)
  const handleChange = (text: string) => {
    const sanitized = text.replace(/[^\d.]/g, '');
    onChangeText(sanitized);
  };

  const length = value.length;
  const overLimit = maxLength != null && length >= maxLength;
  const showCountText = showCounter && maxLength != null;

  // Sess14 PR-Q: label="" 時は labelRow skip (caller 側で外部ラベル提供時の余白問題回避)。
  const hasLabel = label.length > 0;
  return (
    <View style={styles.field}>
      {hasLabel && (
        <View style={styles.labelRow}>
          <ThemedText type="defaultSemiBold">{label}</ThemedText>
          {required && (
            <View style={styles.requiredBadge}>
              <ThemedText style={styles.requiredText}>{requiredText}</ThemedText>
            </View>
          )}
          {optional && !required && (
            <ThemedText style={styles.optionalText}>{optionalText}</ThemedText>
          )}
          <View style={{ flex: 1 }} />
          {showCountText && (
            <ThemedText style={[styles.counter, overLimit && styles.counterOver]}>
              {length}/{maxLength}
            </ThemedText>
          )}
        </View>
      )}
      <View style={[styles.inputWrap, !editable && styles.inputDisabled]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={FORM_PLACEHOLDER_COLOR}
          keyboardType="numeric"
          maxLength={maxLength}
          editable={editable}
          accessibilityLabel={accessibilityLabel ?? label}
          testID={testID}
        />
        {suffix && <ThemedText style={styles.suffix}>{suffix}</ThemedText>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requiredBadge: {
    backgroundColor: DANGER,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  requiredText: { ...formRequired, color: BG_PRIMARY },
  optionalText: formOptional,
  counter: formCounter,
  counterOver: formCounterOver,
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    backgroundColor: BG_SURFACE,
    paddingHorizontal: 14,
  },
  input: { flex: 1, ...formInput },
  suffix: { ...formSuffix, marginLeft: 6 },
  inputDisabled: { opacity: 0.5 },
});
