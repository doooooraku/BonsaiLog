import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  BonsaiBasicFormFields,
  type BonsaiBasicFormState,
} from '@/src/features/bonsai/BonsaiBasicForm';
import { useTranslation } from '@/src/core/i18n/i18n';
import { BORDER_DEFAULT, BRAND_GREEN, DANGER } from '@/src/core/theme/colors';

/**
 * Issue #439: 基本情報タブの inline 編集フォーム。
 * BonsaiCreateSheet と同じ `useBonsaiBasicForm` フックを親で呼んで state を共有し、
 * mockup `bonsai-detail-basic-01/02/03.png` 整合の編集兼用フォームを実現する。
 * Picker BottomSheet は親側で画面 root に配置 (ScrollView 内 nest 禁止)。
 *
 * Phase 4 A1-2: `bonsai/[id]/index.tsx` から抽出 (props / styles / 挙動 不変)。
 */
export function BonsaiBasicSection({
  form,
  onArchive,
  customPhotoBlock,
  onMemoFocus,
}: {
  form: BonsaiBasicFormState;
  onArchive: () => void;
  customPhotoBlock?: React.ReactNode;
  /** Sess31 PR-1 (R-46 拡張): メモ欄 onFocus → 親 ScrollView の auto-scroll 配線。 */
  onMemoFocus?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.basicFormSection}>
      <BonsaiBasicFormFields
        form={form}
        showPhotos={false}
        customPhotoBlock={customPhotoBlock}
        onMemoFocus={onMemoFocus}
      />
      {/* Sess15 PR-SS: アーカイブ (上) + 保存 (下) inline 復活、 高さ 56 統一 (PR-NN design)。
          user 真意「アーカイブの下に保存ボタンがあるイメージ」 整合。 */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('bonsaiArchive')}
        style={styles.basicArchiveButton}
        onPress={onArchive}
        testID="e2e_detail_basic_archive_button"
      >
        <ThemedText style={styles.basicArchiveButtonText}>{t('bonsaiArchive')}</ThemedText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('save')}
        accessibilityState={{ disabled: !form.canSubmit }}
        style={[styles.basicSaveButton, !form.canSubmit && styles.basicSaveButtonDisabled]}
        onPress={() => void form.handleSubmit()}
        disabled={!form.canSubmit}
        testID="e2e_detail_basic_save_button"
      >
        <ThemedText style={styles.basicSaveButtonText}>{t('save')}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Sess15 PR-SS: 基本情報タブ inline 保存 button (sticky footer 廃止 + PR-NN design 復活)。
  basicSaveButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  basicSaveButtonDisabled: {
    backgroundColor: BORDER_DEFAULT,
  },
  basicSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  // Sess15 PR-SS: アーカイブ inline button 復活 (PR-NN design、 保存と同 height 56 + 同 borderRadius)。
  basicArchiveButton: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DANGER,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  basicArchiveButtonText: {
    color: DANGER,
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  // Sess15 PR-TT: gap 16 → 24 (メモ欄と アーカイブ button の overlap 解消)。
  basicFormSection: {
    padding: 16,
    gap: 24,
  },
});
