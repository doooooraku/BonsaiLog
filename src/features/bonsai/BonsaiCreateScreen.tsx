/**
 * 盆栽 新規登録画面 (Phase G4 part 2、ADR-0024 Accepted、functional_spec §6.2 既存設計に整合)。
 *
 * 旧 `BonsaiCreateSheet.tsx` (`@gorhom/bottom-sheet` snap 90%) を画面化、
 * `(modals)/bonsai-new` route で `presentation: 'modal'` (formSheet ではなく modal、
 * functional_spec §6.2 既存設計に整合) 配下に配置。
 *
 * `useBonsaiBasicForm` フック + `BonsaiBasicFormFields` を流用 (詳細画面 基本情報タブと共通)。
 *
 * 新規登録成功時に `store.setBonsaiCreateResult(bonsaiId)` + `router.back()` で caller に
 * 返却 → caller 側 `useFocusEffect` で `consumeBonsaiCreateResult()` 取得 → `/bonsai/<id>` 遷移。
 */
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  DISABLED_BG,
  ON_BRAND,
} from '@/src/core/theme/colors';
import { BonsaiBasicFormFields, useBonsaiBasicForm } from '@/src/features/bonsai/BonsaiBasicForm';
import { usePickerStore } from '@/src/stores/pickerStore';

export default function BonsaiCreateScreen() {
  const { t } = useTranslation();

  const form = useBonsaiBasicForm({
    editingBonsai: null,
    onCreated: (bonsaiId) => {
      usePickerStore.getState().setBonsaiCreateResult(bonsaiId);
    },
    onAfterSubmit: () => router.back(),
  });

  return (
    <View style={styles.container} testID="e2e_bonsai_create_screen">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <BonsaiBasicFormFields form={form} showPhotos />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
