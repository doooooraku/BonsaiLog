/**
 * LabeledNumberInputUnit — 数値 + 単位切替 segmented + util 連携 統合 atom (Sess17 PR-E2)。
 *
 * ADR-0029 D3 + design_system.md §14 整合。 「数値 + 単位を扱う field」 を 1 atom に統合、
 * 全 form (BonsaiBasicForm 鉢情報 + WorkLog repotting + 将来 wiring 番手 hybrid) で再利用。
 *
 * controlled component (state hoisting):
 * - value (user 入力単位の文字列) は caller が保持
 * - unit も caller が保持 (一時切替の場合は local state、 永続化の場合は settingsStore)
 * - onChangeValue + onChangeUnit で caller に通知
 *
 * 提供する UX:
 * - label + 任意/必須 badge (typography.ts token 経由)
 * - 単位 segmented control (units prop で指定可、 default ['cm', 'mm', 'inch'])
 * - 数値入力 (LabeledNumberInput composer、 keyboardType="numeric"、 silent reject)
 * - suffix に現在 unit を表示 (LabeledNumberInput suffix 経由)
 *
 * 動作モード:
 * - 一時切替モード (default): caller の local state で unit を保持、 settings は touch しない
 * - 永続化モード (settingsStorePath 明示): 将来 settingsStore 連携 (現状未実装、 props 予約)
 *
 * 関連: docs/reference/design_system.md §14 数値+単位 field 規約
 *       src/core/util/unitConvert.ts (LengthUnit + 変換 util)
 *       src/components/form/LabeledNumberInput.tsx (内部 composer)
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BG_PRIMARY, BORDER_DEFAULT, BRAND_GREEN, DANGER, ON_BRAND } from '@/src/core/theme/colors';
import {
  formOptional,
  formRequired,
  formSegmentText,
  formSegmentTextOn,
} from '@/src/core/theme/typography';
import type { LengthUnit } from '@/src/core/util/unitConvert';

import { LabeledNumberInput } from './LabeledNumberInput';

export type LabeledNumberInputUnitProps = {
  label: string;
  /** 現在の値 (user 入力単位の文字列、 caller が保持) */
  value: string;
  /** 現在の単位 (caller が保持) */
  unit: LengthUnit;
  /** 切替可能な単位リスト (default ['cm', 'mm', 'inch']) */
  units?: readonly LengthUnit[];
  /** 値変更時の callback */
  onChangeValue: (next: string) => void;
  /** 単位切替時の callback */
  onChangeUnit: (next: LengthUnit) => void;
  /** 初期値 placeholder (例: '例: 18') */
  placeholder?: string;
  required?: boolean;
  optional?: boolean;
  optionalText?: string;
  requiredText?: string;
  /** suffix を unit 以外に固定したい場合 (例: 樹齢の '年')。 省略時は unit 表示。 */
  suffixOverride?: string;
  testID?: string;
  /** 単位切替 segmented control の testID prefix (各 unit に "_${unit}" 自動付与) */
  testIDUnit?: string;
};

const DEFAULT_UNITS: readonly LengthUnit[] = ['cm', 'mm', 'inch'];

export function LabeledNumberInputUnit({
  label,
  value,
  unit,
  units = DEFAULT_UNITS,
  onChangeValue,
  onChangeUnit,
  placeholder,
  required,
  optional,
  optionalText = '任意',
  requiredText = '必須',
  suffixOverride,
  testID,
  testIDUnit,
}: LabeledNumberInputUnitProps) {
  const hasLabel = label.length > 0;
  const suffix = suffixOverride ?? unit;
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
        </View>
      )}
      {/* 単位切替 segmented control (BonsaiBasicForm pattern 整合)。 */}
      <View style={styles.unitSegmented}>
        {units.map((u) => {
          const active = unit === u;
          return (
            <Pressable
              key={u}
              accessibilityRole="button"
              accessibilityLabel={`unit ${u}`}
              accessibilityState={{ selected: active }}
              style={[styles.unitSegment, active && styles.unitSegmentActive]}
              onPress={() => onChangeUnit(u)}
              testID={testIDUnit ? `${testIDUnit}_${u}` : undefined}
            >
              <ThemedText style={active ? styles.unitSegmentTextActive : styles.unitSegmentText}>
                {u}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <LabeledNumberInput
        label=""
        value={value}
        onChangeText={onChangeValue}
        placeholder={placeholder}
        suffix={suffix}
        accessibilityLabel={label}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8, marginBottom: 18 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requiredBadge: {
    backgroundColor: DANGER,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  requiredText: { ...formRequired, color: BG_PRIMARY },
  optionalText: formOptional,
  // 単位切替 segmented (BonsaiBasicForm L1209-L1226 pattern 整合)
  unitSegmented: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 8,
    overflow: 'hidden',
  },
  unitSegment: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitSegmentActive: { backgroundColor: BRAND_GREEN },
  unitSegmentText: formSegmentText,
  unitSegmentTextActive: { ...formSegmentTextOn, color: ON_BRAND, fontWeight: '600' },
});
