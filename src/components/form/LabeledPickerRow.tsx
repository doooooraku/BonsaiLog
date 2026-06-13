/**
 * LabeledPickerRow — picker row 用共通 component (Sess14 PR-M)。
 *
 * 提供する UX (Q-12 a 仕様 + 残課題④):
 * - Label + 任意/必須 badge
 * - Pressable row (tap で picker 画面遷移)
 * - 選択中: row 右端に「×」 (clear button、 排他的に ChevronRight 非表示)
 * - 未選択: row 右端に「›」 (ChevronRight、 排他的に × 非表示)
 * - placeholder: 未選択時の表示文 (default '―')
 *
 * 用途: BonsaiBasicForm の 樹種 / 樹形 (DatePicker と同 pattern 統一)。
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChevronRightIcon, CloseIcon } from '@/src/components/icons';
// Sess66 PR6b: TEXT_MUTED は inline c.textMuted で動的指定 (dark cascade)。
import { ON_BRAND } from '@/src/core/theme/colors';
import { formOptional } from '@/src/core/theme/typography';
import { useColors } from '@/src/core/theme/useColors';

// Sess17 PR-C1: hardcoded fontSize/fontWeight → typography.ts token 経由化 (ADR-0029 D1)。

export type LabeledPickerRowProps = {
  label: string;
  optional?: boolean;
  optionalText?: string;
  /** 選択中の表示テキスト (null/undefined = 未選択)。 */
  valueText?: string | null;
  /** 未選択時の placeholder (default '―')。 */
  placeholder?: string;
  /** row tap (picker 画面遷移など)。 */
  onPress: () => void;
  /** × tap (未選択に戻す)。 渡されない場合は × 非表示。 */
  onClear?: () => void;
  testID?: string;
  testIDClear?: string;
};

export function LabeledPickerRow({
  label,
  optional,
  optionalText,
  valueText,
  placeholder = '―',
  onPress,
  onClear,
  testID,
  testIDClear,
}: LabeledPickerRowProps) {
  const hasValue = valueText != null && valueText.length > 0;
  // Sess65 PR2-c: row bg / border / placeholder / chevron を useColors 動的化。
  const c = useColors();

  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <ThemedText type="defaultSemiBold">{label}</ThemedText>
        {optional && optionalText && (
          <ThemedText style={styles.optionalText}>{optionalText}</ThemedText>
        )}
      </View>
      <View style={styles.rowWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={onPress}
          testID={testID}
        >
          <ThemedText style={hasValue ? { color: c.text } : { color: c.textMuted }}>
            {hasValue ? valueText : placeholder}
          </ThemedText>
          {!hasValue && <ChevronRightIcon size={20} color={c.textMuted} />}
        </Pressable>
        {hasValue && onClear && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}: clear`}
            style={[styles.clearButton, { backgroundColor: c.textMuted }]}
            hitSlop={6}
            onPress={onClear}
            testID={testIDClear}
          >
            {/* Sess15 PR-II: 案 a = 灰 circle 背景 + 白 X (Material chip remove 風、 tap target 明示)。 */}
            <CloseIcon size={14} color={ON_BRAND} strokeWidth={2.5} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionalText: formOptional,
  rowWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row: {
    flex: 1,
    height: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
