/**
 * 盆栽タブ index (ADR-0020 Phase 2、Claude Design `home-screens.jsx HomeScreen` 整合)。
 *
 * 構造:
 * - SearchHeader (タイトル「盆栽手帳」+ 検索 + 屋外モードトグル + 複数選択トグル)
 * - HomeFilterTabs (すべて + 既存タグ chip、横スクロール)
 * - FlatList<BonsaiCard> (写真サムネ + 名前 + 樹種 + 樹形 + 最後の水やり / 剪定からの日数)
 * - selectMode true 時: 下部 SelectionToolbar (一括記録 / 予定追加)、FAB 非表示
 * - selectMode false 時: FAB (+) (盆栽新規登録、右下、bottom 96px = TabBar 高さ + 余白)
 *
 * Empty State: HomeEmptyScreen 整合 (PotIcon + タイトル + 説明 + 「+ 盆栽を登録」フル幅 CTA)
 *
 * Phase 9 で AdBanner を本ファイル末尾に配置済 (ADR-0010「ホーム下部のみ」、Repolog 同等構成)。
 *
 * mockup v1.0 02-Home.html 整合 (一括予定追加フロー、PR 1 UI 基盤):
 * - 長押しで selectMode 入り (Pressable.onLongPress、500ms default)
 * - SearchHeader「複数選択 / キャンセル」テキストボタンでも selectMode トグル
 * - selectMode 中の BonsaiCard 短押し → toggle、長押し → no-op (既に selectMode 中)
 * - SelectionToolbar 「予定追加」ボタンは PR 2 で BulkWorkPickerSheet を呼び出し配線予定
 * - SelectionToolbar 「一括記録」ボタンは disabled (Issue で BulkLogConfirmSheet 実装後に enable)
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
import { SelectionToolbar } from '@/src/features/bonsai/SelectionToolbar';
import { getDaysSinceLastWatering, toLocalDateKey } from '@/src/features/watering/wateringHeatmap';

const ALL_FILTER_ID = 'ALL';

// Issue #256: AdBanner の概算高さ (INLINE_ADAPTIVE_BANNER + maxHeight=90、Repolog 同等)。
// Free user 表示時の FAB / FlatList paddingBottom 計算に使用。Pro user 時は AdBanner 非表示
// で実態より少し大きい値だが、画面下部の余白として許容。
const AD_BANNER_HEIGHT_APPROX = 60;

// SelectionToolbar 高さ (本コンポーネントの minHeight 56 と一致)
const SELECTION_TOOLBAR_HEIGHT = 56;

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
  // Issue #256: TabBar 高さ (safe-area inset.bottom 込み) を取得して FAB / FlatList の
  // bottom 計算に使用。これがないと FAB が TabBar / AdBanner の下に隠れる。
  const tabBarHeight = useBottomTabBarHeight();
  const [items, setItems] = useState<BonsaiCardData[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>(ALL_FILTER_ID);
  const [loading, setLoading] = useState(true);
  // mockups v1.0 02-Home.html `initialSelectMode` 整合: 複数選択モード state。
  const [selectMode, setSelectMode] = useState(false);
  // mockups v1.0 02-Home.html `selected` Set<id> 整合: 選択中の盆栽 ID 集合。
  // selectMode false 時は常に空 (toggle で同期)、selectMode true 時のみ追加・削除可能。
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const tzOffsetMin = getTzOffsetMin();
      const todayLocalKey = toLocalDateKey(nowUtc() as string, tzOffsetMin);
      // Issue #253: selectedFilter が tag id のとき、bonsaiRepository の M:N フィルタに渡す。
      // ALL_FILTER_ID のときは全件取得 (options 未指定)。
      const tagIds = selectedFilter === ALL_FILTER_ID ? undefined : [selectedFilter];
      const [bonsai, recentTags] = await Promise.all([
        getAllActiveBonsaiWithSpecies(lang, tagIds ? { tagIds } : undefined),
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
  }, [lang, t, selectedFilter]);

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

  // Issue #253: フィルタは bonsaiRepository.getAllActiveBonsaiWithSpecies(lang, { tagIds })
  // で SQL 側に委譲済 (M:N JOIN + AND セマンティクス)。クライアント側の追加フィルタは不要。
  const visibleItems = items;

  // selectMode の入り / 終わりは selectedIds をリセット (mockup `cancelSelect` / `enterSelect` 整合)。
  const toggleSelectMode = useCallback(() => {
    setSelectMode((prev) => !prev);
    setSelectedIds(new Set());
  }, []);

  // BonsaiCard 短押し: selectMode 時 toggle、通常時 router.push (mockup `onCardClick` 整合)。
  const handleCardPress = useCallback(
    (id: string) => {
      if (selectMode) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      } else {
        router.push(`/(tabs)/bonsai/${id}` as Href);
      }
    },
    [selectMode, router],
  );

  // BonsaiCard 長押し: selectMode 入り + 当該カードを選択 (mockup `onCardLongPress` 整合)。
  // selectMode 中の長押しは no-op (既に選択モード)。
  const handleCardLongPress = useCallback(
    (id: string) => {
      if (selectMode) return;
      setSelectMode(true);
      setSelectedIds(new Set([id]));
    },
    [selectMode],
  );

  // SelectionToolbar 「予定追加」: PR 2 で BulkWorkPickerSheet を呼び出し配線予定。
  // PR 1 では state のみ (実機タップ時にトーストや BottomSheet 表示は未配線)。
  const handleBulkSchedule = useCallback(() => {
    // PR 2 で BulkWorkPickerSheet を表示する step state に遷移する配線を追加予定。
  }, []);

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

  // selectMode 中は SelectionToolbar 分の paddingBottom を加算 (FAB は隠れる)。
  // selectMode 中の SelectionToolbar の bottom は tabBarHeight + AdBanner で
  // TabBar / AdBanner の上に配置 (mockup home-screens.jsx の `bottom: 56 + 34` 整合)。
  const listPaddingBottom =
    tabBarHeight + AD_BANNER_HEIGHT_APPROX + 32 + (selectMode ? SELECTION_TOOLBAR_HEIGHT : 0);
  const toolbarBottom = tabBarHeight + AD_BANNER_HEIGHT_APPROX;

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_bonsai_home_list"
    >
      <SearchHeader
        title={t('bonsaiBookTitle')}
        testIdSuffix="bonsai_home"
        selectMode={selectMode}
        onSelectPress={toggleSelectMode}
      />
      <HomeFilterTabs
        chips={filterChips}
        selectedId={selectedFilter}
        onSelect={setSelectedFilter}
        testID="e2e_home_filter_tabs"
      />
      <FlatList
        data={visibleItems}
        keyExtractor={(it) => it.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: listPaddingBottom }]}
        renderItem={({ item }) => (
          <BonsaiCard
            data={item}
            onPress={handleCardPress}
            onLongPress={handleCardLongPress}
            selecting={selectMode}
            selected={selectedIds.has(item.id)}
            testID={`e2e_bonsai_card_${item.id}`}
          />
        )}
      />
      {!selectMode && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('bonsaiCreateNew')}
          style={[
            styles.fab,
            {
              backgroundColor: c.tint,
              // Issue #256: TabBar + AdBanner の上に FAB を配置 (元は bottom:24 で隠れていた)
              bottom: tabBarHeight + AD_BANNER_HEIGHT_APPROX + 16,
            },
          ]}
          onPress={() => router.push('/(tabs)/bonsai/new' as Href)}
          testID="e2e_home_fab_create"
        >
          <PlusIcon size={28} color={ON_BRAND} />
        </Pressable>
      )}
      {selectMode && (
        <View style={[styles.toolbarWrap, { bottom: toolbarBottom }]}>
          <SelectionToolbar
            count={selectedIds.size}
            onBulkSchedule={handleBulkSchedule}
            testID="e2e_home_selection_toolbar"
          />
        </View>
      )}
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
  // mockup v1.0 home-screens.jsx HomeEmptyScreen 整合 (B4 PR、Empty 専用の強調 CTA、72dp / radius 14 / fontSize 20)
  emptyCta: {
    height: 72,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyCtaText: { fontSize: 20, fontWeight: '500', letterSpacing: 0.8 },
  // Issue #256: paddingBottom は実行時に tabBarHeight + AdBanner 分加算 (inline style)
  listContent: { paddingTop: 12 },
  fab: {
    position: 'absolute',
    right: 16,
    // Issue #256: bottom は実行時に tabBarHeight + AdBanner 分加算 (inline style)
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
  // SelectionToolbar 配置: 絶対配置、TabBar + AdBanner の上、左右いっぱい (mockup `position:'absolute'`, `bottom: 56+34` 整合)
  toolbarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
