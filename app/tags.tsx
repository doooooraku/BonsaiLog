/**
 * F-09 タグ管理画面 (Issue #31 / ADR-0008 + §Notes Amended 2026-05-18 + Sess9 PR-3)。
 *
 * 範囲:
 * - 既存タグ一覧 (createdAt DESC)
 * - 「+ 新規タグを追加」 button → /tag-edit 全画面 (Sess9 PR-3)
 * - 行 tap → /tag-edit?tagId=xxx&initialName=yyy 全画面 (旧 Alert.alert 置換)
 *
 * Sess9 PR-1 で event_tags 完全廃止 (dead code、 bonsai_tags 一本化)。
 * Sess9 PR-3 で Alert.alert を自前 tag-edit 全画面に置換 (素っ気ない popup 解消、
 * iOS/Android 共に push transition で統一、 ADR-0024 §Notes Amended 整合)。
 */
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  ON_BRAND,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { getDb } from '@/src/db/db';
import { type TagRecord } from '@/src/db/tagRepository';

export default function TagsManagerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const [tags, setTags] = React.useState<TagRecord[]>([]);

  const reload = React.useCallback(async () => {
    const db = await getDb();
    const rows = await db.getAllAsync<TagRecord>(
      'SELECT id, name, name_normalized as nameNormalized, created_at as createdAt FROM tags ORDER BY created_at DESC',
    );
    setTags(rows);
  }, []);

  // タグ編集画面から戻った時にも反映するため focus 毎に reload。
  useFocusEffect(
    React.useCallback(() => {
      reload().catch(() => setTags([]));
    }, [reload]),
  );

  const openAdd = () => {
    router.push('/tag-edit' as Href);
  };

  const openEdit = (tag: TagRecord) => {
    router.push(
      `/tag-edit?tagId=${encodeURIComponent(tag.id)}&initialName=${encodeURIComponent(tag.name)}` as Href,
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('tagEditTitleAdd')}
          testID="e2e_tags_add_open"
          style={styles.addBtn}
          onPress={openAdd}
        >
          <ThemedText style={styles.addBtnText}>+ {t('tagEditTitleAdd')}</ThemedText>
        </Pressable>

        {tags.length === 0 && <ThemedText style={styles.empty}>{t('tagsEmpty')}</ThemedText>}

        {tags.map((tg) => (
          <Pressable
            key={tg.id}
            accessibilityRole="button"
            accessibilityLabel={tg.name}
            testID={`e2e_tags_row_${tg.id}`}
            style={styles.row}
            onPress={() => openEdit(tg)}
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
  desc: { fontSize: 13, color: TEXT_SECONDARY, marginBottom: 12, lineHeight: 18 },
  addBtn: {
    paddingVertical: 14,
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  addBtnText: { color: ON_BRAND, fontSize: 17, fontWeight: '600', letterSpacing: 0.5 },
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
});
