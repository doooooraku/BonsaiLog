/**
 * ConfirmDialog — 破壊的操作 (削除 / アーカイブ / クリア) 用カスタム確認モーダル (ADR-0036 D1)。
 *
 * OS 標準 `Alert.alert` を置換し、 アプリ世界観 (NotoSerifJP + BRAND_GREEN + DANGER) で統一。
 * React Native の `<Modal>` 直接使用 (Tamagui Dialog 不採用、 既存 inline Modal pattern
 * `src/features/bonsai/StylePickerScreen.tsx:159-209` を component 化)。
 *
 * 仕様:
 * - `transparent` + `animationType="fade"` (80ms、 Material 3 Motion duration)
 * - `onRequestClose` で Android Back キャンセル → onCancel
 * - backdrop tap dismiss → onCancel (Material 3 整合、 ADR-0036 明示)
 * - `accessibilityViewIsModal={true}` + `accessibilityRole="alert"` (WAI-ARIA Dialog Pattern + WCAG 2.1.1)
 * - `description` は **optional** (user 真意「desc 不要」 整合、 即削除前提 ADR-0036 D4)
 * - `destructive=true` で confirm button DANGER 赤 (削除等)
 * - onConfirm 直前に `Haptics.notificationAsync(NotificationFeedbackType.Warning)` (R-45 連動)
 *
 * 関連: ADR-0036 D1 / R-44 / `docs/reference/design_system.md` §18 / Material 3 Dialog / Apple HIG Alerts
 */
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useColors } from '@/src/core/theme/useColors';
import {
  BG_SURFACE,
  BRAND_GREEN,
  DANGER,
  ON_BRAND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';

export type ConfirmDialogProps = {
  visible: boolean;
  /** 必須、 question form 推奨 (Apple HIG「Alerts」) */
  title: string;
  /** 任意、 ADR-0036 D4 で即削除前提では省略推奨 */
  description?: string;
  /** confirm button label (例「削除」) */
  confirmLabel: string;
  /** cancel button label、 default は呼出側で t('cancel') 渡す */
  cancelLabel: string;
  /** true で confirm button を DANGER 赤 (削除等) */
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  testID?: string;
};

export function ConfirmDialog({
  visible,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
  testID,
}: ConfirmDialogProps) {
  const c = useColors();

  const handleConfirm = async () => {
    // ADR-0036 D6 / R-45: 削除実行直前の触覚 fb (2 段目)
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await onConfirm();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      accessibilityViewIsModal
    >
      <Pressable
        style={styles.backdrop}
        onPress={onCancel}
        accessibilityRole="alert"
        accessibilityLabel={title}
        testID={testID}
      >
        {/* 内側 card は tap 透過しない (Pressable nested で gesture 独立) */}
        <Pressable
          style={[styles.card, { backgroundColor: c.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          <ThemedText type="defaultSemiBold" style={styles.title}>
            {title}
          </ThemedText>
          {description ? <ThemedText style={styles.description}>{description}</ThemedText> : null}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              style={[styles.button, styles.buttonSecondary]}
              onPress={onCancel}
              testID={testID ? `${testID}_cancel` : undefined}
            >
              <ThemedText style={styles.buttonSecondaryText}>{cancelLabel}</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              style={[styles.button, destructive ? styles.buttonDestructive : styles.buttonPrimary]}
              onPress={handleConfirm}
              testID={testID ? `${testID}_confirm` : undefined}
            >
              <ThemedText style={styles.buttonPrimaryText}>{confirmLabel}</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // StylePickerScreen modalBackdrop 参考、 paddingTop は alert 用途で 120 (中央寄り)
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 120,
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 14,
    padding: 20,
    gap: 14,
  },
  title: { fontSize: 16, color: TEXT_PRIMARY },
  description: { fontSize: 14, color: TEXT_SECONDARY, lineHeight: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  button: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  buttonSecondary: { backgroundColor: BG_SURFACE },
  buttonSecondaryText: { color: TEXT_PRIMARY },
  buttonPrimary: { backgroundColor: BRAND_GREEN },
  buttonDestructive: { backgroundColor: DANGER },
  buttonPrimaryText: { color: ON_BRAND, fontWeight: '600' },
});
