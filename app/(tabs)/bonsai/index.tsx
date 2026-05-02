import { useFocusEffect, useRouter, type Href } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';

import { getAllActiveBonsaiWithSpecies, type BonsaiWithSpecies } from '@/src/db/bonsaiRepository';

/**
 * 盆栽一覧画面 (Issue #14 AC3 達成、P2-01 PR-D)。
 * - アクティブな盆栽を updated_at 降順で表示
 * - タップ → 詳細画面
 * - 「+」ボタン → 新規登録画面
 */
export default function BonsaiListScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState<BonsaiWithSpecies[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getAllActiveBonsaiWithSpecies(lang);
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>{t('loading')}</ThemedText>
      </ThemedView>
    );
  }

  if (items.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">{t('bonsaiListEmptyTitle')}</ThemedText>
        <ThemedText style={styles.emptyDesc}>{t('bonsaiListEmptyDesc')}</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('bonsaiCreateNew')}
          style={styles.cta}
          onPress={() => router.push('/(tabs)/bonsai/new' as Href)}
        >
          <ThemedText style={styles.ctaText}>+ {t('bonsaiCreateNew')}</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.listContainer}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.name}
            style={styles.card}
            onPress={() => router.push(`/(tabs)/bonsai/${item.id}` as Href)}
          >
            <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
            {item.species && (
              <ThemedText style={styles.cardSubtitle}>{item.species.commonName}</ThemedText>
            )}
            {item.style && <ThemedText style={styles.cardMeta}>{item.style}</ThemedText>}
          </Pressable>
        )}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('bonsaiCreateNew')}
        style={styles.fab}
        onPress={() => router.push('/(tabs)/bonsai/new' as Href)}
      >
        <ThemedText style={styles.fabText}>+</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  listContainer: { flex: 1 },
  listContent: { padding: 16, gap: 12 },
  emptyDesc: { textAlign: 'center', opacity: 0.7, marginBottom: 16 },
  cta: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '500' },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 4,
  },
  cardSubtitle: { opacity: 0.8 },
  cardMeta: { fontSize: 12, opacity: 0.6 },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
});
