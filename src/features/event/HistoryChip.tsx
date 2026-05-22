/**
 * HistoryChip — Event payload から生成された 1 個の chip を表示 (Issue #296 Phase 2)。
 *
 * display-schema.md v1.3 §「14 作業の表示テンプレート」 整合の chip UI。
 * mockup detail-screens.jsx `_HistoryChip` 整合の見た目 (rounded + thin border +
 * 小さいテキスト、ellipsis 対応)。
 *
 * Sess34 ADR-0041 PR-5: HistoryChipRow に `maxVisible?: number` prop 追加。
 * detailed mode で chip 数を 4 に制限、 超過は末尾「+N」 sentinel chip で省略表示。
 *
 * @see docs/adr/ADR-0041-event-row-display-mode.md D4 (chips max 4 + +N sentinel)
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import { BG_PRIMARY, BORDER_DEFAULT, TEXT_SECONDARY } from '@/src/core/theme/colors';

import type { HistoryChip as HistoryChipData } from './buildHistoryChips';

export function HistoryChip({ chip }: { chip: HistoryChipData }) {
  const { t } = useTranslation();
  const label = chip.labelKey ? t(chip.labelKey) : (chip.text ?? '');
  if (label.length === 0) return null;
  return (
    <View style={styles.chip}>
      <ThemedText style={styles.chipText} numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

/**
 * 「+N」 sentinel chip — chip 数が maxVisible を超えた時、 末尾に省略表示する専用 chip。
 */
function OverflowChip({ count }: { count: number }) {
  return (
    <View style={styles.chip}>
      <ThemedText style={styles.chipText} numberOfLines={1}>{`+${count}`}</ThemedText>
    </View>
  );
}

export type HistoryChipRowProps = {
  chips: HistoryChipData[];
  /**
   * 表示する chip の最大数 (Sess34 ADR-0041 PR-5)。
   * undefined = 制限なし (旧挙動、 bonsai-detail 等の compact mode default)。
   * number = N 個表示 + 超過は末尾「+overflow」 chip で省略表示。
   */
  maxVisible?: number;
};

/**
 * HistoryChipRow — chip 配列を横並びで表示 (折り返しあり)。
 * maxVisible 指定時は N 個表示 + 末尾「+overflow」 chip。
 */
export function HistoryChipRow({ chips, maxVisible }: HistoryChipRowProps) {
  if (chips.length === 0) return null;

  const limit = maxVisible != null && maxVisible > 0 ? maxVisible : chips.length;
  const visible = chips.slice(0, limit);
  const overflow = Math.max(0, chips.length - limit);

  return (
    <View style={styles.row}>
      {visible.map((c, i) => (
        <HistoryChip key={i} chip={c} />
      ))}
      {overflow > 0 && <OverflowChip count={overflow} />}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: BG_PRIMARY,
    maxWidth: 200,
  },
  chipText: { fontSize: 11, color: TEXT_SECONDARY, lineHeight: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
});
