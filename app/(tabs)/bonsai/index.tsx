/**
 * 盆栽タブ index (ADR-0020 Phase 2、Claude Design `home-screens.jsx HomeScreen` 整合)。
 *
 * 構造:
 * - SearchHeader (タイトル「盆栽手帳」+ 検索 + 屋外モードトグル + 複数選択トグル)
 * - HomeFilterTabs (すべて + 既存タグ chip、横スクロール)
 * - FlatList<BonsaiCard> (写真サムネ + 名前 + 樹種 + 樹形 + 最後の水やり / 剪定からの日数)
 * - selectMode true 時: 下部 SelectionToolbar (一括記録 / 予定追加)、FAB 非表示
 * - selectMode false 時: FAB (+) (盆栽新規登録、右下、bottom 96px = TabBar 高さ + 余白)
 * - selectMode + 「予定追加」タップ時: BulkWorkPickerSheet (mode='schedule') → BulkScheduleDateSheet → bulkScheduleEvents
 * - selectMode + 「一括記録」タップ時: BulkWorkPickerSheet (mode='log') → BulkLogConfirmSheet → bulkLogEvents
 *
 * Empty State: HomeEmptyScreen 整合 (PotIcon + タイトル + 説明 + 「+ 盆栽を登録」フル幅 CTA)
 *
 * Phase 9 で AdBanner を本ファイル末尾に配置済 (ADR-0010「ホーム下部のみ」、Repolog 同等構成)。
 *
 * mockup v1.0 02-Home.html 整合 (一括予定追加 + 一括記録 フロー):
 * - 長押しで selectMode 入り (Pressable.onLongPress、500ms default)
 * - SearchHeader「複数選択 / キャンセル」テキストボタンでも selectMode トグル
 * - selectMode 中の BonsaiCard 短押し → toggle、長押し → no-op (既に selectMode 中)
 * - SelectionToolbar 「予定追加」 → BulkWorkPickerSheet (mode='schedule') → BulkScheduleDateSheet → bulkScheduleEvents
 * - SelectionToolbar 「一括記録」 → BulkWorkPickerSheet (mode='log') → BulkLogConfirmSheet → bulkLogEvents (Issue #343、G9 PR 1)
 */
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PlusIcon, PotIcon } from '@/src/components/icons';
import { getTzOffsetMin, nowUtc } from '@/src/core/datetime';
import { useTranslation } from '@/src/core/i18n/i18n';
import { ON_BRAND } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';
import { getAllActiveBonsaiWithSpecies, type BonsaiWithSpecies } from '@/src/db/bonsaiRepository';
import {
  bulkLogEvents,
  bulkScheduleEvents,
  getActiveEventsByBonsai,
} from '@/src/db/eventRepository';
import { getCoverPhoto } from '@/src/db/photoRepository';
import type { EventType } from '@/src/db/schema';
import { getRecentTags, type TagRecord } from '@/src/db/tagRepository';
import { AdBanner } from '@/src/features/ads/AdBanner';
import { BonsaiCard, type BonsaiCardData } from '@/src/features/bonsai/BonsaiCard';
import { HomeFilterTabs, type FilterChip } from '@/src/features/bonsai/HomeFilterTabs';
import { SearchHeader } from '@/src/features/bonsai/SearchHeader';
import { SelectionToolbar } from '@/src/features/bonsai/SelectionToolbar';
import { toLocalDateKey } from '@/src/features/watering/wateringHeatmap';
import { usePickerStore } from '@/src/stores/pickerStore';

const ALL_FILTER_ID = 'ALL';

// Issue #256: AdBanner の概算高さ (INLINE_ADAPTIVE_BANNER + maxHeight=90、Repolog 同等)。
// Free user 表示時の FAB / FlatList paddingBottom 計算に使用。Pro user 時は AdBanner 非表示
// で実態より少し大きい値だが、画面下部の余白として許容。
const AD_BANNER_HEIGHT_APPROX = 60;

// SelectionToolbar 高さ (本コンポーネントの minHeight 56 と一致)
const SELECTION_TOOLBAR_HEIGHT = 56;

// Phase G3a-G3b (ADR-0024 Accepted): bulk-work-picker / bulk-log-confirm / bulk-schedule-date
// は全 formSheet 化、caller では router.push + useFocusEffect 経路に統一 (bulkSched state 不要)。

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
 * Bonsai 1 件分の card data を構築 (T1-10 PR で BonsaiCard 縦型 220+3 段構造に整合)。
 *
 * lastAction は watering / pruning の最新イベントを比較して新しい方を採用。
 * - kind: 'watering' | 'pruning'
 * - elapsed: formatElapsed の結果 (例: '今日' / '3日' / '2週')
 * - note: event.note (commentText の優先 fallback、null なら speciesCommonName → "—")
 *
 * ageText は Bonsai schema に age 系フィールドが未追加のため当面 null。
 * Tier 2 編集画面 BottomSheet 化 (T2-x) で schema 拡張時に対応予定。
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

  // T2-3: schema v6 の estimated_age (年単位) を「N年（推定）」表示文字列に変換。
  // 既存盆栽 (estimated_age=null) は ageText=null で非表示。
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
  // mockups v1.0 02-Home.html `bulkSchedStep` / `bulkSchedType` 整合:
  // 一括予定追加フローの 2 step state (pickWork → pickDate → null=完了/閉じる)。
  // Phase G3a-G3b: bulk-* は全 formSheet 化、type のみ保持 (useFocusEffect で DB 書込時利用)
  const [bulkSchedType, setBulkSchedType] = useState<EventType>('fertilizing');
  const [bulkLogType, setBulkLogType] = useState<EventType>('watering');

  // Phase G4 part 2 (ADR-0024 Accepted): 新規登録 BottomSheet を `(modals)/bonsai-new` (modal、
  // functional_spec §6.2 既存設計) に置換、ref は不要 (router 経路 + store 経由)。
  const openCreateSheet = useCallback(() => {
    router.push('/bonsai-new' as Href);
  }, [router]);

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

  // selectMode の入り / 終わりは selectedIds リセット (mockup `cancelSelect` / `enterSelect` 整合)。
  // Phase G3a-G3b: bulk-* sheets は全 formSheet 化、modal の自動 dismiss で state リセット不要。
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

  // Phase G3a (ADR-0024): bulk-work-picker formSheet を開く前に selectedBonsais を store に保存。
  const pushBulkWorkPicker = useCallback(
    (mode: 'log' | 'schedule') => {
      const sel = items
        .filter((it) => selectedIds.has(it.id))
        .map((it) => ({ id: it.id, name: it.name }));
      usePickerStore.getState().setBulkContext({ selectedBonsais: sel });
      router.push(`/bulk-work-picker?mode=${mode}` as Href);
    },
    [items, selectedIds, router],
  );

  // SelectionToolbar 「予定追加」: bulk-work-picker (mode='schedule') を開く。
  const handleBulkSchedule = useCallback(() => {
    pushBulkWorkPicker('schedule');
  }, [pushBulkWorkPicker]);

  // SelectionToolbar 「一括記録」: bulk-work-picker (mode='log') を開く。
  const handleBulkLog = useCallback(() => {
    pushBulkWorkPicker('log');
  }, [pushBulkWorkPicker]);

  // bulk-schedule-date (formSheet、Phase G3b) で保存 → bulkScheduleEvents で各 bonsai に planned event 作成 → reload。
  // ADR-0014 整合 (Issue #344): 個別 event 通知は ADR-0014 のスコープ外、本 PR では notify トグル UI を撤去。
  // 一括予定追加で作成された planned events は Settings 通知設定 (当日まとめ / 水やり繰り返し) に従う。
  const handleBulkSchedSave = useCallback(
    async (input: { occurredAtUtc: string }) => {
      await bulkScheduleEvents({
        bonsaiIds: Array.from(selectedIds),
        type: bulkSchedType,
        occurredAtUtc: input.occurredAtUtc,
      });
      setSelectMode(false);
      setSelectedIds(new Set());
      await reload();
    },
    [selectedIds, bulkSchedType, reload],
  );

  // bulk-log-confirm (formSheet、Phase G3a) で保存 → bulkLogEvents で各 bonsai に logged event 作成 → reload。
  const handleBulkLogConfirmSave = useCallback(
    async (input: { note: string | null }) => {
      await bulkLogEvents({
        bonsaiIds: Array.from(selectedIds),
        type: bulkLogType,
        note: input.note,
      });
      // 完了 → selectMode 解除 + 再 load
      setSelectMode(false);
      setSelectedIds(new Set());
      await reload();
    },
    [selectedIds, bulkLogType, reload],
  );

  // Phase G3a-G4: bulk-* / bonsai-new modal から戻った時に結果を消費。
  // - workResult.mode === 'log' → bulkLogType を保持して /bulk-log-confirm へ次遷移
  // - workResult.mode === 'schedule' → bulkSchedType を保持して /bulk-schedule-date へ次遷移
  // - logResult あれば bulkLogEvents 経由で DB 書込
  // - schedResult あれば bulkScheduleEvents 経由で DB 書込
  // - bonsaiCreateResult あれば reload + /bonsai/<id> 遷移
  useFocusEffect(
    useCallback(() => {
      const workResult = usePickerStore.getState().consumeBulkWorkPickerResult();
      if (workResult) {
        if (workResult.mode === 'log') {
          setBulkLogType(workResult.type);
          router.push(`/bulk-log-confirm?type=${workResult.type}` as Href);
        } else {
          setBulkSchedType(workResult.type);
          router.push(`/bulk-schedule-date?type=${workResult.type}` as Href);
        }
      }
      const logResult = usePickerStore.getState().consumeBulkLogConfirmResult();
      if (logResult) {
        void handleBulkLogConfirmSave(logResult);
      }
      const schedResult = usePickerStore.getState().consumeBulkScheduleDateResult();
      if (schedResult) {
        void handleBulkSchedSave(schedResult);
      }
      const newBonsaiId = usePickerStore.getState().consumeBonsaiCreateResult();
      if (newBonsaiId != null) {
        void reload();
        router.push(`/(tabs)/bonsai/${newBonsaiId}` as Href);
      }
    }, [router, handleBulkLogConfirmSave, handleBulkSchedSave, reload]),
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
        {/* Phase G4 part 2 (ADR-0024 Accepted): BonsaiCreate は (modals)/bonsai-new (modal)
            に置換、JSX 直接配置不要 (router.push 経路、empty state で同経路使用)。 */}
      </ThemedView>
    );
  }

  // selectMode 中は SelectionToolbar 分の paddingBottom を加算 (FAB は隠れる)。
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
        selectedCount={selectMode ? selectedIds.size : undefined}
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
              bottom: tabBarHeight + AD_BANNER_HEIGHT_APPROX + 16,
            },
          ]}
          onPress={openCreateSheet}
          testID="e2e_home_fab_create"
        >
          <PlusIcon size={28} color={ON_BRAND} />
        </Pressable>
      )}
      {selectMode && (
        <View style={[styles.toolbarWrap, { bottom: toolbarBottom }]}>
          <SelectionToolbar
            count={selectedIds.size}
            onBulkLog={handleBulkLog}
            onBulkSchedule={handleBulkSchedule}
            enableBulkLog
            testID="e2e_home_selection_toolbar"
          />
        </View>
      )}
      <AdBanner />
      {/* Phase G3a-G4 (ADR-0024 Accepted): BulkWorkPicker + BulkLogConfirm + BulkScheduleDate
          + BonsaiCreate は全 formSheet/modal 化、JSX 直接配置不要 (router.push 経路)。 */}
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
  toolbarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
