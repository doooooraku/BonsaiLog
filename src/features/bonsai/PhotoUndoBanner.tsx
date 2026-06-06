/**
 * 写真削除 undo Banner (Repolog `ReportEditorScreen` undoBanner 流用)。
 *
 * 削除確定後 5 秒以内に「元に戻す」を押すと state + ファイルが復元される。
 * 5 秒経過 or 別操作で finalize → DB 物理削除 + ファイル削除が走る。
 *
 * Props:
 * - text: バナー本文 (例: 「写真を削除しました」)
 * - actionLabel: アクション文言 (例: 「元に戻す」)
 * - onUndo: タップ時のコールバック (タイマーキャンセル + 復元)
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
// Sess68 PR #C: BG_SURFACE / BORDER_DEFAULT / TEXT_PRIMARY は inline c.* 化、 BRAND_GREEN は brand-static で保持。
import { BRAND_GREEN } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';

type Props = {
  text: string;
  actionLabel: string;
  onUndo: () => void;
};

export function PhotoUndoBanner({ text, actionLabel, onUndo }: Props) {
  const c = useColors();
  return (
    <View
      style={[styles.banner, { backgroundColor: c.surface, borderColor: c.border }]}
      testID="e2e_photo_undo_banner"
    >
      <ThemedText style={[styles.bannerText, { color: c.text }]}>{text}</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        onPress={onUndo}
        testID="e2e_photo_undo_button"
        hitSlop={8}
      >
        <ThemedText style={styles.actionText}>{actionLabel}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND_GREEN,
  },
});
