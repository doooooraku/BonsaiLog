/**
 * LabeledNumberSegmentOrFree — Hybrid input atom (Sess17 PR-E3、 ADR-0029 D4)。
 *
 * pre-defined 選択肢 + 「その他」 で free input 出現する hybrid pattern。
 * design_system.md §15 整合: シニアペルソナは pre-defined のみで完結、 業務プロは
 * 「その他」 で自由入力、 4 ペルソナすべて満足する pattern。
 *
 * controlled component (state hoisting):
 * - value は string (segment 内なら segment.value、 「その他」 選択中は free input の数値文字列)
 * - onChangeValue で caller に通知
 *
 * 動作:
 * - segments 内のいずれかが value と一致: 該当 segment が highlighted
 * - 一致しない (空文字 含む): 末尾 「その他」 segment が highlighted、 直下に LabeledNumberInput
 *   表示 (freeUnit があれば suffix 表示)
 * - segment tap: value = segment.value で onChange
 * - 「その他」 segment tap: value = '' (free input が空欄で開く)
 * - 「その他」 中の数値入力: value = input 文字列 で onChange
 *
 * 流用範囲:
 * - WorkLog wiring 番手 (1mm / 1.5mm / 2mm / 2.5mm / 3mm / その他 → free input)
 * - 将来の数値選択 hybrid field
 *
 * 関連: docs/reference/design_system.md §15 Hybrid input pattern
 *       src/components/form/LabeledNumberInput.tsx (内部 composer)
 *       src/components/form/LabeledSegmented.tsx (関連 atom、 segment 表示の design 整合)
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
// Sess66 PR3: BG_PRIMARY / BORDER_DEFAULT / BRAND_GREEN を StyleSheet から撤去し inline c.* 化。
import {
  formOptional,
  formRequired,
  formSegmentText,
  formSegmentTextOn,
} from '@/src/core/theme/typography';
import { useColors } from '@/src/core/theme/useColors';

import { LabeledNumberInput } from './LabeledNumberInput';

export type SegmentItem = {
  /** 内部 value (例: '1mm') */
  value: string;
  /** 表示 label (例: '1mm') */
  label: string;
};

export type LabeledNumberSegmentOrFreeProps = {
  label: string;
  /** pre-defined segments (末尾に自動で「その他」 が追加される) */
  segments: readonly SegmentItem[];
  /** 現在の値 (segment.value または free input の文字列) */
  value: string;
  /** 値変更時の callback */
  onChangeValue: (v: string) => void;
  /** 「その他」 segment の label (default 'その他') */
  freeLabel?: string;
  /** free input の単位 suffix (例: 'mm') */
  freeUnit?: string;
  /** free input の placeholder */
  freePlaceholder?: string;
  required?: boolean;
  optional?: boolean;
  optionalText?: string;
  requiredText?: string;
  testID?: string;
};

export function LabeledNumberSegmentOrFree({
  label,
  segments,
  value,
  onChangeValue,
  freeLabel = 'その他',
  freeUnit,
  freePlaceholder,
  required,
  optional,
  optionalText = '任意',
  requiredText = '必須',
  testID,
}: LabeledNumberSegmentOrFreeProps) {
  // Sess66 PR3: segment border + selected bg をテーマ追従。
  const c = useColors();
  const isFree = !segments.some((s) => s.value === value);
  const hasLabel = label.length > 0;
  return (
    <View style={styles.field}>
      {hasLabel && (
        <View style={styles.labelRow}>
          <ThemedText type="defaultSemiBold">{label}</ThemedText>
          {required && (
            <View style={[styles.requiredBadge, { backgroundColor: c.dangerColor }]}>
              <ThemedText style={[styles.requiredText, { color: c.onTint }]}>
                {requiredText}
              </ThemedText>
            </View>
          )}
          {optional && !required && (
            <ThemedText style={styles.optionalText}>{optionalText}</ThemedText>
          )}
        </View>
      )}
      <View style={styles.segmented}>
        {segments.map((s) => {
          const on = value === s.value;
          return (
            <Pressable
              key={s.value}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={s.label}
              style={[
                styles.segment,
                {
                  borderColor: on ? c.tint : c.border,
                  backgroundColor: on ? c.tint : 'transparent',
                },
              ]}
              onPress={() => onChangeValue(s.value)}
              testID={testID ? `${testID}_${s.value}` : undefined}
            >
              <ThemedText
                style={[styles.segmentText, on && [styles.segmentTextOn, { color: c.onTint }]]}
              >
                {s.label}
              </ThemedText>
            </Pressable>
          );
        })}
        {/* 「その他」 segment (末尾、 free input への切替) */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: isFree }}
          accessibilityLabel={freeLabel}
          style={[
            styles.segment,
            {
              borderColor: isFree ? c.tint : c.border,
              backgroundColor: isFree ? c.tint : 'transparent',
            },
          ]}
          onPress={() => {
            // free 選択時は value を '' にして free input を空欄で開く
            // (segment 内のいずれの値とも一致しない状態にする)
            if (!isFree) onChangeValue('');
          }}
          testID={testID ? `${testID}_free` : undefined}
        >
          <ThemedText
            style={[styles.segmentText, isFree && [styles.segmentTextOn, { color: c.onTint }]]}
          >
            {freeLabel}
          </ThemedText>
        </Pressable>
      </View>
      {/* 「その他」 選択中のみ free input 表示 */}
      {isFree && (
        <View style={styles.freeInputWrap}>
          <LabeledNumberInput
            label=""
            value={value}
            onChangeText={onChangeValue}
            placeholder={freePlaceholder}
            suffix={freeUnit}
            accessibilityLabel={`${label} (${freeLabel})`}
            testID={testID ? `${testID}_free_input` : undefined}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8, marginBottom: 18 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requiredBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  // Sess95 PR-1: badge は inline c.dangerColor 背景 + c.onTint 文字 (dark cascade、 dark で明赤×墨文字)。
  requiredText: { ...formRequired },
  optionalText: formOptional,
  segmented: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  segment: {
    paddingHorizontal: 14,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: formSegmentText,
  // Sess69 PR-B: color は inline c.onTint (scheme-aware: light #FFFFFF / dark #1A1A1A sumi)。
  segmentTextOn: formSegmentTextOn,
  freeInputWrap: { marginTop: 4 },
});
