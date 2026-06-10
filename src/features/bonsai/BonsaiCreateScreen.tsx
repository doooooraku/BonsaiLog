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
import { useScrollPreservation } from '@/src/core/hooks/useScrollPreservation';
import { useTranslation } from '@/src/core/i18n/i18n';
// Sess68 PR #C: BG_SURFACE / BORDER_DEFAULT は inline c.* 化。
// Sess69 PR-B: BRAND_GREEN / DISABLED_BG / ON_BRAND も scheme-aware
// (c.tint / c.disabledBg / c.onTint) に移行 (dark mode で深緑保存ボタンが沈む / 灰色 disabled が
// 意図不明に浮く罠を解消、 ADR-0015/ADR-0052 Amendment)。
import { useColors } from '@/src/core/theme/useColors';
import { BonsaiBasicFormFields, useBonsaiBasicForm } from '@/src/features/bonsai/BonsaiBasicForm';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { usePickerStore } from '@/src/stores/pickerStore';

export default function BonsaiCreateScreen() {
  const { t } = useTranslation();
  const c = useColors();
  // Sess28 PR-2 (ADR-0037 D1 / R-46): キーボード回避 props を共通 hook で取得 (KAV、 container 縮小)。
  const kavProps = useKeyboardAvoidingProps();
  // Sess31 PR-1 (R-46 拡張): ScrollView ref + メモ欄 onFocus → scrollToEnd で IME 起動時の可視性確保。
  const scrollRef = React.useRef<ScrollView>(null);
  // Sess72 PR-2 (ADR-0040 D5 予定 / R-62 予定): 子画面 (tag-edit) から push で戻った時の scroll
  // 位置保持。 useFocusEffect 内 setSelectedTagIds + setRecentTags 2 連で TagSection layout が
  // 「empty 縦」 → 「wrap row 横」 に変化し ScrollView contentOffset が 0 リセットされる挙動を
  // 構造的に解消 (テスター苦情「タグ追加から戻ると先頭に戻る」 への hook 化対応)。
  // Sess95 PR-2: onContentSizeChange 追加 = 戻り後の非同期 layout 変動 (getRecentTags 等)
  // に復元が追い越される race の構造解 (hook JSDoc 参照)。
  const { onScroll, onContentSizeChange, scrollEventThrottle } = useScrollPreservation(scrollRef);
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
          onScroll={onScroll}
          onContentSizeChange={onContentSizeChange}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <BonsaiBasicFormFields form={form} showPhotos onMemoFocus={handleMemoFocus} />
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: c.border, backgroundColor: c.surface }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('save')}
            accessibilityState={{ disabled: !form.canSubmit }}
            style={[
              styles.footerButton,
              { backgroundColor: form.canSubmit ? c.tint : c.disabledBg },
            ]}
            onPress={() => void form.handleSubmit()}
            disabled={!form.canSubmit}
            testID="e2e_bonsai_create_submit"
          >
            <ThemedText style={[styles.footerButtonText, { color: c.onTint }]}>
              {t('save')}
            </ThemedText>
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
  },
  // Sess69 PR-B: bg / disabled / text 色は inline c.tint / c.disabledBg / c.onTint (scheme-aware)。
  footerButton: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonText: { fontSize: 17, fontWeight: '500', letterSpacing: 0.5 },
});
