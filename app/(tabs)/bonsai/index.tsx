/**
 * 盆栽タブ index (ADR-0020 Phase 2、 Claude Design `home-screens.jsx HomeScreen` 整合)。
 *
 * 構造:
 * - SearchHeader (タイトル「盆栽手帳」 + 検索 + 設定)
 * - HomeFilterTabs (タグ chip 5 件、 横スクロール)
 * - FlatList<BonsaiCard> (写真サムネ + 名前 + 樹種 + 樹形 + 最後の水やり / 剪定からの日数)
 * - FAB (+) (盆栽新規登録、 右下、 bottom = TabBar + AdBanner + 16px)
 *
 * Empty State: HomeEmptyScreen 整合 (PotIcon + タイトル + 説明 + 「+ 盆栽を登録」 フル幅 CTA)
 *
 * Phase 9 で AdBanner を本ファイル末尾に配置済 (ADR-0010「ホーム下部のみ」、 Repolog 同等構成)。
 *
 * ADR-0025 案 X 後 Sess8 PR-5 追補 (2026-05-18、 user 真意「bonsai-select-mode 実機上不要」 反映):
 * - 盆栽カード長押し → selectMode 経路 **完全廃止** (mockup v1.0 02-Home.html `initialSelectMode` 経路撤回)
 * - SelectionToolbar component **完全削除**
 * - 一括予定追加 / 一括記録は **予定タブ FAB / 記録タブ tap → bonsai-multi-select modal** に集約
 * - 盆栽タブの責務は「一覧表示 + 新規登録 (FAB)」 のみに simplify
 */
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
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
import { toLocalDateKey } from '@/src/features/watering/wateringHeatmap';
import { usePickerStore } from '@/src/stores/pickerStore';

const ALL_FILTER_ID = 'ALL';

// Issue #256: AdBanner の概算高さ (INLINE_ADAPTIVE_BANNER + maxHeight=90、 Repolog 同等)。
const AD_BANNER_HEIGHT_APPROX = 60;

/**
 * 経過日数を「3日」 「2週間」 「5ヶ月」 など短い文字列にフォーマット。
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
 * Bonsai 1 件分の card data を構築 (T1-10 PR で BonsaiCard 縦型 220+3 段構造に整合)。
 */
async function buildCardData(
  b: BonsaiWithSpecies,
  todayLocalKey: string,
  tzOffsetMin: number,
  t: ReturnType<typeof useTranslation>['t'],
): Promise<BonsaiCardData> {
  const [cover, events] = await Promise.all([getCoverPhoto(b.id), getActiveEventsByBonsai(b.id)]);

  let lastWateringEv: { utc: string; note: string | null } | null = null;
  let lastPruningEv: { utc: string; note: string | null } | null = null;
  for (const e of events) {
    if (e.status !== 'logged' || e.deletedAt != null) continue;
    if (e.type === 'watering') {
      if (lastWateringEv == null || e.occurredAtUtc > lastWateringEv.utc) {
        lastWateringEv = { utc: e.occurredAtUtc, note: e.note ?? null };
      }
    } else if (e.type === 'pruning') {
      if (lastPruningEv == null || e.occurredAtUtc > lastPruningEv.utc) {
        lastPruningEv = { utc: e.occurredAtUtc, note: e.note ?? null };
      }
    }
  }

  let lastAction: BonsaiCardData['lastAction'] = null;
  const winner =
    lastWateringEv == null && lastPruningEv == null
      ? null
      : lastWateringEv == null
        ? { kind: 'pruning' as const, ev: lastPruningEv! }
        : lastPruningEv == null
          ? { kind: 'watering' as const, ev: lastWateringEv }
          : lastWateringEv.utc >= lastPruningEv.utc
            ? { kind: 'watering' as const, ev: lastWateringEv }
            : { kind: 'pruning' as const, ev: lastPruningEv };
  if (winner != null) {
    const lastKey = toLocalDateKey(winner.ev.utc, tzOffsetMin);
    const todayMs = Date.parse(`${todayLocalKey}T00:00:00Z`);
    const lastMs = Date.parse(`${lastKey}T00:00:00Z`);
    const days = Math.max(0, Math.floor((todayMs - lastMs) / (24 * 60 * 60 * 1000)));
    const elapsed = formatElapsed(days, t) ?? '';
    lastAction = { kind: winner.kind, elapsed, note: winner.ev.note };
  }

  const ageText =
    b.estimatedAge != null && b.estimatedAge > 0
      ? t('ageEstimatedFormat').replace('{years}', String(b.estimatedAge))
      : null;

  return {
    id: b.id,
    name: b.name,
    coverUri: cover?.absoluteUri ?? null,
    speciesCommonName: b.species?.commonName ?? null,
    lastAction,
    ageText,
  };
}

export default function BonsaiHomeScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const tabBarHeight = useBottomTabBarHeight();
  const [items, setItems] = useState<BonsaiCardData[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>(ALL_FILTER_ID);
  const [loading, setLoading] = useState(true);

  const openCreateSheet = useCallback(() => {
    router.push('/bonsai-new' as Href);
  }, [router]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const tzOffsetMin = getTzOffsetMin();
      const todayLocalKey = toLocalDateKey(nowUtc() as string, tzOffsetMin);
      const tagIds = selectedFilter === ALL_FILTER_ID ? undefined : [selectedFilter];
      const [bonsai, recentTags] = await Promise.all([
        getAllActiveBonsaiWithSpecies(lang, tagIds ? { tagIds } : undefined),
        getRecentTags(5),
      ]);
      setTags(recentTags);
      const cards = await Promise.all(
        bonsai.map((b) => buildCardData(b, todayLocalKey, tzOffsetMin, t)),
      );
      setItems(cards);
    } finally {
      setLoading(false);
    }
  }, [lang, t, selectedFilter]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const filterChips = useMemo<FilterChip[]>(
    () => tags.map((tg) => ({ id: tg.id, label: tg.name })),
    [tags],
  );

  const handleChipSelect = useCallback((id: string) => {
    setSelectedFilter((prev) => (prev === id ? ALL_FILTER_ID : id));
  }, []);

  const visibleItems = items;

  const handleCardPress = useCallback(
    (id: string) => {
      router.push(`/(tabs)/bonsai/${id}` as Href);
    },
    [router],
  );

  // bonsai-new modal から戻った時に新規盆栽 ID を消費 → reload + 詳細画面遷移。
  useFocusEffect(
    useCallback(() => {
      const newBonsaiId = usePickerStore.getState().consumeBonsaiCreateResult();
      if (newBonsaiId != null) {
        void reload();
        router.push(`/(tabs)/bonsai/${newBonsaiId}` as Href);
      }
    }, [router, reload]),
  );

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
            onPress={openCreateSheet}
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

  const listPaddingBottom = tabBarHeight + AD_BANNER_HEIGHT_APPROX + 32;

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_bonsai_home_list"
    >
      <SearchHeader title={t('bonsaiBookTitle')} testIdSuffix="bonsai_home" />
      <HomeFilterTabs
        chips={filterChips}
        selectedId={selectedFilter}
        onSelect={handleChipSelect}
        testID="e2e_home_filter_tabs"
      />
      <FlatList
        data={visibleItems}
        keyExtractor={(it) => it.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: listPaddingBottom }]}
        renderItem={({ item }) => (
          <BonsaiCard data={item} onPress={handleCardPress} testID={`e2e_bonsai_card_${item.id}`} />
        )}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('bonsaiCreateNew')}
        style={[
          styles.fab,
          {
            backgroundColor: c.tint,
            bottom: tabBarHeight + AD_BANNER_HEIGHT_APPROX + 16,
          },
        ]}
        onPress={openCreateSheet}
        testID="e2e_home_fab_create"
      >
        <PlusIcon size={28} color={ON_BRAND} />
      </Pressable>
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
    height: 72,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyCtaText: { fontSize: 20, fontWeight: '500', letterSpacing: 0.8 },
  listContent: { paddingTop: 12 },
  fab: {
    position: 'absolute',
    right: 16,
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
