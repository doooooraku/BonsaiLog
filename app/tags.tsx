/**
 * F-09 タグ管理画面 (Issue #31 / ADR-0008 + §Notes Amended 2026-05-18)。
 *
 * 範囲:
 * - タグ一覧 (createdAt DESC) + 使用件数 + 最終使用日
 * - 「+ タグを追加」 button → /tag-edit 全画面 (Sess9 PR-3)
 * - 行 tap → /tag-edit?tagId=xxx&initialName=yyy 全画面 (旧 Alert.alert 置換)
 *
 * Sess9 進化:
 * - PR-1: event_tags 完全廃止 (dead code、 bonsai_tags 一本化)
 * - PR-3: Alert.alert を自前 tag-edit 全画面に置換 (素っ気ない popup 解消)
 * - PR-7: 情報設計刷新 — 作成日 → 使用件数 + 最終使用日 (Bear Notes パターン、 user benefit 最大化)
 */
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { elapsedDaysFromIsoUtc, formatElapsedDays } from '@/src/core/datetime';
import { useTranslation } from '@/src/core/i18n/i18n';
import {
  BG_SURFACE,
  BORDER_DEFAULT,
  BRAND_GREEN,
  ON_BRAND,
  TEXT_MUTED,
  TEXT_SECONDARY,
} from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { getTagsWithStats, type TagWithStats } from '@/src/db/tagRepository';

export default function TagsManagerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const [tags, setTags] = React.useState<TagWithStats[]>([]);

  const reload = React.useCallback(async () => {
    const rows = await getTagsWithStats();
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

  const openEdit = (tag: TagWithStats) => {
    router.push(
      `/tag-edit?tagId=${encodeURIComponent(tag.id)}&initialName=${encodeURIComponent(tag.name)}` as Href,
    );
  };

  /** Sess9 PR-9 (user Q3 拡張 2、 Apple Notes パターン): row 長押し → タグ別盆栽一覧へ。 */
  const openBonsaiList = (tag: TagWithStats) => {
    if (tag.usageCount === 0) return; // 0 件タグは長押し動作なし (Empty 画面回避)
    router.push(
      `/tag-bonsai-list?tagId=${encodeURIComponent(tag.id)}&tagName=${encodeURIComponent(tag.name)}` as Href,
    );
  };

  /**
   * Sess9 PR-7: row right value を「N 件 · 3 日前に使用」 形式で組み立て。
   *
   * - 未使用 (count = 0 or lastUsed null): 「N 件 · 未使用」
   * - 今日使用 (days = 0): 「N 件 · 今日使用」 (日本語文法「今日前に使用」 NG 回避)
   * - 過去使用 (days > 0): 「N 件 · 3 日前に使用」
   */
  const buildStatsLabel = (tag: TagWithStats): string => {
    const countLabel = t('tagsUsageCountFormat').replace('{count}', String(tag.usageCount));
    if (tag.usageCount === 0 || tag.lastUsedAt == null) {
      return `${countLabel} · ${t('tagsLastUsedNever')}`;
    }
    const days = elapsedDaysFromIsoUtc(tag.lastUsedAt);
    if (days === 0) {
      return `${countLabel} · ${t('tagsLastUsedToday')}`;
    }
    const elapsed = formatElapsedDays(days, t) ?? '';
    return `${countLabel} · ${t('tagsLastUsedFormat').replace('{relative}', elapsed)}`;
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
            accessibilityLabel={`${tg.name} ${tg.usageCount}件`}
            accessibilityHint={tg.usageCount > 0 ? t('tagsRowLongPressHint') : undefined}
            testID={`e2e_tags_row_${tg.id}`}
            style={styles.row}
            onPress={() => openEdit(tg)}
            onLongPress={() => openBonsaiList(tg)}
          >
            <ThemedText type="defaultSemiBold">{tg.name}</ThemedText>
            <ThemedText style={[styles.rowStats, tg.usageCount === 0 && styles.rowStatsUnused]}>
              {buildStatsLabel(tg)}
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
  rowStats: { fontSize: 12, color: TEXT_SECONDARY },
  rowStatsUnused: { color: TEXT_MUTED, fontStyle: 'italic' },
});
