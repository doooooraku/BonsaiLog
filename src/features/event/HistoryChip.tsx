/**
 * HistoryChip — Event payload から生成された 1 個の chip を表示 (Issue #296 Phase 2)。
 *
 * display-schema.md v1.3 §「14 作業の表示テンプレート」 整合の chip UI。
 * mockup detail-screens.jsx `_HistoryChip` 整合の見た目 (rounded + thin border +
 * 小さいテキスト、ellipsis 対応)。
 *
 * Phase 3 で HistoryTab の events.map ループ内で `buildHistoryChips(ev)` の
 * 結果を本 component で render する。
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
 * HistoryChipRow — chip 配列を横並びで表示 (折り返しあり)。
 */
export function HistoryChipRow({ chips }: { chips: HistoryChipData[] }) {
  if (chips.length === 0) return null;
  return (
    <View style={styles.row}>
      {chips.map((c, i) => (
        <HistoryChip key={i} chip={c} />
      ))}
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
