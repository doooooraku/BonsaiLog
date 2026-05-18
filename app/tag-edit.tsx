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
import { countBonsaiByTag, createOrFindTag, renameTag } from '@/src/db/tagRepository';

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
  // Sess9 PR-8: 影響範囲警告用、 編集モード時のみ fetch (新規追加時は count = 0 固定)
  const [usageCount, setUsageCount] = React.useState<number>(0);

  React.useEffect(() => {
    if (!isEditMode || tagId == null) return;
    let mounted = true;
    void (async () => {
      try {
        const count = await countBonsaiByTag(tagId);
        if (mounted) setUsageCount(count);
      } catch {
        // count 取得失敗時は 0 のまま (警告省略、 操作は許可)
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isEditMode, tagId]);

  /** Sess9 PR-8: rename 確定の中核ロジック (確認後 or 影響なし時に実行)。 */
  const performRename = async (trimmed: string): Promise<void> => {
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
    router.back();
  };

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (trimmed.length === 0 || busy) return;
    setBusy(true);
    try {
      if (isEditMode) {
        // Sess9 PR-8: 名前が変わる + 使用中タグ → Linear パターン確認 Alert
        const nameChanged = trimmed !== initialName.trim();
        if (nameChanged && usageCount > 0) {
          Alert.alert(
            t('tagRenameImpactTitle'),
            t('tagRenameImpactBody')
              .replace('{count}', String(usageCount))
              .replace('{newName}', trimmed),
            [
              {
                text: t('cancel'),
                style: 'cancel',
                onPress: () => setBusy(false),
              },
              {
                text: t('tagEditUpdateCta'),
                onPress: () => {
                  void performRename(trimmed);
                },
              },
            ],
          );
          return;
        }
        await performRename(trimmed);
      } else {
        await createOrFindTag(trimmed);
        router.back();
      }
    } catch {
      Alert.alert(t('error'), t('tagsAddFailedBody'));
      setBusy(false);
    }
  };

  const handleDelete = () => {
    if (!isEditMode || tagId == null) return;
    // Sess9 PR-8: 使用中タグ削除は影響範囲明示 (Linear / Notion パターン)
    const body =
      usageCount > 0
        ? t('tagDeleteImpactBody')
            .replace('{name}', initialName)
            .replace('{count}', String(usageCount))
        : t('tagsDeleteConfirmBody').replace('{name}', initialName);
    Alert.alert(t('tagsDeleteConfirmTitle'), body, [
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
    ]);
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
