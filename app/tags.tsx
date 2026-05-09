/**
 * F-09 Phase C タグ管理画面 (Issue #31 / ADR-0008 改訂)。
 *
 * Phase C 範囲:
 * - タグの作成 (createOrFindTag、case-insensitive UNIQUE)
 * - 既存タグ一覧 (createdAt DESC)
 * - タグ削除 (event_tags は CASCADE で自動削除)
 *
 * Phase D 以降:
 * - event 行に tag chips 表示 (long-press でタグ追加 / 削除)
 * - tag-based 検索フィルタ (events.id IN event_tags WHERE tag_id IN ...)
 * - tag rename / merge
 */
import { useFocusEffect } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

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
import { createOrFindTag, renameTag, type TagRecord } from '@/src/db/tagRepository';

/** Issue #31 AC4-2: タグ名 32 文字制限 (TL1)。 */
const TAG_NAME_MAX_LENGTH = 32;

export default function TagsManagerScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const [tags, setTags] = React.useState<TagRecord[]>([]);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  // Issue #31 AC3 Y9: rename UI 編集モード (null = 新規追加、TagRecord = rename 対象)
  const [editingTag, setEditingTag] = React.useState<TagRecord | null>(null);

  const reload = React.useCallback(async () => {
    const db = await getDb();
    const rows = await db.getAllAsync<TagRecord>(
      'SELECT id, name, name_normalized as nameNormalized, created_at as createdAt FROM tags ORDER BY created_at DESC',
    );
    setTags(rows);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      reload().catch(() => setTags([]));
    }, [reload]),
  );

  const handleAdd = async () => {
    const trimmed = input.trim();
    if (trimmed.length === 0 || busy) return;
    setBusy(true);
    try {
      // Issue #31 AC3 Y9: 編集モード時は rename、それ以外は新規 createOrFindTag
      if (editingTag) {
        const result = await renameTag(editingTag.id, trimmed);
        if (result === 'duplicate') {
          Alert.alert(t('error'), t('tagsRenameDuplicateBody'));
          return;
        }
        if (result === 'empty') {
          Alert.alert(t('error'), t('tagsAddFailedBody'));
          return;
        }
        setEditingTag(null);
      } else {
        await createOrFindTag(trimmed);
      }
      setInput('');
      await reload();
    } catch {
      Alert.alert(t('error'), t('tagsAddFailedBody'));
    } finally {
      setBusy(false);
    }
  };

  const handleRowPress = (tag: TagRecord) => {
    Alert.alert(tag.name, undefined, [
      {
        text: t('tagsRenameAction'),
        onPress: () => {
          setEditingTag(tag);
          setInput(tag.name);
        },
      },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => handleDelete(tag),
      },
      { text: t('cancel'), style: 'cancel' },
    ]);
  };

  const handleCancelEdit = () => {
    setEditingTag(null);
    setInput('');
  };

  const handleDelete = (tag: TagRecord) => {
    Alert.alert(
      t('tagsDeleteConfirmTitle'),
      t('tagsDeleteConfirmBody').replace('{name}', tag.name),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            const db = await getDb();
            // event_tags は CASCADE で自動削除 (schema.ts §220 onDelete: 'cascade')
            await db.runAsync('DELETE FROM tags WHERE id = ?', [tag.id]);
            await reload();
          },
        },
      ],
    );
  };

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_tags_manager"
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ThemedText type="title" style={styles.title}>
          {t('tagsManagerTitle')}
        </ThemedText>
        <ThemedText style={styles.desc}>{t('tagsManagerDesc')}</ThemedText>

        <View style={styles.inputRow}>
          <TextInput
            accessibilityLabel={t('tagsAddPlaceholder')}
            testID="e2e_tags_input"
            style={styles.input}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleAdd}
            placeholder={t('tagsAddPlaceholder')}
            returnKeyType="done"
            autoCorrect={false}
            autoCapitalize="none"
            maxLength={TAG_NAME_MAX_LENGTH}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={editingTag ? t('tagsRenameAction') : t('tagsAddAction')}
            testID="e2e_tags_add"
            style={[styles.addBtn, (busy || input.trim().length === 0) && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={busy || input.trim().length === 0}
          >
            <ThemedText style={styles.addBtnText}>
              {editingTag ? t('tagsRenameAction') : t('tagsAddAction')}
            </ThemedText>
          </Pressable>
        </View>
        {editingTag && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('cancel')}
            testID="e2e_tags_rename_cancel"
            onPress={handleCancelEdit}
          >
            <ThemedText style={styles.cancelEditText}>{t('cancel')}</ThemedText>
          </Pressable>
        )}

        {tags.length === 0 && <ThemedText style={styles.empty}>{t('tagsEmpty')}</ThemedText>}

        {tags.map((tg) => (
          <Pressable
            key={tg.id}
            accessibilityRole="button"
            accessibilityLabel={tg.name}
            testID={`e2e_tags_row_${tg.id}`}
            style={styles.row}
            onPress={() => handleRowPress(tg)}
            onLongPress={() => handleDelete(tg)}
          >
            <ThemedText type="defaultSemiBold">{tg.name}</ThemedText>
            <ThemedText style={styles.rowDate}>
              {new Date(tg.createdAt).toLocaleDateString()}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // backgroundColor は useColors の c.background で動的指定
  container: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  title: { marginBottom: 4 },
  desc: { fontSize: 13, color: TEXT_SECONDARY, marginBottom: 12, lineHeight: 18 },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  // Issue #31 AC5 シニア UX: minHeight 48 + fontSize 17
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    backgroundColor: BG_SURFACE,
    fontSize: 17,
  },
  addBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: 48,
    minWidth: 64,
    borderRadius: 12,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { backgroundColor: DISABLED_BG },
  addBtnText: { color: ON_BRAND, fontSize: 17, fontWeight: '600' },
  empty: { textAlign: 'center', color: TEXT_SECONDARY, paddingVertical: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: BG_SURFACE,
  },
  rowDate: { fontSize: 12, color: TEXT_SECONDARY },
  cancelEditText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    paddingVertical: 8,
    textAlign: 'center',
  },
});
