/**
 * 盆栽 新規登録画面 (ADR-0024 で native presentation `(modals)/bonsai-new` に移行、
 * `presentation: 'modal'`。 functional_spec §6.2 既存設計に整合)。
 *
 * `useBonsaiBasicForm` フック + `BonsaiBasicFormFields` を流用 (詳細画面 基本情報タブと共通)。
 *
 * 新規登録成功時に `store.setBonsaiCreateResult(bonsaiId)` + `router.back()` で caller に
 * 返却 → caller 側 `useFocusEffect` で `consumeBonsaiCreateResult()` 取得 → `/bonsai/<id>` 遷移。
 */
import { Stack, router } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FormScreenHeader } from '@/src/components/form/FormScreenHeader';
import { useKeyboardAvoidingProps } from '@/src/core/hooks/useKeyboardAvoidingProps';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  DISABLED_BG,
  ON_BRAND,
} from '@/src/core/theme/colors';
import { BonsaiBasicFormFields, useBonsaiBasicForm } from '@/src/features/bonsai/BonsaiBasicForm';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { usePickerStore } from '@/src/stores/pickerStore';

export default function BonsaiCreateScreen() {
  const { t } = useTranslation();
  // Sess28 PR-2 (ADR-0037 D1 / R-46): キーボード回避 props を共通 hook で取得 (KAV、 container 縮小)。
  const kavProps = useKeyboardAvoidingProps();
  // Sess31 PR-1 (R-46 拡張): ScrollView ref + メモ欄 onFocus → scrollToEnd で IME 起動時の可視性確保。
  const scrollRef = React.useRef<ScrollView>(null);
  const handleMemoFocus = React.useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
  }, []);

  const form = useBonsaiBasicForm({
    editingBonsai: null,
    onCreated: (bonsaiId) => {
      usePickerStore.getState().setBonsaiCreateResult(bonsaiId);
    },
    onAfterSubmit: () => router.back(),
  });

  return (
    <View style={styles.container} testID="e2e_bonsai_create_screen">
      {/* Sess33 PR-3 (ADR-0039 起票予定): Stack header 廃止 + FormScreenHeader sticky。
          BonsaiBasicFormFields は ScrollView 内に全要素 (タイトルなし、 直接 fields)。
          IME 起動時は scrollToEnd で末尾メモ欄まで scroll (R-46 v3 タイプ A)。 */}
      <Stack.Screen options={{ headerShown: false }} />
      <FormScreenHeader testID="e2e_bonsai_create_form_header" />

      <KeyboardAvoidingView style={styles.flexOne} {...kavProps}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <BonsaiBasicFormFields form={form} showPhotos onMemoFocus={handleMemoFocus} />
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('save')}
            accessibilityState={{ disabled: !form.canSubmit }}
            style={[styles.footerButton, !form.canSubmit && styles.footerButtonDisabled]}
            onPress={() => void form.handleSubmit()}
            disabled={!form.canSubmit}
            testID="e2e_bonsai_create_submit"
          >
            <ThemedText style={styles.footerButtonText}>{t('save')}</ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      {/* Sess39 PR-2 (issue #822): 未保存 changes 確認 dialog (新規作成 mode のみ) */}
      <ConfirmDialog
        visible={form.guardVisible}
        title={t('discardChanges')}
        description={t('discardChangesDesc')}
        confirmLabel={t('discard')}
        cancelLabel={t('keepEditing')}
        destructive
        onConfirm={form.confirmDiscard}
        onCancel={form.cancelDiscard}
        testID="e2e_discard_dialog_bonsai_create"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flexOne: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 96 },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER_DEFAULT,
    backgroundColor: BG_SURFACE,
  },
  footerButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonDisabled: { backgroundColor: DISABLED_BG },
  footerButtonText: { color: ON_BRAND, fontSize: 17, fontWeight: '500', letterSpacing: 0.5 },
});
