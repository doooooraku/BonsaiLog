import { useFocusEffect, useRouter, type Href } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTranslation } from '@/src/core/i18n/i18n';
import { BORDER_DEFAULT, ON_BRAND, TEXT_SECONDARY } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { OutdoorToggleButton } from '@/src/features/theme/OutdoorToggleButton';

import { getAllActiveBonsaiWithSpecies, type BonsaiWithSpecies } from '@/src/db/bonsaiRepository';

/**
 * 盆栽一覧画面 (Issue #14 AC3 達成、P2-01 PR-D)。
 * - アクティブな盆栽を updated_at 降順で表示
 * - タップ → 詳細画面
 * - 「+」ボタン → 新規登録画面
 *
 * Claude Design `home-screens.jsx` BonsaiCard 整合 (ADR-0019 §149-159 部分採用):
 *   盆栽名 NotoSerifJP_500Medium 22pt + 樹種 NotoSansJP 13pt + style mono 11pt。
 *   写真サムネイルは別 PR で追加 (cover_photo_id 連携必要)。
 */
export default function BonsaiListScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const c = useColors();
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
      <ThemedView style={[styles.container, { backgroundColor: c.background }]}>
        <OutdoorToggleButton testIdSuffix="bonsai_list_outdoor_toggle" />
        <ThemedText>{t('loading')}</ThemedText>
      </ThemedView>
    );
  }

  if (items.length === 0) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: c.background }]}>
        <OutdoorToggleButton testIdSuffix="bonsai_list_outdoor_toggle" />
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
    <ThemedView style={[styles.listContainer, { backgroundColor: c.background }]}>
      {/* F-15 Phase I (Issue #32, ADR-0015 AC4 OA1): 屋外モードトグル */}
      <OutdoorToggleButton testIdSuffix="bonsai_list_outdoor_toggle" />
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
            <ThemedText style={styles.cardName}>{item.name}</ThemedText>
            {item.species && (
              <ThemedText style={styles.cardSubtitle}>{item.species.commonName}</ThemedText>
            )}
            {item.style && (
              <View style={styles.cardMetaRow}>
                <ThemedText style={styles.cardMeta}>{item.style}</ThemedText>
              </View>
            )}
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
  // backgroundColor は useColors の c.background で動的指定
  listContainer: { flex: 1 },
  listContent: { padding: 16, gap: 12 },
  emptyDesc: { textAlign: 'center', opacity: 0.7, marginBottom: 16 },
  cta: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1F3A2E',
  },
  ctaText: { color: ON_BRAND, fontSize: 17, fontWeight: '500' },
  // Claude Design `BonsaiCard` 整合: NotoSerifJP 22/28、border 16
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    backgroundColor: '#FFFFFF',
    gap: 4,
  },
  cardName: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0.4,
  },
  cardSubtitle: { fontSize: 13, lineHeight: 20, color: TEXT_SECONDARY },
  cardMetaRow: { marginTop: 2 },
  cardMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    letterSpacing: 0.7,
    opacity: 0.7,
  },
  // FAB: 直径 56 円形 (radius 28 = 56/2、pill 9999 ではない)
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1F3A2E',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: ON_BRAND, fontSize: 28, lineHeight: 32 },
});
