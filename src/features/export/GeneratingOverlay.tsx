/**
 * F-10 生成中オーバーレイ (Issue #33 / ADR-0016 AC11 Generating + Y2 キャンセル)。
 *
 * CSV / PDF 生成中に中央へ表示する Modal。spinner + 「生成中…」 + キャンセル。
 * ConfirmDialog と同じ fade Modal パターン。生成自体は短時間 (CSV は即時、PDF も数秒)
 * のため、キャンセルは best-effort (呼出側が onCancel で busy を解除し結果を破棄)。
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_PRIMARY,
  BORDER_DEFAULT,
  BRAND_GREEN,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';

type Props = {
  visible: boolean;
  onCancel: () => void;
};

/** 生成開始から「時間がかかっています」を出すまでの待機 (ms)。すぐ終わる時は出さない。 */
const SLOW_HINT_DELAY_MS = 4000;

export function GeneratingOverlay({ visible, onCancel }: Props) {
  const { t } = useTranslation();
  // 多写真 PDF は数十秒かかることがあるため、一定時間経過したら「お待ちください」を追加表示。
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!visible) {
      setSlow(false);
      return;
    }
    const id = setTimeout(() => setSlow(true), SLOW_HINT_DELAY_MS);
    return () => clearTimeout(id);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View
          style={styles.card}
          accessibilityViewIsModal
          accessibilityRole="alert"
          testID="e2e_export_generating_overlay"
        >
          <ActivityIndicator size="large" color={BRAND_GREEN} />
          <ThemedText style={styles.title}>{t('exportGeneratingTitle')}</ThemedText>
          {slow ? (
            <ThemedText style={styles.slowHint} testID="e2e_export_generating_slow_hint">
              {t('exportPdfSlowHint')}
            </ThemedText>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('cancel')}
            onPress={onCancel}
            style={styles.cancel}
            testID="e2e_export_generating_cancel"
          >
            <ThemedText style={styles.cancelText}>{t('cancel')}</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,26,26,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    minWidth: 220,
    backgroundColor: BG_PRIMARY,
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 16,
  },
  title: { fontSize: 16, fontWeight: '500', color: TEXT_PRIMARY },
  slowHint: { fontSize: 13, lineHeight: 19, color: TEXT_SECONDARY, textAlign: 'center' },
  cancel: {
    minHeight: 40,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
  },
  cancelText: { fontSize: 14, color: TEXT_SECONDARY },
});
