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
import { BG_SURFACE, BORDER_DEFAULT, TEXT_MUTED } from '@/src/core/theme/colors';

const OVERLIMIT_COLOR = '#C62828';

export type LabeledNumberInputProps = {
  label: string;
  required?: boolean;
  optional?: boolean;
  optionalText?: string;
  requiredText?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** 表示単位 suffix (例: 'cm' / '年')。 input 右内側に灰色で表示。 */
  suffix?: string;
  maxLength?: number;
  showCounter?: boolean;
  editable?: boolean;
  accessibilityLabel?: string;
  testID?: string;
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

  return (
    <View style={styles.field}>
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
      <View style={[styles.inputWrap, !editable && styles.inputDisabled]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
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
    backgroundColor: '#8B2E2E',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  requiredText: { fontSize: 10, color: '#F7F3E8', letterSpacing: 0.8 },
  optionalText: { fontSize: 10, color: TEXT_MUTED, letterSpacing: 0.8 },
  counter: { fontSize: 12, color: TEXT_MUTED },
  counterOver: { color: OVERLIMIT_COLOR, fontWeight: '600' },
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
  input: { flex: 1, fontSize: 16 },
  suffix: { fontSize: 14, color: TEXT_MUTED, marginLeft: 6 },
  inputDisabled: { opacity: 0.5 },
});
