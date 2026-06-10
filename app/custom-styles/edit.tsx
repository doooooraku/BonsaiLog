/**
 * カスタム樹形 編集 / 追加 全画面 (Sess89 Phase 3、 ADR-0049 ⑥ Grandfathered 緩 削除 OK の構造実装)。
 *
 * 動線:
 * - 管理画面 → 「+ 樹形を追加」 → /custom-styles/edit (add mode)
 * - 管理画面 → row tap or kebab 「編集」 → /custom-styles/edit?id=xxx&initialName=yyy (edit mode)
 *
 * 模倣 pattern:
 * - app/tag-edit.tsx (= TextInput + counter + save + delete + impact warning Linear pattern)
 *
 * 設計:
 * - presentation: 'card' (root Stack default、 iOS/Android 共に push transition)
 * - 削除確認は ConfirmDialog (= ADR-0036 D1 整合、 tag-edit の Alert.alert は legacy)
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { useUnsavedChangesGuard } from '@/src/core/hooks/useUnsavedChangesGuard';
import { useTranslation } from '@/src/core/i18n/i18n';
import { BRAND_GREEN, DISABLED_BG, ON_BRAND } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import {
  canCreateNewCustomStyle,
  countBonsaiByCustomStyle,
  createOrFindCustomStyle,
  deleteCustomStyle,
  FREE_CUSTOM_STYLE_LIMIT,
  renameCustomStyle,
} from '@/src/db/bonsaiStylesCustomRepository';
import { useProGuard } from '@/src/features/pro/useProGuard';

const STYLE_NAME_MAX_LENGTH = 64;

export default function CustomStylesEditScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const params = useLocalSearchParams<{ id?: string; initialName?: string }>();
  const id = typeof params.id === 'string' ? params.id : null;
  const initialName = typeof params.initialName === 'string' ? params.initialName : '';
  const isEditMode = id != null;

  const [input, setInput] = React.useState(initialName);
  const [busy, setBusy] = React.useState(false);
  const [usageCount, setUsageCount] = React.useState<number>(0);
  const [deleteDialogVisible, setDeleteDialogVisible] = React.useState(false);

  const { openPaywall, isPro } = useProGuard({ feature: 'custom_species', currentCount: 0 });

  const isDirty = React.useMemo(() => input.trim() !== initialName.trim(), [input, initialName]);
  const { guardVisible, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard({
    isDirty,
    bypass: busy,
  });

  // Sess89 Phase 3: countBonsaiByCustomStyle は name (= raw text) で match (= 樹種は id で match)。
  React.useEffect(() => {
    if (!isEditMode || initialName.length === 0) return;
    let mounted = true;
    void (async () => {
      try {
        const count = await countBonsaiByCustomStyle(initialName);
        if (mounted) setUsageCount(count);
      } catch {
        // count 取得失敗時は 0 のまま (= 警告省略、 操作は許可)
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isEditMode, initialName]);

  const performRename = async (trimmed: string): Promise<void> => {
    const result = await renameCustomStyle(id!, trimmed);
    if (result === 'duplicate') {
      Alert.alert(t('error'), t('customStylesRenameDuplicateBody'));
      setBusy(false);
      return;
    }
    if (result === 'empty') {
      Alert.alert(t('error'), t('customStylesAddFailedBody'));
      setBusy(false);
      return;
    }
    router.back();
  };

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (trimmed.length === 0 || busy) return;
    setBusy(true);
    try {
      if (isEditMode) {
        await performRename(trimmed);
      } else {
        const canCreate = await canCreateNewCustomStyle(trimmed, isPro);
        if (!canCreate) {
          Alert.alert(
            t('customLimitTitle'),
            t('customLimitDesc').replace('{count}', String(FREE_CUSTOM_STYLE_LIMIT)),
            [
              { text: t('cancel'), style: 'cancel', onPress: () => setBusy(false) },
              {
                text: t('proCtaUpgrade'),
                onPress: () => {
                  setBusy(false);
                  openPaywall();
                },
              },
            ],
          );
          return;
        }
        await createOrFindCustomStyle(trimmed);
        router.back();
      }
    } catch {
      Alert.alert(t('error'), t('customStylesAddFailedBody'));
      setBusy(false);
    }
  };

  const handleDeleteRequest = () => {
    if (!isEditMode) return;
    setDeleteDialogVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (!isEditMode || id == null || busy) return;
    setBusy(true);
    try {
      await deleteCustomStyle(id);
      setDeleteDialogVisible(false);
      router.back();
    } catch {
      Alert.alert(t('error'), t('customStylesAddFailedBody'));
      setBusy(false);
    }
  };

  const canSubmit = input.trim().length > 0 && !busy;
  const submitLabel = isEditMode ? t('customStylesEditUpdateCta') : t('customStylesEditAddCta');

  const deleteDialogTitle = t('customStylesDeleteConfirmTitle').replace('{name}', initialName);
  const deleteDialogBody =
    usageCount > 0
      ? t('customStylesDeleteImpactBody').replace('{count}', String(usageCount))
      : t('customStylesDeleteConfirmBody');

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_custom_species_edit_screen"
    >
      <Stack.Screen
        options={{
          title: isEditMode ? t('customStylesEditTitleEdit') : t('customStylesEditTitleAdd'),
        }}
      />
      <View style={styles.content}>
        <ThemedText style={[styles.label, { color: c.textSecondary }]}>
          {t('customStylesEditNameLabel')}
        </ThemedText>
        <View style={styles.inputWrap}>
          <TextInput
            accessibilityLabel={t('customStylesEditNameLabel')}
            testID="e2e_custom_species_edit_input"
            style={[
              styles.input,
              { color: c.text, borderColor: c.border, backgroundColor: c.surface },
            ]}
            value={input}
            onChangeText={setInput}
            placeholder={t('customStylesAddPlaceholder')}
            placeholderTextColor={c.textSecondary}
            autoCorrect={false}
            autoCapitalize="none"
            maxLength={STYLE_NAME_MAX_LENGTH}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          <ThemedText style={[styles.counter, { color: c.textSecondary }]}>
            {input.length}/{STYLE_NAME_MAX_LENGTH}
          </ThemedText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={submitLabel}
          testID="e2e_custom_species_edit_submit"
          style={[styles.primaryBtn, { backgroundColor: canSubmit ? BRAND_GREEN : DISABLED_BG }]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <ThemedText style={[styles.primaryBtnText, { color: ON_BRAND }]}>
            {submitLabel}
          </ThemedText>
        </Pressable>

        {isEditMode && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('customStylesEditDeleteCta')}
            testID="e2e_custom_species_edit_delete"
            style={styles.deleteBtn}
            onPress={handleDeleteRequest}
          >
            <ThemedText style={[styles.deleteBtnText, { color: c.dangerColor }]}>
              {t('customStylesEditDeleteCta')}
            </ThemedText>
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('cancel')}
          testID="e2e_custom_species_edit_cancel"
          style={styles.cancelBtn}
          onPress={() => router.back()}
        >
          <ThemedText style={[styles.cancelBtnText, { color: c.textSecondary }]}>
            {t('cancel')}
          </ThemedText>
        </Pressable>
      </View>

      <ConfirmDialog
        visible={deleteDialogVisible}
        title={deleteDialogTitle}
        description={deleteDialogBody}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        destructive
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => {
          if (!busy) setDeleteDialogVisible(false);
        }}
        testID="e2e_custom_species_edit_delete_dialog"
      />

      <ConfirmDialog
        visible={guardVisible}
        title={t('discardChanges')}
        description={t('discardChangesDesc')}
        confirmLabel={t('discard')}
        cancelLabel={t('keepEditing')}
        destructive
        onConfirm={confirmDiscard}
        onCancel={cancelDiscard}
        testID="e2e_custom_species_edit_discard_dialog"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  label: { fontSize: 13, marginTop: 4 },
  inputWrap: { gap: 4 },
  input: {
    height: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 16,
  },
  counter: { fontSize: 11, textAlign: 'right' },
  primaryBtn: {
    paddingVertical: 14,
    minHeight: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryBtnText: { fontSize: 17, fontWeight: '600', letterSpacing: 0.5 },
  deleteBtn: {
    paddingVertical: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  deleteBtnText: { fontSize: 15, fontWeight: '500' },
  cancelBtn: {
    paddingVertical: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 15 },
});
