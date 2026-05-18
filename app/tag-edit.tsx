/**
 * タグ追加 / 編集の自前 modal-equivalent 全画面 (Sess9 PR-3、 ADR-0008 §Notes Amended 2026-05-18)。
 *
 * 旧 app/tags.tsx の Alert.alert (素っ気ない OS native dialog) を置換。
 * 設定 → タグを管理 → row tap で `/tag-edit?tagId=xxx` (edit)、 「+ 新規」 で `/tag-edit` (add)。
 *
 * 設計 (案 A):
 * - presentation: 'card' (root Stack default、 iOS/Android 共に push transition)
 * - iOS の card modal slide-up は不採用 (user 真意「iOS でも regular screen」)、
 *   ADR-0024 §Notes Amended の「modal = regular screen」 と整合
 * - 削除確認だけ Alert.alert を残す (Apple HIG destructive UX、 取り返しがつかない操作のみ confirm)
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  DISABLED_BG,
  ON_BRAND,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { getDb } from '@/src/db/db';
import { createOrFindTag, renameTag } from '@/src/db/tagRepository';

const TAG_NAME_MAX_LENGTH = 32;

export default function TagEditScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const params = useLocalSearchParams<{ tagId?: string; initialName?: string }>();
  const tagId = typeof params.tagId === 'string' ? params.tagId : null;
  const initialName = typeof params.initialName === 'string' ? params.initialName : '';
  const isEditMode = tagId != null;

  const [input, setInput] = React.useState(initialName);
  const [busy, setBusy] = React.useState(false);

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (trimmed.length === 0 || busy) return;
    setBusy(true);
    try {
      if (isEditMode) {
        const result = await renameTag(tagId!, trimmed);
        if (result === 'duplicate') {
          Alert.alert(t('error'), t('tagsRenameDuplicateBody'));
          setBusy(false);
          return;
        }
        if (result === 'empty') {
          Alert.alert(t('error'), t('tagsAddFailedBody'));
          setBusy(false);
          return;
        }
      } else {
        await createOrFindTag(trimmed);
      }
      router.back();
    } catch {
      Alert.alert(t('error'), t('tagsAddFailedBody'));
      setBusy(false);
    }
  };

  const handleDelete = () => {
    if (!isEditMode || tagId == null) return;
    Alert.alert(
      t('tagsDeleteConfirmTitle'),
      t('tagsDeleteConfirmBody').replace('{name}', initialName),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            const db = await getDb();
            await db.runAsync('DELETE FROM tags WHERE id = ?', [tagId]);
            router.back();
          },
        },
      ],
    );
  };

  const canSubmit = input.trim().length > 0 && !busy;
  const submitLabel = isEditMode ? t('tagEditUpdateCta') : t('tagEditAddCta');

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_tag_edit_screen"
    >
      <Stack.Screen
        options={{ title: isEditMode ? t('tagEditTitleEdit') : t('tagEditTitleAdd') }}
      />
      <View style={styles.content}>
        <ThemedText style={[styles.label, { color: c.textSecondary }]}>
          {t('tagEditNameLabel')}
        </ThemedText>
        <View style={styles.inputWrap}>
          <TextInput
            accessibilityLabel={t('tagEditNameLabel')}
            testID="e2e_tag_edit_input"
            style={[styles.input, { borderColor: BORDER_DEFAULT, backgroundColor: BG_SURFACE }]}
            value={input}
            onChangeText={setInput}
            placeholder={t('tagsAddPlaceholder')}
            placeholderTextColor={TEXT_SECONDARY}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            maxLength={TAG_NAME_MAX_LENGTH}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          <ThemedText style={[styles.counter, { color: TEXT_SECONDARY }]}>
            {input.length}/{TAG_NAME_MAX_LENGTH}
          </ThemedText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={submitLabel}
          testID="e2e_tag_edit_submit"
          style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          <ThemedText style={styles.primaryBtnText}>{submitLabel}</ThemedText>
        </Pressable>

        {isEditMode && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('tagEditDeleteCta')}
            testID="e2e_tag_edit_delete"
            style={styles.deleteBtn}
            onPress={handleDelete}
          >
            <ThemedText style={styles.deleteBtnText}>{t('tagEditDeleteCta')}</ThemedText>
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('cancel')}
          testID="e2e_tag_edit_cancel"
          style={styles.cancelBtn}
          onPress={() => router.back()}
        >
          <ThemedText style={[styles.cancelBtnText, { color: TEXT_SECONDARY }]}>
            {t('cancel')}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  label: { fontSize: 13, marginTop: 8, marginBottom: 4 },
  inputWrap: { position: 'relative' },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingRight: 60,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 17,
  },
  counter: { position: 'absolute', right: 14, top: 14, fontSize: 12 },
  primaryBtn: {
    marginTop: 16,
    paddingVertical: 14,
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: { backgroundColor: DISABLED_BG },
  primaryBtnText: { color: ON_BRAND, fontSize: 17, fontWeight: '600', letterSpacing: 0.5 },
  deleteBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { color: '#B33B3B', fontSize: 15, fontWeight: '500' },
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 14 },
});
