/**
 * タグ別盆栽一覧画面 (Sess9 PR-9、 user Q3 拡張 2、 Apple Notes パターン)。
 *
 * 動線: タグ管理画面 → タグ row 長押し → 本画面
 * URL: /tag-bonsai-list?tagId=xxx&tagName=yyy
 *
 * 表示:
 * - Header: 「タグ名 の盆栽 (N 件)」 (dynamic title)
 * - BonsaiCard list (Sess9 PR-1 で bonsai_tags JOIN filter SQL に修正済の関数を使用)
 * - tap で /(tabs)/bonsai/[id] (詳細画面) に遷移
 * - 0 件時の empty state (theoretically never trigger だが安全弁)
 */
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getTzOffsetMin, nowUtc } from '@/src/core/datetime';
import { useTranslation } from '@/src/core/i18n/i18n';
import { useColors } from '@/src/core/theme/useColors';
import { getAllActiveBonsaiWithSpecies } from '@/src/db/bonsaiRepository';
import { BonsaiCard, type BonsaiCardData } from '@/src/features/bonsai/BonsaiCard';
import { buildBonsaiCardData } from '@/src/features/bonsai/cardDataBuilder';
import { toLocalDateKey } from '@/src/features/watering/wateringHeatmap';

export default function TagBonsaiListScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const params = useLocalSearchParams<{ tagId?: string; tagName?: string }>();
  const tagId = typeof params.tagId === 'string' ? params.tagId : null;
  const tagName = typeof params.tagName === 'string' ? params.tagName : '';
  const [items, setItems] = useState<BonsaiCardData[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (tagId == null) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const tzOffsetMin = getTzOffsetMin();
      const todayLocalKey = toLocalDateKey(nowUtc() as string, tzOffsetMin);
      const bonsai = await getAllActiveBonsaiWithSpecies(lang, { tagIds: [tagId] });
      const cards = await Promise.all(
        bonsai.map((b) => buildBonsaiCardData(b, todayLocalKey, tzOffsetMin, t)),
      );
      setItems(cards);
    } finally {
      setLoading(false);
    }
  }, [tagId, lang, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const headerTitle = useMemo(
    () =>
      t('tagBonsaiListTitle')
        .replace('{tagName}', tagName)
        .replace('{count}', String(items.length)),
    [t, tagName, items.length],
  );

  const handleCardPress = useCallback(
    (id: string) => {
      router.push(`/(tabs)/bonsai/${id}` as Href);
    },
    [router],
  );

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_tag_bonsai_list"
    >
      <Stack.Screen options={{ title: loading ? tagName : headerTitle }} />
      {!loading && items.length === 0 && (
        <View style={styles.emptyWrap}>
          <ThemedText style={[styles.emptyText, { color: c.textSecondary }]}>
            {t('tagBonsaiListEmpty')}
          </ThemedText>
        </View>
      )}
      {items.length > 0 && (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <BonsaiCard
              data={item}
              onPress={handleCardPress}
              testID={`e2e_tag_bonsai_card_${item.id}`}
            />
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingTop: 12, paddingBottom: 32 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
