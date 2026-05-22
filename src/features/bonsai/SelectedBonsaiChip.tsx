/**
 * 選択済盆栽 chip 表示 component (Sess31 PR-1 新設、 BulkLogConfirmScreen で利用)。
 *
 * 旧 inline 実装 (BulkLogConfirmScreen.tsx line 222-229) は BonsaiPlaceholder (灰色丸) を併用していたが、
 * Sess31 user 報告で「灰色丸不要」 (chip 内で意味なし) + 「chip 統一 + コンポーネント化」 要求を受け、
 * 本 component に集約 + 灰色丸削除。
 *
 * 用途:
 * - bulk-log-confirm の chips header (「アカシア」「思い出のツバキ」 等の選択済盆栽表示)
 * - 将来 bulk-work-picker / bulk-schedule 等で再利用想定 (現状は 1 箇所のみ)
 *
 * デザイン仕様 (design_system.md §22 Secondary CTA 類似、 ただし button ではなく display chip):
 * - backgroundColor: BG_SURFACE (white)
 * - borderColor: BORDER_DEFAULT
 * - borderRadius: 16 (§5 カード相当)
 * - paddingHorizontal: 12 / paddingVertical: 4
 * - minWidth: 80 (短い名前でも視覚揃え)
 * - maxWidth: 140 (長い名前は ellipsis、 numberOfLines={1})
 * - fontSize: 12 / fontWeight: 500 / color: TEXT_PRIMARY
 *
 * @see docs/reference/tasks/lessons/sess30-retro.md (Sess30 → Sess31 設計議論)
 * @see src/features/event/BulkLogConfirmScreen.tsx (利用箇所)
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BG_SURFACE, BORDER_DEFAULT, TEXT_PRIMARY } from '@/src/core/theme/colors';

type Props = {
  /** 表示する盆栽名 (例: 「アカシア」「思い出のツバキ」) */
  name: string;
  testID?: string;
};

export function SelectedBonsaiChip({ name, testID }: Props) {
  return (
    <View style={styles.chip} testID={testID}>
      <ThemedText style={styles.chipText} numberOfLines={1}>
        {name}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: BG_SURFACE,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    minWidth: 80,
    maxWidth: 140,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT_PRIMARY,
    flexShrink: 1,
    textAlign: 'center',
  },
});
