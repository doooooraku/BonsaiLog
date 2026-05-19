/**
 * LabeledTextInput — 共通 TextInput component (Sess13 PR-K)。
 *
 * 提供する UX (mockup + user Q-8 a 仕様):
 * - ラベル (必須/任意 badge オプション)
 * - 右上に文字数 (N/MAX) 表示 (showCounter prop)
 * - maxLength 到達時 inline「あと 0 文字 (上限到達)」 赤字表示 (user Q-8 a)
 * - 通常 / multiline 両対応 (numberOfLines / multiline prop で切替)
 * - keyboardType 渡し可能 (numeric / number-pad / default)
 *
 * 用途: BonsaiBasicForm の名前 / 入手元 / 鉢材質 / メモ / 鉢幅 / 鉢深さ など。
 */
import React from 'react';
import { StyleSheet, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BG_SURFACE, BORDER_DEFAULT, TEXT_MUTED } from '@/src/core/theme/colors';

const OVERLIMIT_COLOR = '#C62828';
const REQUIRED_BG_LOCAL = '#8B2E2E';
const REQUIRED_TEXT_LOCAL = '#F7F3E8';

export type LabeledTextInputProps = {
  label: string;
  /** 必須項目バッジを表示するか */
  required?: boolean;
  /** 任意項目 (灰色) を表示するか (required と排他、 false default) */
  optional?: boolean;
  optionalText?: string;
  requiredText?: string;
  /** 上限到達警告文 (例: 'あと 0 文字 (上限到達)')。 渡されないと自動生成。 */
  overlimitText?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  /** N/MAX 文字数表示を右上に出すか (maxLength 必須) */
  showCounter?: boolean;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  numberOfLines?: number;
  editable?: boolean;
  accessibilityLabel?: string;
  testID?: string;
};

export function LabeledTextInput({
  label,
  required,
  optional,
  optionalText = '任意',
  requiredText = '必須',
  overlimitText,
  value,
  onChangeText,
  placeholder,
  maxLength,
  showCounter,
  keyboardType,
  multiline,
  numberOfLines,
  editable = true,
  accessibilityLabel,
  testID,
}: LabeledTextInputProps) {
  const length = value.length;
  const overLimit = maxLength != null && length >= maxLength;
  const showCountText = showCounter && maxLength != null;

  // Sess14 PR-Q: label="" の場合 labelRow skip (caller 側で外部ラベル提供時の余白問題回避)。
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
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          overLimit && styles.inputOverLimit,
          !editable && styles.inputDisabled,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        maxLength={maxLength}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : 'auto'}
        editable={editable}
        accessibilityLabel={accessibilityLabel ?? label}
        testID={testID}
      />
      {overLimit && (
        <ThemedText style={styles.overlimitText}>
          {overlimitText ?? `${maxLength}文字に達しました`}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requiredBadge: {
    backgroundColor: REQUIRED_BG_LOCAL,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  requiredText: { fontSize: 10, color: REQUIRED_TEXT_LOCAL, letterSpacing: 0.8 },
  optionalText: { fontSize: 10, color: TEXT_MUTED, letterSpacing: 0.8 },
  counter: { fontSize: 12, color: TEXT_MUTED },
  counterOver: { color: OVERLIMIT_COLOR, fontWeight: '600' },
  input: {
    height: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    backgroundColor: BG_SURFACE,
    fontSize: 16,
  },
  inputMultiline: { minHeight: 96, paddingVertical: 12 },
  inputOverLimit: { borderColor: OVERLIMIT_COLOR },
  inputDisabled: { opacity: 0.5 },
  overlimitText: { fontSize: 12, color: OVERLIMIT_COLOR },
});
