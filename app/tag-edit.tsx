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
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { useToastStore } from '@/src/components/Toast';
import { useUnsavedChangesGuard } from '@/src/core/hooks/useUnsavedChangesGuard';
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
import { isPresetTagName } from '@/src/db/seedTagPresets';
import {
  canCreateNewTag,
  countBonsaiByTag,
  createOrFindTag,
  FREE_TAG_LIMIT,
  renameTag,
} from '@/src/db/tagRepository';
import { useProGuard } from '@/src/features/pro/useProGuard';
import { usePickerStore } from '@/src/stores/pickerStore';

const TAG_NAME_MAX_LENGTH = 32;

export default function TagEditScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const params = useLocalSearchParams<{
    tagId?: string;
    initialName?: string;
    returnTo?: string;
  }>();
  const tagId = typeof params.tagId === 'string' ? params.tagId : null;
  const initialName = typeof params.initialName === 'string' ? params.initialName : '';
  // Sess13 PR-C: returnTo=bonsai-create で呼ばれた場合、 createOrFindTag 後に
  // usePickerStore.setTagAddResult で caller (BonsaiBasicForm) に新規 tagId を返却し auto-select。
  const returnTo = typeof params.returnTo === 'string' ? params.returnTo : null;
  const isEditMode = tagId != null;

  const [input, setInput] = React.useState(initialName);
  const [busy, setBusy] = React.useState(false);
  // Sess9 PR-8: 影響範囲警告用、 編集モード時のみ fetch (新規追加時は count = 0 固定)
  const [usageCount, setUsageCount] = React.useState<number>(0);
  // ADR-0049 Sess59 PR4: 新規タグ作成 Free 上限 3 ガード (rename は無制限)
  // currentCount は使わない (handleSave 内で canCreateNewTag が DB 直接参照)
  const { openPaywall, isPro } = useProGuard({ feature: 'tag', currentCount: 0 });

  // Sess39 PR-2 (issue #822): 未保存 changes 確認 dialog (rename + 新規追加 両 mode 対応)
  const isDirty = React.useMemo(() => input.trim() !== initialName.trim(), [input, initialName]);
  const { guardVisible, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard({
    isDirty,
    bypass: busy,
  });

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
        // ADR-0049 Sess59 PR4 + Sess60 PR1: 新規タグ作成 Free 上限 3 ガード (rename は無制限)
        // Sess60 PR1: photoLimit* 流用 → tagLimit* 専用 key に切替 (Sess59 検証で文言不整合発覚)
        // Sess74 PR-2: canCreateNewTag は master preset を常に true 返却 (countCustomTags 除外)
        const canCreate = await canCreateNewTag(trimmed, isPro);
        if (!canCreate) {
          Alert.alert(
            t('tagLimitTitle'),
            t('tagLimitDesc').replace('{count}', String(FREE_TAG_LIMIT)),
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
        const created = await createOrFindTag(trimmed);
        // Sess74 PR-2: 手入力 name が master preset と一致 → user に「マスタタグです」
        // を Toast で説明 (rename/削除不可、 ロック挙動)。 既存 master row を再利用するため
        // 機能には影響なし、 純粋に UX FB のみ。
        if (isPresetTagName(trimmed)) {
          useToastStore.getState().show(t('tagPresetLockedToast'));
        }
        // Sess13 PR-C: returnTo=bonsai-create で呼ばれた場合は caller で auto-select するため
        // tagAddResult に新規 tagId を入れる (caller の useFocusEffect で consume)。
        if (returnTo === 'bonsai-create') {
          usePickerStore.getState().setTagAddResult(created.id);
        }
        router.back();
      }
    } catch {
      Alert.alert(t('error'), t('tagsAddFailedBody'));
      setBusy(false);
    }
  };

  // Sess91 PR-2: 旧 handleDelete (Alert.alert + 直 SQL `db.runAsync('DELETE FROM tags...')`)
  // を完全削除。 削除動線は /tags 一覧 kebab → RowActionMenu → ConfirmDialog → deleteTag()
  // (= tagRepository.ts に新規 extract) の統一動線に一本化 (ADR-0036 D7 整合)。

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

        {/* Sess91 PR-2: 旧 isEditMode 時 delete button (= t('tagEditDeleteCta')) を完全削除。
             削除動線は /tags 一覧 kebab → RowActionMenu → ConfirmDialog → deleteTag() 経由に
             一本化 (ADR-0036 D7 整合、 /custom-* 同型)。 */}
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
      {/* Sess39 PR-2 (issue #822): 未保存 changes 確認 dialog */}
      <ConfirmDialog
        visible={guardVisible}
        title={t('discardChanges')}
        description={t('discardChangesDesc')}
        confirmLabel={t('discard')}
        cancelLabel={t('keepEditing')}
        destructive
        onConfirm={confirmDiscard}
        onCancel={cancelDiscard}
        testID="e2e_discard_dialog_tag_edit"
      />
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
  // Sess91 PR-2: 旧 deleteBtn / deleteBtnText style は handleDelete + delete button 物理削除に
  // 伴い dead、 entry 撤去 (= hex literal '#B33B3B' lint warning 1 件も同時解消)。
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 14 },
});
