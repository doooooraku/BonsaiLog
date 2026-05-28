/**
 * HistoryChip — Event payload から生成された 1 個の chip を表示 (Issue #296 Phase 2)。
 *
 * Sess34 ADR-0041 Phase θ PR-9 で labeled 形式 (「label: [chip]」) に変更。
 * fieldLabelKey があれば label 部分 + chip 値 部分を 1 行 (vertical block 内) で表示、
 * fieldLabelKey なしなら従来通り chip のみ表示 (compact mode で後方互換)。
 *
 * RTL 配慮: i18n value にコロンを含めず、 component で `${t(key)}:` 結合。
 * これによりアラビア語 / ヘブライ語等 RTL でコロン位置が自動調整される。
 *
 * @see docs/adr/ADR-0041-event-row-display-mode.md §Phase θ 改訂 D4
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import { BG_PRIMARY, BORDER_DEFAULT } from '@/src/core/theme/colors';
import { eventRowChipLabel, eventRowChipText } from '@/src/core/theme/typography';

import type { HistoryChip as HistoryChipData } from './buildHistoryChips';

/**
 * 単一 chip 表示。 fieldLabelKey があれば「label: [chip]」 vertical row 形式、
 * なければ chip のみ (compact mode 後方互換)。
 */
export function HistoryChip({ chip }: { chip: HistoryChipData }) {
  const { t } = useTranslation();
  const baseValue = chip.labelKey ? t(chip.labelKey) : (chip.text ?? '');
  // Sess37 PR-1 C4: valueUnitKey があれば値の後ろに単位 i18n 値を結合 (例: `${1000}${'倍'}` = `1000倍`)
  const valueLabel = chip.valueUnitKey ? `${baseValue}${t(chip.valueUnitKey)}` : baseValue;
  if (valueLabel.length === 0) return null;

  if (chip.fieldLabelKey) {
    // labeled 形式: 「label: [chip]」 を 1 行で表示 (label 薄色 + chip 有色 BG)
    return (
      <View style={styles.labeledRow}>
        <ThemedText style={styles.fieldLabel} numberOfLines={1}>
          {`${t(chip.fieldLabelKey)}:`}
        </ThemedText>
        <View style={styles.chip}>
          <ThemedText style={styles.chipText} numberOfLines={1}>
            {valueLabel}
          </ThemedText>
        </View>
      </View>
    );
  }

  // 後方互換: fieldLabelKey なしは chip のみ (旧 compact 表示)
  return (
    <View style={styles.chip}>
      <ThemedText style={styles.chipText} numberOfLines={1}>
        {valueLabel}
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
  maxVisible?: number | undefined;
};

/**
 * HistoryChipRow — chip 配列を vertical stack で表示 (Phase θ で flexWrap → column 化)。
 *
 * Phase θ 変更点: chip が fieldLabelKey 付き = labeled 形式の時、 1 chip = 1 row で
 * vertical 配置。 旧 flexWrap pattern (compact mode 後方互換) は fieldLabelKey なし時のみ。
 */
export function HistoryChipRow({ chips, maxVisible }: HistoryChipRowProps) {
  if (chips.length === 0) return null;

  const limit = maxVisible != null && maxVisible > 0 ? maxVisible : chips.length;
  const visible = chips.slice(0, limit);
  const overflow = Math.max(0, chips.length - limit);

  // labeled 形式 (fieldLabelKey 付き chip がある) なら vertical stack、 そうでなければ flexWrap row
  const hasLabeledChip = visible.some((c) => c.fieldLabelKey != null);
  const containerStyle = hasLabeledChip ? styles.verticalStack : styles.flexRow;

  return (
    <View style={containerStyle}>
      {visible.map((c, i) => (
        <HistoryChip key={i} chip={c} />
      ))}
      {overflow > 0 && <OverflowChip count={overflow} />}
    </View>
  );
}

const styles = StyleSheet.create({
  // labeled 形式: 1 chip = 1 row (label + chip 横並び)
  labeledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  // Sess37 PR-1 C5: fontSize 11→14 (token 経由)、 minWidth 64 維持 (field label 幅統一)
  fieldLabel: {
    ...eventRowChipLabel,
    minWidth: 64,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: BG_PRIMARY,
    // Sess37 PR-1 C5: maxWidth 200→240 (fontSize 14 化で truncate 防止)
    maxWidth: 240,
  },
  // Sess37 PR-1 C5: fontSize 11→14 (token 経由、 lineHeight 14→20 で可読性 ↑)
  chipText: { ...eventRowChipText },
  // Phase θ 新規: labeled 形式の chip vertical stack
  verticalStack: { flexDirection: 'column', gap: 4, marginTop: 4 },
  // 後方互換: compact 形式の chip flexWrap row
  flexRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
});
