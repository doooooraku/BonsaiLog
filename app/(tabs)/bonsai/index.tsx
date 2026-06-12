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
 * - 盆栽カード長押し → selectMode (一括選択) 経路 **完全廃止** (mockup v1.0 02-Home.html `initialSelectMode` 経路撤回)
 * - SelectionToolbar component **完全削除**
 * - 一括予定追加 / 一括記録は **予定タブ FAB / 記録タブ tap → bonsai-multi-select modal** に集約
 * - 盆栽タブの責務は「一覧表示 + 新規登録 (FAB)」 のみに simplify
 *
 * 長押し → アーカイブ確認 (ADR-0025 Notes Amended): 廃止したのは「一括選択モード」であり、
 * 単一カードの長押し → カスタム ConfirmDialog 直行 → archiveBonsai は別動線として再導入 (ADR-0036 D1 整合)。
 */
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { PlusIcon, PotIcon } from '@/src/components/icons';
import { BottomCtaBar } from '@/src/components/common/BottomCtaBar';
import { getTzOffsetMin, nowUtc } from '@/src/core/datetime';
import { useTranslation } from '@/src/core/i18n/i18n';
import { ON_BRAND } from '@/src/core/theme/colors';
import { displayTitleSerif } from '@/src/core/theme/typography';
import { useColors } from '@/src/core/theme/useColors';
import { archiveBonsai, getAllActiveBonsaiWithSpecies } from '@/src/db/bonsaiRepository';
import { getRecentTags, type TagRecord } from '@/src/db/tagRepository';
import { AdBanner } from '@/src/features/ads/AdBanner';
import { BonsaiCard, type BonsaiCardData } from '@/src/features/bonsai/BonsaiCard';
import { buildBonsaiCardData } from '@/src/features/bonsai/cardDataBuilder';
import { FilterEmptyState } from '@/src/features/bonsai/FilterEmptyState';
import { HomeFilterTabs, type FilterChip } from '@/src/features/bonsai/HomeFilterTabs';
import { SearchHeader } from '@/src/features/bonsai/SearchHeader';
import { shouldShowG1RecordTabNudge } from '@/src/features/guides/guideTriggers';
import { usePendingGuideStore } from '@/src/features/guides/pendingGuide';
import { useSpotlightTarget } from '@/src/features/guides/useSpotlightTarget';
import { GuideSpotlight } from '@/src/features/guides/GuideSpotlight';
import { toLocalDateKey } from '@/src/features/watering/dateUtils';
import { useGuidesStore } from '@/src/stores/guidesStore';
import { usePickerStore } from '@/src/stores/pickerStore';

const ALL_FILTER_ID = 'ALL';

// 旧 inline formatElapsed + buildCardData (lines 49-123) は Sess9 PR-11 で共有 util へ extract 済:
// - formatElapsed → src/core/datetime/relativeElapsed.ts formatElapsedDays
// - buildCardData → src/features/bonsai/cardDataBuilder.ts buildBonsaiCardData
// 重複削除により本ファイルは UI rendering に集中、 BonsaiCard data 構築ロジックは util 一元化。

export default function BonsaiHomeScreen() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const c = useColors();
  const [items, setItems] = useState<BonsaiCardData[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>(ALL_FILTER_ID);
  const [loading, setLoading] = useState(true);
  // 長押し → アーカイブ確認 (ADR-0036 D1 カスタム ConfirmDialog 直行、メニュー非経由)。
  const [pendingArchiveId, setPendingArchiveId] = useState<string | null>(null);

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
        bonsai.map((b) => buildBonsaiCardData(b, todayLocalKey, tzOffsetMin, t)),
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

  // Sess9 PR-2 revert (user 真意): 「すべて」 chip は不要。
  // 解除は同 chip 再 tap で対応 (handleChipSelect の toggle ロジック)、
  // chip 行を冗長にしない方針。 mockup `02-Home.html` の「すべて」 chip は採用しない。
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

  const handleCardLongPress = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // R-45 長押し成功 fb
    setPendingArchiveId(id);
  }, []);

  const handleConfirmArchive = useCallback(async () => {
    if (pendingArchiveId == null) return;
    const id = pendingArchiveId;
    setPendingArchiveId(null);
    await archiveBonsai(id);
    await reload();
  }, [pendingArchiveId, reload]);

  // Sess15 PR-LL: bonsai-new modal から戻った時、 reload のみで Home に留まる
  // (user 真意「保存後は Home 画面に戻ってほしい」、 旧 router.push で詳細画面遷移は廃止)。
  useFocusEffect(
    useCallback(() => {
      const newBonsaiId = usePickerStore.getState().consumeBonsaiCreateResult();
      if (newBonsaiId != null) {
        void reload();
      }
    }, [reload]),
  );

  // #1178 g1 (ADR-0058): 盆栽 1 本目の登録直後、タブバー「記録」をスポットライトで 1 回だけ誘導。
  // タブバー項目は navigator 内部で ref 計測不能のため、静的 4 タブ構成から決定的に算出する
  // (記録 = index 2 → x = 幅/2、幅 = 全幅/4。高さ = useBottomTabBarHeight、bottom inset 込)。
  // wrapper 計測案 (tabBarButton 差替) はタブ layout 改変リスクで不採用 — ADR-0058 Consequences。
  // フィルタ中 (1 件に絞れただけ) は誤発火するため ALL のときのみ判定。
  const tabBarHeight = useBottomTabBarHeight();
  // 座標基準は screen (GuideSpotlight の全画面 Modal と同一基準)。useWindowDimensions は
  // status bar / nav inset 除外値を返す端末があり、リングが実タブから ~55dp 上にズレた
  // (Sess102 実機実測: 記録タブ実座標 [360,1393] vs 計算 1282)。portrait 固定で静的取得可。
  const { width: scrW, height: scrH } = Dimensions.get('screen');
  const guideSeen = useGuidesStore((s) => s.seen);
  const markGuideSeen = useGuidesStore((s) => s.markSeen);
  // isFocused 必須: 背景タブからの Modal 多重表示防止 (Sess102 実機実証、CalendarTabScreen と同根)
  const isFocused = useIsFocused();
  // #1203 g7 (pull 専用): 使い方「盆栽を登録する」からの遷移時のみ、登録 CTA を強調。
  // 自動発火しない (ADR-0058 原則 5)。empty / list 両状態の CTA に同じ計測 wrapper を張る
  // (排他 render のため ref は常に 1 つ)。
  const g7Pulled = usePendingGuideStore((s) => s.pending === 'g7RegisterCta');
  const g7Active = isFocused && g7Pulled;
  const { targetRef: g7TargetRef, rect: g7Rect, measure: measureG7Target } = useSpotlightTarget();
  const dismissG7 = useCallback(() => {
    markGuideSeen('g7RegisterCta');
    usePendingGuideStore.getState().clear();
  }, [markGuideSeen]);
  const handleG7TargetPress = useCallback(() => {
    markGuideSeen('g7RegisterCta');
    usePendingGuideStore.getState().clear();
    openCreateSheet();
  }, [markGuideSeen, openCreateSheet]);

  const g1Active =
    isFocused &&
    !g7Pulled && // pull 中はオーバーレイ 1 つ原則で g7 優先
    selectedFilter === ALL_FILTER_ID &&
    shouldShowG1RecordTabNudge(items.length, guideSeen);
  const recordTabRect = useMemo(
    () => ({ x: (scrW / 4) * 2, y: scrH - tabBarHeight, width: scrW / 4, height: tabBarHeight }),
    [scrW, scrH, tabBarHeight],
  );
  const dismissG1 = useCallback(() => markGuideSeen('g1RecordTabNudge'), [markGuideSeen]);
  const handleG1TargetPress = useCallback(() => {
    markGuideSeen('g1RecordTabNudge');
    router.push('/(tabs)/record' as Href);
  }, [markGuideSeen, router]);

  if (loading) {
    return (
      <ThemedView
        style={[styles.container, { backgroundColor: c.background }]}
        testID="e2e_bonsai_home_loading"
      >
        <SearchHeader title={t('appName')} testIdSuffix="bonsai_home" />
        <View style={styles.loadingBox}>
          <ThemedText>{t('loading')}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (items.length === 0) {
    // Sess9 PR-1: フィルタ中 0 件 (タグ filter 適用済) と 新規 user 0 件 を別画面で扱う
    if (selectedFilter !== ALL_FILTER_ID) {
      const selectedTag = tags.find((tg) => tg.id === selectedFilter);
      const tagName = selectedTag?.name ?? '';
      return (
        <ThemedView
          style={[styles.container, { backgroundColor: c.background }]}
          testID="e2e_bonsai_home_filter_empty_wrap"
        >
          <SearchHeader title={t('appName')} testIdSuffix="bonsai_home" />
          <HomeFilterTabs
            chips={filterChips}
            selectedId={selectedFilter}
            onSelect={handleChipSelect}
            testID="e2e_home_filter_tabs"
          />
          <FilterEmptyState
            tagName={tagName}
            onClearFilter={() => setSelectedFilter(ALL_FILTER_ID)}
          />
        </ThemedView>
      );
    }

    return (
      <ThemedView
        style={[styles.container, { backgroundColor: c.background }]}
        testID="e2e_bonsai_home_empty"
      >
        <SearchHeader title={t('appName')} testIdSuffix="bonsai_home" />
        <View style={styles.emptyContent}>
          <PotIcon size={200} color={c.tint} />
          <ThemedText style={[styles.emptyTitle, { color: c.text }]}>
            {t('homeEmptyTitle')}
          </ThemedText>
          <ThemedText style={[styles.emptyBody, { color: c.textSecondary }]}>
            {t('homeEmptyBody')}
          </ThemedText>
        </View>
        {/* #1203 g7: 計測 wrapper (empty 状態の CTA — list 状態と排他 render のため ref 共用可) */}
        <View
          ref={g7TargetRef}
          collapsable={false}
          onLayout={g7Active ? measureG7Target : undefined}
          style={styles.emptyCtaWrap}
        >
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
        <AdBanner />
        {g7Active && (
          <GuideSpotlight
            visible
            targetRect={g7Rect}
            body={t('guideRegisterCtaBody')}
            dismissLabel={t('ok')}
            onDismiss={dismissG7}
            onTargetPress={handleG7TargetPress}
            testID="e2e_home_guide_register_cta"
          />
        )}
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: c.background }]}
      testID="e2e_bonsai_home_list"
    >
      <SearchHeader title={t('appName')} testIdSuffix="bonsai_home" />
      <HomeFilterTabs
        chips={filterChips}
        selectedId={selectedFilter}
        onSelect={handleChipSelect}
        testID="e2e_home_filter_tabs"
      />
      <FlatList
        data={visibleItems}
        keyExtractor={(it) => it.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <BonsaiCard
            data={item}
            onPress={handleCardPress}
            onLongPress={handleCardLongPress}
            testID={`e2e_bonsai_card_${item.id}`}
          />
        )}
      />
      {/* Sess72 ADR-0054 D1: FAB -> BottomCtaBar replacement. Inline layout =
          FlatList ends above the bar naturally (R-62 Layout Contract solved). */}
      {/* #1203 g7: 計測 wrapper (list 状態の CTA) */}
      <View ref={g7TargetRef} collapsable={false} onLayout={g7Active ? measureG7Target : undefined}>
        <BottomCtaBar
          onPress={openCreateSheet}
          label={t('bonsaiCreateNew')}
          testID="e2e_home_bottom_cta_create"
        />
      </View>
      <AdBanner />

      {/* 長押し → アーカイブ確認 (ADR-0036 D1、詳細画面と同一のカスタム確認窓) */}
      <ConfirmDialog
        visible={pendingArchiveId !== null}
        title={t('bonsaiArchiveConfirmTitle')}
        description={t('bonsaiArchiveConfirmDesc')}
        confirmLabel={t('bonsaiArchive')}
        cancelLabel={t('cancel')}
        destructive
        onConfirm={handleConfirmArchive}
        onCancel={() => setPendingArchiveId(null)}
        testID="e2e_home_confirm_archive"
      />

      {/* #1178 g1 スポットライト (生涯 1 回、ADR-0058)。本物の「記録」タブを指し、
          tap は遷移を代行。dismiss = あとで (skipForLater)。 */}
      {g1Active && (
        <GuideSpotlight
          visible
          targetRect={recordTabRect}
          title={t('guideRecordTabNudgeTitle')}
          body={t('guideRecordTabNudgeBody').replace('{tab}', t('tabRecord'))}
          dismissLabel={t('skipForLater')}
          onDismiss={dismissG1}
          onTargetPress={handleG1TargetPress}
          testID="e2e_home_guide_record_tab"
        />
      )}

      {/* #1203 g7 (pull 専用): 使い方「盆栽を登録する」からの遷移時のみ登録 CTA を強調 */}
      {g7Active && (
        <GuideSpotlight
          visible
          targetRect={g7Rect}
          body={t('guideRegisterCtaBody')}
          dismissLabel={t('ok')}
          onDismiss={dismissG7}
          onTargetPress={handleG7TargetPress}
          testID="e2e_home_guide_register_cta"
        />
      )}
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
  // Sess99 #1123: displayTitleSerif token 化 (R-75 font geometry hardcode 禁止)。
  // lineHeight 34 は既存見た目の現状維持 override (token は 32)。
  emptyTitle: {
    ...displayTitleSerif,
    lineHeight: 34,
    textAlign: 'center',
    marginTop: 16,
  },
  emptyBody: { fontSize: 16, lineHeight: 26, textAlign: 'center', maxWidth: 300 },
  emptyCtaWrap: { paddingHorizontal: 16, paddingBottom: 16 },
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
});
