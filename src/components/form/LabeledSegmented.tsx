/**
 * LabeledSegmented — Segmented (横並び選択ボタン) 共通 atom (Sess17 PR-E1)。
 *
 * ADR-0029 D3 + design_system.md §12 拡張整合。 WorkLogConfirm 内の
 * 内部 Field component + Segmented inline 実装を吸収、 全 form で typography 統一。
 *
 * 提供する UX:
 * - label + 任意/必須 badge (Labeled* 系と同 pattern、 typography.ts token 経由)
 * - 横並び (flexWrap) segmented control
 * - single selection (string) または multi selection (string[]) 両対応
 * - 選択中: BRAND_GREEN 背景 + ON_BRAND 文字色
 * - 非選択: 透明背景 + BORDER_DEFAULT 枠
 *
 * 流用範囲:
 * - WorkLogConfirm 14 種別の Field (水量 / 剪定タイプ / 切り落とした量 / 番手 /
 *   巻く部位 / 外した部位 / 根の整理 / 肥料種類 / 目的 / 範囲 / 作業内容 / 症状)
 * - 将来の選択肢系 form
 *
 * 用例:
 * <LabeledSegmented
 *   label={t('workLogWaterAmount')}
 *   items={WATER_AMOUNTS.map(v => ({ v, l: t(`workLogWaterAmount_${v}`) }))}
 *   value={waterAmount}
 *   onChange={(v) => setWaterAmount(v)}
 * />
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
// Sess66 PR3: BG_PRIMARY / BORDER_DEFAULT / BRAND_GREEN を StyleSheet から撤去し inline c.* 化
// (dark mode で BORDER_DEFAULT cream border + BRAND_GREEN #1F3A2E 選択 bg が dark 上で
//  浮く / 沈む問題を解消)。 ON_BRAND (白) + DANGER (赤) は theme-invariant ゆえ static 維持。
import { DANGER, ON_BRAND } from '@/src/core/theme/colors';
import {
  formOptional,
  formRequired,
  formSegmentText,
  formSegmentTextOn,
} from '@/src/core/theme/typography';
import { useColors } from '@/src/core/theme/useColors';

// Sess17 PR-E1: typography.ts token 経由 (ADR-0029 D1)。

export type SegmentedItem = {
  /** 内部 value (英字推奨、 onChange に渡される) */
  v: string;
  /** 表示 label (i18n 解決済の文字列、 caller の責務) */
  l: string;
};

export type LabeledSegmentedProps = {
  label: string;
  items: readonly SegmentedItem[];
  /** single の場合 string、 multi の場合 readonly string[] */
  value: string | readonly string[];
  /** single mode: 選択された v を返す、 multi mode: toggle 対象の v を返す */
  onChange: (v: string) => void;
  /** true で multi selection (value は readonly string[])、 default false */
  multi?: boolean;
  required?: boolean;
  optional?: boolean;
  optionalText?: string;
  requiredText?: string;
  testID?: string;
};

export function LabeledSegmented({
  label,
  items,
  value,
  onChange,
  multi = false,
  required,
  optional,
  optionalText = '任意',
  requiredText = '必須',
  testID,
}: LabeledSegmentedProps) {
  // Sess66 PR3: dark mode で segment border / selected bg をテーマ追従させる。
  const c = useColors();
  const hasLabel = label.length > 0;
  return (
    <View style={styles.field} testID={testID}>
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
      <View style={styles.segmented}>
        {items.map((it) => {
          const on = multi ? (value as readonly string[]).includes(it.v) : value === it.v;
          return (
            <Pressable
              key={it.v}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={it.l}
              style={[
                styles.segment,
                {
                  borderColor: on ? c.tint : c.border,
                  backgroundColor: on ? c.tint : 'transparent',
                },
              ]}
              onPress={() => onChange(it.v)}
              testID={testID ? `${testID}_${it.v}` : undefined}
            >
              <ThemedText style={[styles.segmentText, on && styles.segmentTextOn]}>
                {it.l}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
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
  // Sess66 PR3: badge 内白文字は theme-invariant ゆえ ON_BRAND 維持 (旧 BG_PRIMARY = bug)。
  requiredText: { ...formRequired, color: ON_BRAND },
  optionalText: formOptional,
  segmented: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  // Sess66 PR3: borderColor / backgroundColor は inline で c.border / c.tint 動的指定。
  segment: {
    paddingHorizontal: 14,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: formSegmentText,
  segmentTextOn: { ...formSegmentTextOn, color: ON_BRAND },
});
