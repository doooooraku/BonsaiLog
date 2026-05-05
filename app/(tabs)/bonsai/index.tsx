/**
 * 盆栽タブ index (ADR-0020 Phase 2、Claude Design `home-screens.jsx HomeScreen` 整合)。
 *
 * 構造:
 * - SearchHeader (タイトル「盆栽手帳」+ 検索 + 屋外モードトグル)
 * - HomeFilterTabs (すべて + 既存タグ chip、横スクロール)
 * - FlatList<BonsaiCard> (写真サムネ + 名前 + 樹種 + 樹形 + 最後の水やり / 剪定からの日数)
 * - FAB (+) (盆栽新規登録、右下、bottom 96px = TabBar 高さ + 余白)
 *
 * Empty State: HomeEmptyScreen 整合 (PotIcon + タイトル + 説明 + 「+ 盆栽を登録」フル幅 CTA)
 *
 * Phase 9 で AdBanner を本ファイル末尾に配置予定 (本 PR では未配置)。
 */
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PlusIcon, PotIcon } from '@/src/components/icons';
import { getTzOffsetMin, nowUtc } from '@/src/core/datetime';
import { useTranslation } from '@/src/core/i18n/i18n';
import { ON_BRAND } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { getAllActiveBonsaiWithSpecies, type BonsaiWithSpecies } from '@/src/db/bonsaiRepository';
import { getActiveEventsByBonsai } from '@/src/db/eventRepository';
import { getCoverPhoto } from '@/src/db/photoRepository';
import { getRecentTags, type TagRecord } from '@/src/db/tagRepository';
import { AdBanner } from '@/src/features/ads/AdBanner';
import { BonsaiCard, type BonsaiCardData } from '@/src/features/bonsai/BonsaiCard';
import { HomeFilterTabs, type FilterChip } from '@/src/features/bonsai/HomeFilterTabs';
import { SearchHeader } from '@/src/features/bonsai/SearchHeader';
import { getDaysSinceLastWatering, toLocalDateKey } from '@/src/features/watering/wateringHeatmap';

const ALL_FILTER_ID = 'ALL';

/**
 * 経過日数を「3日」「2週間」「5ヶ月」など短い文字列にフォーマット。
 * Claude Design home-screens.jsx の `b.water='3日' b.prune='2週間'` 表記に整合。
 */
function formatElapsed(
  days: number | null,
  t: ReturnType<typeof useTranslation>['t'],
): string | null {
  if (days == null) return null;
  if (days === 0) return t('elapsedToday');
  if (days < 7) return t('elapsedDays').replace('{days}', String(days));
  if (days < 30) return t('elapsedWeeks').replace('{weeks}', String(Math.floor(days / 7)));
  if (days < 365) return t('elapsedMonths').replace('{months}', String(Math.floor(days / 30)));
  return t('elapsedYears').replace('{years}', String(Math.floor(days / 365)));
}

/**
 * Bonsai 1 件分の card data (cover photo URI + last watering/pruning text) を構築。
 */
async function buildCardData(
  b: BonsaiWithSpecies,
  todayLocalKey: string,
  tzOffsetMin: number,
  t: ReturnType<typeof useTranslation>['t'],
): Promise<BonsaiCardData> {
  const [cover, events] = await Promise.all([getCoverPhoto(b.id), getActiveEventsByBonsai(b.id)]);
  const wateringDays = getDaysSinceLastWatering(events, todayLocalKey, tzOffsetMin);
  // pruning は wateringHeatmap helper を流用できないため inline で計算。
  let pruningDays: number | null = null;
  let lastPruningUtc: string | null = null;
  for (const e of events) {
    if (e.type !== 'pruning' || e.status !== 'logged' || e.deletedAt != null) continue;
    if (lastPruningUtc == null || e.occurredAtUtc > lastPruningUtc) {
      lastPruningUtc = e.occurredAtUtc;
    }
  }
  if (lastPruningUtc != null) {
    const lastKey = toLocalDateKey(lastPruningUtc, tzOffsetMin);
    // diffDayKeys は wateringHeatmap.ts の private、再実装回避のため簡易計算。
    const todayMs = Date.parse(`${todayLocalKey}T00:00:00Z`);
    const lastMs = Date.parse(`${lastKey}T00:00:00Z`);
    pruningDays = Math.max(0, Math.floor((todayMs - lastMs) / (24 * 60 * 60 * 1000)));
  }

  const lastWateringText =
    wateringDays != null
      ? t('homeCardLastWatering').replace('{elapsed}', formatElapsed(wateringDays, t) ?? '')
      : null;
  const lastPruningText =
    pruningDays != null
      ? t('homeCardLastPruning').replace('{elapsed}', formatElapsed(pruningDays, t) ?? '')
      : null;

  return {
    id: b.id,
    name: b.name,
    speciesCommonName: b.species?.commonName ?? null,
    speciesScientificName: b.species?.scientificName ?? null,
    styleLabel: b.style ?? null,
    coverUri: cover?.absoluteUri ?? null,
    lastWateringText,
    lastPruningText,
  };
}

export default function BonsaiHomeScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const [items, setItems] = useState<BonsaiCardData[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>(ALL_FILTER_ID);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const tzOffsetMin = getTzOffsetMin();
      const todayLocalKey = toLocalDateKey(nowUtc() as string, tzOffsetMin);
      const [bonsai, recentTags] = await Promise.all([
        getAllActiveBonsaiWithSpecies(lang),
        getRecentTags(8),
      ]);
      setTags(recentTags);
      const cards = await Promise.all(
        bonsai.map((b) => buildCardData(b, todayLocalKey, tzOffsetMin, t)),
      );
      setItems(cards);
    } finally {
      setLoading(false);
    }
  }, [lang, t]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const filterChips = useMemo<FilterChip[]>(
    () => [
      { id: ALL_FILTER_ID, label: t('homeFilterAll') },
      ...tags.map((tg) => ({ id: tg.id, label: tg.name })),
    ],
    [tags, t],
  );

  // 簡易: 「すべて」以外の chip は v1.x で events_tags の bonsaiId 集合フィルタを実装予定。
  // Phase 2 では UI のみ提供し、選択は表示のみ。
  const visibleItems = items;

  if (loading) {
    return (
      <ThemedView
        style={[styles.container, { backgroundColor: c.background }]}
        testID="e2e_bonsai_home_loading"
      >
        <SearchHeader title={t('bonsaiBookTitle')} testIdSuffix="bonsai_home" />
        <View style={styles.loadingBox}>
          <ThemedText>{t('loading')}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (items.length === 0) {
    return (
      <ThemedView
        style={[styles.container, { backgroundColor: c.background }]}
        testID="e2e_bonsai_home_empty"
      >
        <SearchHeader title={t('bonsaiBookTitle')} testIdSuffix="bonsai_home" />
        <View style={styles.emptyContent}>
          <PotIcon size={200} color={c.tint} />
          <ThemedText style={[styles.emptyTitle, { color: c.text }]}>
            {t('homeEmptyTitle')}
          </ThemedText>
          <ThemedText style={[styles.emptyBody, { color: c.textSecondary }]}>
            {t('homeEmptyBody')}
          </ThemedText>
        </View>
        <View style={styles.emptyCtaWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('homeEmptyCta')}
            style={[styles.emptyCta, { backgroundColor: c.tint }]}
            onPress={() => router.push('/(tabs)/bonsai/new' as Href)}
            testID="e2e_home_empty_cta"
          >
            <PlusIcon size={20} color={ON_BRAND} />
            <ThemedText style={[styles.emptyCtaText, { color: ON_BRAND }]}>
              {t('homeEmptyCta')}
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_bonsai_home_list"
    >
      <SearchHeader title={t('bonsaiBookTitle')} testIdSuffix="bonsai_home" />
      <HomeFilterTabs
        chips={filterChips}
        selectedId={selectedFilter}
        onSelect={setSelectedFilter}
        testID="e2e_home_filter_tabs"
      />
      <FlatList
        data={visibleItems}
        keyExtractor={(it) => it.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <BonsaiCard
            data={item}
            onPress={(id) => router.push(`/(tabs)/bonsai/${id}` as Href)}
            testID={`e2e_bonsai_card_${item.id}`}
          />
        )}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('bonsaiCreateNew')}
        style={[styles.fab, { backgroundColor: c.tint }]}
        onPress={() => router.push('/(tabs)/bonsai/new' as Href)}
        testID="e2e_home_fab_create"
      >
        <PlusIcon size={28} color={ON_BRAND} />
      </Pressable>
      {/* ADR-0020 Phase 9: AdBanner を盆栽タブ最下部に配置 (ADR-0010「ホーム下部のみ」、Repolog 同等構成) */}
      <AdBanner />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyTitle: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 24,
    lineHeight: 34,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: 16,
  },
  emptyBody: { fontSize: 16, lineHeight: 26, textAlign: 'center', maxWidth: 300 },
  emptyCtaWrap: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyCta: {
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyCtaText: { fontSize: 17, fontWeight: '500', letterSpacing: 0.5 },
  listContent: { paddingTop: 12, paddingBottom: 96 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
