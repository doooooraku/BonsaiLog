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
import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type NativeSyntheticEvent,
  type TextInputContentSizeChangeEventData,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BG_PRIMARY, DANGER, OVERLIMIT } from '@/src/core/theme/colors';
import {
  formCounter,
  formCounterOver,
  formInput,
  formOptional,
  formRequired,
} from '@/src/core/theme/typography';
import { useColors } from '@/src/core/theme/useColors';

// Sess14 PR-R: hardcoded color → 既存 theme constant 経由に統合。
// Sess17 PR-C1: hardcoded fontSize/fontWeight → typography.ts token 経由化 (ADR-0029 D1)。

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
  /**
   * Sess31 PR-1 (R-46 拡張): TextInput focus 時 callback。
   * 親 ScrollView で `scrollToEnd()` 等を呼び、 IME 起動時の input 可視性を確保する用途。
   * @see .claude/recurrence-prevention/specialized.md R-46 (KAV + auto-scroll 2 点セット必須)
   */
  onFocus?: (() => void) | undefined;
};

/**
 * Sess32 PR-1 (R-46 v3 拡張): forwardRef 化、 内部 TextInput の ref を expose。
 * 親が `inputRef.current?.measureLayout(scrollNode, ...)` で precise scroll を実装する用途。
 * @see .claude/recurrence-prevention/specialized.md R-46 v3 (中盤 input は measureLayout 必須)
 */
export const LabeledTextInput = forwardRef<TextInput, LabeledTextInputProps>(
  function LabeledTextInput(
    {
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
      onFocus,
    },
    ref,
  ) {
    const length = value.length;
    const overLimit = maxLength != null && length >= maxLength;
    const showCountText = showCounter && maxLength != null;
    // Sess65 PR2-c: input bg / border / text / placeholder の static 色を useColors 動的化。
    // bonsai-create form 等で「dark BG container + 白入力欄 + 黒文字」 で背景と input が乖離して
    // いた問題 (Pattern B) を解消。
    const c = useColors();
    const hasLabel = label.length > 0;

    // Sess15 PR-TT: multiline auto-grow (Q18 H1 採用)。
    // minHeight = 96 (4 行)、 maxHeight = 380 (約 16 行) で上限制御、 超過は内部 scroll。
    const MULTILINE_MIN_HEIGHT = 96;
    const MULTILINE_MAX_HEIGHT = 380;
    const [contentHeight, setContentHeight] = useState<number>(MULTILINE_MIN_HEIGHT);
    const handleContentSizeChange = (
      e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>,
    ) => {
      if (!multiline) return;
      const next = Math.min(
        MULTILINE_MAX_HEIGHT,
        Math.max(MULTILINE_MIN_HEIGHT, e.nativeEvent.contentSize.height + 16),
      );
      setContentHeight(next);
    };
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
          ref={ref}
          style={[
            styles.input,
            { backgroundColor: c.surface, borderColor: c.border, color: c.text },
            multiline && styles.inputMultiline,
            // Sess15 PR-TT: multiline auto-grow (動的高さ)。
            multiline && { height: contentHeight },
            overLimit && styles.inputOverLimit,
            !editable && styles.inputDisabled,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.textMuted}
          maxLength={maxLength}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : 'auto'}
          editable={editable}
          accessibilityLabel={accessibilityLabel ?? label}
          testID={testID}
          onContentSizeChange={handleContentSizeChange}
          onFocus={onFocus}
        />
        {overLimit && (
          <ThemedText style={styles.overlimitText}>
            {overlimitText ?? `${maxLength}文字に達しました`}
          </ThemedText>
        )}
      </View>
    );
  },
);

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
  input: {
    height: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 12,
    ...formInput,
  },
  inputMultiline: { minHeight: 96, paddingVertical: 12 },
  inputOverLimit: { borderColor: OVERLIMIT },
  inputDisabled: { opacity: 0.5 },
  overlimitText: { ...formCounter, color: OVERLIMIT },
});
