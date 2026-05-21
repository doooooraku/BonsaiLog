/**
 * RowActionMenu — list row 右端 kebab (⋮) 起動の bottom sheet 風 ActionMenu (ADR-0036 D7)。
 *
 * iOS HIG Action Sheet / Material 3 Bottom Sheet 整合。 react-native Modal + slide-up animation +
 * 上余白 backdrop tap dismiss。 items 配列で動的に menu 構築 (例: planned = 「削除」 + 「全 N 件を記録」、
 * logged = 「削除」 のみ)。
 *
 * 仕様:
 * - `transparent` + `animationType="slide"` (下から slide-up)
 * - `onRequestClose` で Android Back キャンセル → onDismiss
 * - 上余白 backdrop tap dismiss
 * - items に `destructive: true` の場合 DANGER 赤文字 (削除等)
 * - 各 item tap で `onPress` 実行 + 自動 dismiss
 * - `accessibilityViewIsModal` + `accessibilityRole="menu"`
 *
 * 関連: ADR-0036 D7 / `docs/reference/design_system.md` §18 / Material 3 Bottom Sheet / iOS HIG Action Sheet
 */
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useColors } from '@/src/core/theme/useColors';
import { BG_SURFACE, BORDER_DEFAULT, DANGER, TEXT_PRIMARY } from '@/src/core/theme/colors';

export type RowActionMenuItem = {
  /** unique key (React list rendering 用) */
  key: string;
  /** menu に表示する label (呼出側で i18n 解決済の string を渡す) */
  label: string;
  /** true で DANGER 赤文字 (削除等) */
  destructive?: boolean;
  /** tap で実行、 menu は自動 dismiss */
  onPress: () => void | Promise<void>;
  testID?: string;
};

export type RowActionMenuProps = {
  visible: boolean;
  items: readonly RowActionMenuItem[];
  onDismiss: () => void;
  testID?: string;
};

export function RowActionMenu({ visible, items, onDismiss, testID }: RowActionMenuProps) {
  const c = useColors();

  const handleItemPress = async (item: RowActionMenuItem) => {
    onDismiss();
    await item.onPress();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
      accessibilityViewIsModal
    >
      <Pressable
        style={styles.backdrop}
        onPress={onDismiss}
        accessibilityRole="menu"
        testID={testID}
      >
        {/* 内側 sheet は tap 透過しない */}
        <Pressable
          style={[styles.sheet, { backgroundColor: c.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          {items.map((item, idx) => (
            <Pressable
              key={item.key}
              accessibilityRole="menuitem"
              accessibilityLabel={item.label}
              style={[styles.item, idx > 0 && styles.itemBordered]}
              onPress={() => handleItemPress(item)}
              testID={item.testID}
            >
              <ThemedText style={[styles.itemText, item.destructive && styles.itemTextDestructive]}>
                {item.label}
              </ThemedText>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // 下端寄せ (Material 3 Bottom Sheet 整合)、 backdrop 半透明
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingVertical: 8,
    paddingBottom: 24,
  },
  item: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: BG_SURFACE,
  },
  itemBordered: {
    borderTopWidth: 1,
    borderTopColor: BORDER_DEFAULT,
  },
  itemText: { fontSize: 16, color: TEXT_PRIMARY, fontWeight: '500' },
  itemTextDestructive: { color: DANGER },
});
