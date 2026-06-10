/**
 * MemoInputRow — メモ入力欄 common component (Sess93 PR-4)。
 *
 * 200 文字 + 複数行 OK + 既存「もっと見る」 truncate (= EventRow detailed mode で 表示)。
 * 用途:
 *   - RecurrenceFormScreen (= 定期予定 memo、 rule.memo に保存 + events.note へ cascade)
 *   - BulkLogConfirmScreen (= 単発予定 memo、 events.note 直接保存) — PR-5 で 配線
 *
 * 設計:
 *   - controlled component (value/onChange)
 *   - 200 文字 maxLength
 *   - multiline + 自動高さ調整 (= 最低 3 行 ~ 最大 6 行)
 *   - placeholder + 文字数カウント (= UX 整合)
 */
import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import { useColors } from '@/src/core/theme/useColors';

const MEMO_MAX_LENGTH = 200;

export type MemoInputRowProps = {
  value: string;
  onChangeText: (next: string) => void;
  /** placeholder 文字列 (= caller 提供、 i18n 済) */
  placeholder?: string;
  disabled?: boolean;
  testID?: string;
};

export function MemoInputRow({
  value,
  onChangeText,
  placeholder,
  disabled = false,
  testID,
}: MemoInputRowProps) {
  const { t } = useTranslation();
  const c = useColors();

  const handleChangeText = React.useCallback(
    (text: string) => {
      if (disabled) return;
      // maxLength は TextInput で enforce するが、 念のため substring guard
      onChangeText(text.length <= MEMO_MAX_LENGTH ? text : text.substring(0, MEMO_MAX_LENGTH));
    },
    [onChangeText, disabled],
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <ThemedText style={[styles.label, { color: c.text }]}>{t('memoFieldLabel')}</ThemedText>
        <ThemedText style={[styles.optional, { color: c.textSecondary }]}>
          {t('memoFieldOptional')}
        </ThemedText>
      </View>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: c.surface,
            borderColor: c.border,
            color: c.text,
          },
        ]}
        value={value}
        onChangeText={handleChangeText}
        placeholder={placeholder ?? t('memoFieldPlaceholder')}
        placeholderTextColor={c.textMuted}
        multiline
        maxLength={MEMO_MAX_LENGTH}
        editable={!disabled}
        accessibilityLabel={t('memoFieldLabel')}
        testID={testID}
      />
      <ThemedText
        style={[styles.charCount, { color: c.textSecondary }]}
        accessibilityLabel={`${value.length}/${MEMO_MAX_LENGTH}`}
      >
        {value.length}/{MEMO_MAX_LENGTH}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  optional: {
    fontSize: 12,
  },
  input: {
    minHeight: 96,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  charCount: {
    fontSize: 11,
    textAlign: 'right',
  },
});
