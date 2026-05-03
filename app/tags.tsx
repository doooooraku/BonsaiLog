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
import { getDb } from '@/src/db/db';
import { createOrFindTag, type TagRecord } from '@/src/db/tagRepository';
import { OutdoorToggleButton } from '@/src/features/theme/OutdoorToggleButton';

export default function TagsManagerScreen() {
  const { t } = useTranslation();
  const [tags, setTags] = React.useState<TagRecord[]>([]);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);

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
      await createOrFindTag(trimmed);
      setInput('');
      await reload();
    } catch {
      Alert.alert(t('error'), t('tagsAddFailedBody'));
    } finally {
      setBusy(false);
    }
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
    <ThemedView style={styles.container} testID="e2e_tags_manager">
      <OutdoorToggleButton testIdSuffix="tags_outdoor_toggle" />
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
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('tagsAddAction')}
            testID="e2e_tags_add"
            style={[styles.addBtn, (busy || input.trim().length === 0) && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={busy || input.trim().length === 0}
          >
            <ThemedText style={styles.addBtnText}>{t('tagsAddAction')}</ThemedText>
          </Pressable>
        </View>

        {tags.length === 0 && <ThemedText style={styles.empty}>{t('tagsEmpty')}</ThemedText>}

        {tags.map((tg) => (
          <Pressable
            key={tg.id}
            accessibilityRole="button"
            accessibilityLabel={tg.name}
            testID={`e2e_tags_row_${tg.id}`}
            style={styles.row}
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
  container: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  title: { marginBottom: 4 },
  desc: { fontSize: 13, opacity: 0.7, marginBottom: 12, lineHeight: 18 },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    fontSize: 16,
  },
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { backgroundColor: '#9E9E9E' },
  addBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  empty: { textAlign: 'center', opacity: 0.7, paddingVertical: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  rowDate: { fontSize: 12, opacity: 0.6 },
});
