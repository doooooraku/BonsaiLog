import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomCtaBar } from '@/src/components/common/BottomCtaBar';
import { useKeyboardAvoidingProps } from '@/src/core/hooks/useKeyboardAvoidingProps';
import { useScrollPreservation } from '@/src/core/hooks/useScrollPreservation';
import { useBonsaiBasicForm } from '@/src/features/bonsai/BonsaiBasicForm';
import { BonsaiHero } from '@/src/features/bonsai/BonsaiHero';
import { canShowGuide } from '@/src/features/guides/guideTriggers';
import { GuideSpotlight } from '@/src/features/guides/GuideSpotlight';
import { useSpotlightTarget } from '@/src/features/guides/useSpotlightTarget';
import { BonsaiBasicSection } from '@/src/features/bonsai/detail/BonsaiBasicSection';
import { BonsaiDetailTabs } from '@/src/features/bonsai/detail/BonsaiDetailTabs';
import { BonsaiHistoryTab } from '@/src/features/bonsai/detail/BonsaiHistoryTab';
import { BonsaiPhotoSection } from '@/src/features/bonsai/detail/BonsaiPhotoSection';
import { BonsaiTimelineTab } from '@/src/features/bonsai/detail/BonsaiTimelineTab';
import { useBonsaiDetailData } from '@/src/features/bonsai/detail/useBonsaiDetailData';
import { useBonsaiDetailTabs } from '@/src/features/bonsai/detail/useBonsaiDetailTabs';
import { useHistoryGroups } from '@/src/features/bonsai/detail/useHistoryGroups';
import {
  usePhotoCrudWithUndo,
  type PendingPhotoDeletion,
} from '@/src/features/bonsai/detail/usePhotoCrudWithUndo';
import { useEventActions } from '@/src/features/bonsai/detail/useEventActions';
import { useScrollToEvent } from '@/src/features/bonsai/detail/useScrollToEvent';
import { useTranslation } from '@/src/core/i18n/i18n';
import { useColors } from '@/src/core/theme/useColors';

import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { RowActionMenu, type RowActionMenuItem } from '@/src/components/RowActionMenu';
import { getTzOffsetMin } from '@/src/core/datetime';
import {
  findGroupKeyForEvent,
  groupContinuousEvents,
} from '@/src/features/event/groupContinuousEvents';
import { useGuidesStore } from '@/src/stores/guidesStore';
import { usePickerStore } from '@/src/stores/pickerStore';

/**
 * 盆栽詳細画面 (P2-01 PR-D + P2-02 PR-C)。
 * - 基本情報 + 写真時系列管理
 * - 写真追加 (カメラ + ライブラリ、Free 3 枚制限)
 * - 写真タップでアクション (カバー写真設定 / 削除)
 * - アーカイブ (Issue #14 AC4)
 * (Sess58: 「写真年次タイムライン」 表記撤廃 = paywallFeatureYearlyTimeline 整合)
 */
export default function BonsaiDetailScreen() {
  const params = useLocalSearchParams<{ id: string; tab?: string; focusEventId?: string }>();
  const { id } = params;
  const { t, lang } = useTranslation();
  const router = useRouter();
  const c = useColors();
  // Sess72 ADR-0054 D1: 旧 tabBarHeight (ScrollView paddingBottom 計算用) は撤去。
  // BottomCtaBar (画面下端 inline) が container 内に直接配置され、 ScrollView は
  // BottomCtaBar の上で自然に終わるため paddingBottom 計算不要 (R-62 構造解決)。
  // Sess28 PR-3 (ADR-0037 D1 / R-46): KAV props 共通 hook 適用 (KAV、 container 縮小)。
  const kavProps = useKeyboardAvoidingProps();
  // Sess31 PR-1 (R-46 拡張): ScrollView ref + 基本情報タブ メモ欄 onFocus → scrollToEnd で可視性確保。
  const scrollRef = React.useRef<ScrollView>(null);
  // Sess72 PR-3 (ADR-0040 D5 予定 / R-63 予定): 子画面 push (tag-edit / work-picker) から戻った
  // 時の scroll 位置保持。 基本情報タブの tag 追加 + 作業履歴/予定タブの予定/記録追加 等、 詳細
  // 画面の各タブから子画面 push する全 flow で先頭リセット問題を解消。
  // Sess95 PR-2: onContentSizeChange 追加 (戻り後の非同期 layout 変動 race 対応、 hook JSDoc 参照)。
  const { onScroll, onContentSizeChange, scrollEventThrottle } = useScrollPreservation(scrollRef);
  // 改善① measureLayout 基準: ScrollView 直下の content wrapper View ref。
  // Fabric では measureLayout の relativeTo に数値ハンドル不可・ホスト View の ref が必要なため、
  // 全 content を包む collapsable=false の View を基準にして対象行の content 内 Y を実測する。
  const scrollContentRef = React.useRef<View>(null);
  const handleMemoFocus = React.useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
  }, []);
  // 写真削除 Undo (R4 = usePhotoCrudWithUndo) が読み書きする pending ref。
  // reload(useBonsaiDetailData) も pending 写真の非表示化で読むため、両フックへ注入する
  // 共有 ref として index.tsx で作成する (循環依存回避、A1-4/A1-6 設計)。
  const pendingDeletionRef = React.useRef<PendingPhotoDeletion | null>(null);
  // ADR-0020 §Notes Amended (2026-05-09): Hero + 3 Tabs (作業履歴 / 予定タイムライン / 基本情報)
  // mockup v1.0 detail-screens.jsx BonsaiDetailScreen の initialTab='history' 整合
  // 旧 photos タブは廃止、写真機能は history タブに統合 (A6 で _HistoryPhotos 正式化予定)
  // 旧 timeline タブは廃止、予定機能は新 timeline タブで A7 で実装予定 (本 PR は placeholder)
  // 旧 timeline タブの「水やり概要 / 取得日 / 更新日 / アーカイブ」は basic タブに移動 (A5 で
  // CreateBonsaiScreen embed に正式化予定)
  // Sess12 PR-F 改善 F: URL param ?tab=timeline で初期タブ指定可能 (planned event tap 時)
  const { activeTab, setActiveTab } = useBonsaiDetailTabs(params.tab);

  // Phase G2 part 1-2 (ADR-0024 Accepted): 作業記録 BottomSheet を `(modals)/work-picker` +
  // `(modals)/work-log-confirm` (formSheet) に置換、ref 経由の Sheet 制御は全廃 (router.push +
  // usePickerStore で代替)。
  // Sess16 PR-C: FORM_TYPES を全 14 種別に拡張、 全種別 form 経由化 (即書込 path 廃止)。
  //
  // Sess99 #1127 (案 A / ADR-0030 §17 Notes Amended): 予定追加の Case A (store-callback +
  // DatePicker dialog 即保存) を撤去し、予定タブと同じ BulkLogConfirmScreen 確認画面経由に統一。
  // 旧 useScheduleEvent hook / consumeWorkPickerResult / DateTimePicker JSX は削除済み。

  // R2 (Phase 4 A1-4): bonsai + 写真 + イベント取得 + focus 毎 reload。
  const { item, loading, photos, setPhotos, captions, setCaptions, events, reload } =
    useBonsaiDetailData({ id, lang, pendingDeletionRef });

  // Claude Design `detail-screens.jsx` DetailHero 整合 (Phase B-2): cover photo を抽出
  // (early return より前で呼ぶ — react-hooks/rules-of-hooks)
  const coverUri = React.useMemo(() => {
    const cover = photos.find((p) => p.isCover === 1);
    return cover?.absoluteUri ?? null;
  }, [photos]);

  // Issue #439: 基本情報タブの inline 編集フォーム state (BonsaiCreateSheet と同じフック)。
  // 親で hook を呼ぶことで、picker BottomSheet を画面 root に配置できる (ScrollView 内 nest 禁止)。
  const basicForm = useBonsaiBasicForm({
    editingBonsai: item,
    onUpdated: () => {
      void reload();
    },
  });

  // R8/R9 (Phase 4 A1-12): イベント削除 + アーカイブ (ADR-0036 D1-D4)。
  // Sess77 PR-3 (ADR-0055): kebab tap → RowActionMenu (編集 + 削除) → 各 handler。
  // ConfirmDialog / RowActionMenu 本体 JSX は下の render に残置し、本フックの state で駆動する。
  const {
    deleteConfirmVisible,
    confirmDeleteEvent,
    handleConfirmDelete,
    handleCancelDelete,
    kebabPressEvent,
    pendingKebabEvent,
    handleKebabDismiss,
    handleEditFromKebab,
    handleDeleteFromKebab,
    archiveConfirmVisible,
    handleArchive,
    handleConfirmArchive,
    handleCancelArchive,
  } = useEventActions({
    bonsaiName: item?.name ?? '',
    bonsaiId: id,
    item,
    reload,
    t,
    onArchived: () => router.back(),
  });

  // R7 (Phase 4 A1-7): 検索結果タップ → 該当作業へジャンプ + 一時ハイライト (measureLayout)。
  const { highlightedEventId, registerRow, scrollToEvent } = useScrollToEvent({
    scrollRef,
    scrollContentRef,
  });

  // R6 (Phase 4 A1-8): 作業履歴タブの絞り込み + 連続日グルーピング。
  // setHistoryFilter / setExpandedGroupIds は下の focusEventId effect が使うため index で受ける。
  const {
    historyFilter,
    setHistoryFilter,
    expandedGroupIds,
    setExpandedGroupIds,
    toggleGroupExpand,
    presentEventTypes,
    historyGroups,
  } = useHistoryGroups({ events });

  // 改善① focusEventId param 受領 → 履歴タブ表示 + フィルタ all + (group 内なら展開) + スクロール。
  // events ロード後に発火 (初回マウント / 既マウント画面への再遷移の両対応)。処理後 param クリア。
  React.useEffect(() => {
    const fid = params.focusEventId;
    if (!fid || events.length === 0) return;
    const target = events.find((e) => e.id === fid && e.status === 'logged');
    if (!target) {
      router.setParams({ focusEventId: undefined });
      return;
    }
    setActiveTab('history');
    setHistoryFilter('all');
    // フィルタ非依存で全 logged を grouping し、対象が連続日 group 内なら展開する。
    const allLoggedDesc = events
      .filter((e) => e.status === 'logged')
      .sort((a, b) => b.occurredAtUtc.localeCompare(a.occurredAtUtc));
    const groupKey = findGroupKeyForEvent(
      groupContinuousEvents(allLoggedDesc, getTzOffsetMin()),
      fid,
    );
    if (groupKey) setExpandedGroupIds((prev) => new Set(prev).add(groupKey));
    scrollToEvent(fid);
    router.setParams({ focusEventId: undefined });
  }, [
    params.focusEventId,
    events,
    router,
    scrollToEvent,
    setActiveTab,
    setHistoryFilter,
    setExpandedGroupIds,
  ]);

  // R4 (Phase 4 A1-6): 写真 CRUD + 5 秒 Undo。pendingDeletionRef は上で作成した共有 ref を注入。
  const {
    pendingDeletion,
    pickAndSavePhoto,
    handleMovePhoto,
    handleCaptionChange,
    handleCaptionBlur,
    handleSetCover,
    handleDeletePhoto,
    handleUndoDeletion,
  } = usePhotoCrudWithUndo({
    item,
    photos,
    setPhotos,
    captions,
    setCaptions,
    reload,
    pendingDeletionRef,
    t,
  });

  // #1178 g6 (ADR-0058): 詳細画面の初回 open でタブ列を 1 回だけスポットライト
  // (記録は「作業履歴」、予定は「作業予定」で見返せることの案内)。
  // タブ名は detailTabHistory / detailTabPlanTimeline の実値を {history}/{plan} に注入
  // (引用 drift 防止、#1177 {cta} パターン)。hooks は early return より前 (rules-of-hooks)。
  const guideSeen = useGuidesStore((s) => s.seen);
  const markGuideSeen = useGuidesStore((s) => s.markSeen);
  const g6Active = canShowGuide('g6DetailTabs', guideSeen);
  const { targetRef: g6TargetRef, rect: g6Rect, measure: measureG6Target } = useSpotlightTarget();
  const dismissG6 = React.useCallback(() => markGuideSeen('g6DetailTabs'), [markGuideSeen]);

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{t('loading')}</ThemedText>
      </ThemedView>
    );
  }

  if (!item) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{t('errorLoadFailed')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: c.background }]}>
      {/* Sess15 PR-TT (Q19 D1): ⋮ menu 完全削除。
          残機能 (基本情報編集 = タブ重複、 PDF 出力 = 未実装) は user 真意により全廃。 */}
      {/* ADR-0020 §Notes Amended (2026-05-09): DetailTabs 順序 = 作業履歴 / 予定 / 基本情報 (mockup v1.0 整合) */}
      {/* Issue #439: タブバーは sticky (画面上部固定)、Hero は ScrollView 内に移動して全画面スクロールできるようにする */}
      {/* #1178 g6: wrapper はガイド対象の計測用 (collapsable={false}、非表示時は onLayout なし) */}
      <View ref={g6TargetRef} collapsable={false} onLayout={g6Active ? measureG6Target : undefined}>
        <BonsaiDetailTabs activeTab={activeTab} onChange={setActiveTab} t={t} />
      </View>

      {/* Sess28 PR-3 (ADR-0037 D1 / R-46): useKeyboardAvoidingProps() で Platform 別 props を集約。
          旧 Platform.OS 分岐 + offset=64 ハードコード (Sess15 PR-TT) を hook 経由で動的化。 */}
      <KeyboardAvoidingView style={styles.flexOne} {...kavProps}>
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          onContentSizeChange={onContentSizeChange}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* 改善① measureLayout 基準 wrapper (collapsable=false で Android view flattening 回避)。 */}
          <View ref={scrollContentRef} collapsable={false}>
            {/* Sess28 PR-4 (ADR-0037 D2): Hero は盆栽名のみ表示 (180px、 樹種・樹形 = 基本情報タブで参照)。 */}
            <BonsaiHero coverUri={coverUri} bonsaiName={item.name} />

            {/* Issue #440 Phase 1: 旧 水やり概要セクション (LastWateredText + 水やり履歴を見るボタン)
            は削除。横断 watering 履歴は CareHub (ふりかえりタブ) 経由で到達可能。 */}

            {/* Sess15 PR-SS: 基本情報タブ = BonsaiBasicFormFields (edit モード)。
            photoSection は customPhotoBlock prop 経由で BonsaiBasicFormFields の「タグ後・メモ前」 slot に挿入。
            新規 modal (PR-CC 案 P) と field 順序を完全 1:1 一致。 */}
            {activeTab === 'basic' && (
              <BonsaiBasicSection
                form={basicForm}
                onArchive={handleArchive}
                onMemoFocus={handleMemoFocus}
                customPhotoBlock={
                  <BonsaiPhotoSection
                    photos={photos}
                    captions={captions}
                    pendingDeletion={pendingDeletion}
                    t={t}
                    pickAndSavePhoto={pickAndSavePhoto}
                    handleMovePhoto={handleMovePhoto}
                    handleCaptionChange={handleCaptionChange}
                    handleCaptionBlur={handleCaptionBlur}
                    handleSetCover={handleSetCover}
                    handleDeletePhoto={handleDeletePhoto}
                    handleUndoDeletion={handleUndoDeletion}
                  />
                }
              />
            )}

            {/* Issue #440 Phase 1: 作業履歴 Tab — フィルタ chip + 連続日まとめ events 一覧。
            mockup `bonsai-detail-history-01/02/03.png` 整合。FAB は ScrollView の外 (root)
            に absolute 配置 (画面右下、tab bar の上)。 */}
            {activeTab === 'history' && (
              <BonsaiHistoryTab
                events={events}
                lang={lang}
                t={t}
                historyFilter={historyFilter}
                setHistoryFilter={setHistoryFilter}
                presentEventTypes={presentEventTypes}
                historyGroups={historyGroups}
                expandedGroupIds={expandedGroupIds}
                toggleGroupExpand={toggleGroupExpand}
                registerRow={registerRow}
                highlightedEventId={highlightedEventId}
                onLongPressEvent={confirmDeleteEvent}
                onKebabPressEvent={kebabPressEvent}
              />
            )}

            {/* Sess15 PR-NN: 旧 basic Tab 末尾アーカイブボタンを BonsaiBasicSection 内に移動 (保存 / アーカイブ同 height 56 統一)。 */}

            {/*
             * Issue #441 Phase 1: 予定タブを timeline 縦線 + 連続日 mark + 詳細メモに改修。
             * mockup `bonsai-detail-timeline-01/02.png` 整合。FAB は ScrollView の外 (root)
             * に absolute 配置。
             */}
            {activeTab === 'timeline' && <BonsaiTimelineTab events={events} lang={lang} t={t} />}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sess72 ADR-0054 D1: FAB -> BottomCtaBar replacement on history tab.
          Inline layout = ScrollView ends above the bar naturally (R-62). */}
      {activeTab === 'history' && (
        <BottomCtaBar
          onPress={() => showEventTypePicker()}
          label={t('eventLogCta')}
          testID="e2e_history_bottom_cta"
        />
      )}

      {/* Sess72 ADR-0054 D1: FAB -> BottomCtaBar replacement on timeline tab.
          Sess99 #1127 (案 A): 予定タブと同じ確認画面動線に統一 —
          bulkContext にこの盆栽 1 本をセット → BulkWorkPicker (schedule mode) →
          BulkLogConfirmScreen (日付 + 定期 picker)。保存後は returnTo=dismiss で本画面に戻る。 */}
      {activeTab === 'timeline' && (
        <BottomCtaBar
          onPress={() => {
            if (!item) return;
            usePickerStore
              .getState()
              .setBulkContext({ selectedBonsais: [{ id: item.id, name: item.name }] });
            router.push('/bulk-work-picker?mode=schedule&returnTo=dismiss' as Href);
          }}
          label={t('addScheduleCta')}
          testID="e2e_timeline_bottom_cta"
        />
      )}

      {/* Phase G2 part 1 (ADR-0024): 旧 <WorkPickerSheet> 2 件 (記録モード + 予定モード) は
          `(modals)/work-picker` (formSheet) に置換、本コンポーネント直下から削除済。
          Sess18 PR-1 (ADR-0030 D2): log mode は WorkPickerScreen で直接 router.push、
          schedule mode のみ handleSchedulePickerSelect で Case A (DatePicker dialog) を呼び出す。 */}

      {/* Sess99 #1127: 旧 予定追加 日付 picker (DateTimePicker dialog) は撤去 —
          確認画面 (BulkLogConfirmScreen schedule mode) で日付編集する動線に統一。 */}

      {/* Phase G2-G5 (ADR-0024 Accepted): 作業記録 / 樹種 / 樹形 picker は全 formSheet 化、
          BonsaiBasicFormPickerSheets (旧 @gorhom 空関数) は Phase G5 で削除済。 */}

      {/* Sess15 PR-SS: sticky footer 廃止 (PR-PP revert)、
          アーカイブ + 保存 button は BonsaiBasicSection 内 inline に復活 (PR-NN 構造)。 */}

      {/* ADR-0036 D1/D3/D4 (Sess25 PR-ζ-2-⑧): カスタム ConfirmDialog (history タブ = logged 削除) */}
      <ConfirmDialog
        visible={deleteConfirmVisible}
        title={t('planEventDeleteConfirmLoggedSingleTitle')}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        testID="e2e_bonsai_detail_confirm_delete"
      />

      {/* ADR-0036 D1: アーカイブ確認 (基本情報タブの「アーカイブ」ボタン → カスタム ConfirmDialog) */}
      <ConfirmDialog
        visible={archiveConfirmVisible}
        title={t('bonsaiArchiveConfirmTitle')}
        description={t('bonsaiArchiveConfirmDesc')}
        confirmLabel={t('bonsaiArchive')}
        cancelLabel={t('cancel')}
        destructive
        onConfirm={handleConfirmArchive}
        onCancel={handleCancelArchive}
        testID="e2e_bonsai_detail_confirm_archive"
      />

      {/* ADR-0055 Sess77 PR-3: 個別 row kebab → RowActionMenu (編集 + 削除)。
          CalendarTabScreen と同じ pattern で動線統一。 */}
      <RowActionMenu
        visible={pendingKebabEvent !== null}
        items={
          pendingKebabEvent === null
            ? []
            : ([
                {
                  key: 'edit',
                  label: t('rowActionMenuEdit'),
                  onPress: handleEditFromKebab,
                  testID: `e2e_bonsai_detail_kebab_edit_${pendingKebabEvent.type}`,
                },
                {
                  key: 'delete',
                  label: t('rowActionMenuDelete'),
                  destructive: true,
                  onPress: handleDeleteFromKebab,
                  testID: `e2e_bonsai_detail_kebab_delete_${pendingKebabEvent.type}`,
                },
              ] satisfies RowActionMenuItem[])
        }
        onDismiss={handleKebabDismiss}
        testID="e2e_bonsai_detail_kebab_menu"
      />

      {/* #1178 g6 スポットライト (生涯 1 回、ADR-0058)。リング tap も dismiss (onTargetPress なし =
          タブは 2 つあり片方の代行操作が決められないため、案内のみで閉じる)。 */}
      {g6Active && (
        <GuideSpotlight
          visible
          targetRect={g6Rect}
          body={t('guideDetailTabsBody')
            .replace('{history}', t('detailTabHistory'))
            .replace('{plan}', t('detailTabPlanTimeline'))}
          dismissLabel={t('ok')}
          onDismiss={dismissG6}
          testID="e2e_bonsai_detail_guide_tabs"
        />
      )}
    </ThemedView>
  );

  function showEventTypePicker() {
    if (!item) return;
    // Sess16 PR-Q: isPine URL param 撤廃 (松類限定 candle_cut 表示廃止、 全種別常時表示)
    // Sess19 PR-4 (ADR-0031 D1): WorkLogConfirm が直接 await + createEvent するため bonsaiId 必須
    router.push(
      `/work-picker?bonsaiName=${encodeURIComponent(item.name)}&bonsaiId=${item.id}&mode=log` as Href,
    );
  }

  // Sess19 PR-6 (ADR-0031 D3): persistEventWithPayload + showEventOverloadPopupForPayload 削除。
  // WorkLogConfirm が直接 await + F-05 popup で完結するため不要。
}

// Sess22 ADR-0034 D5: 旧 EventSingleRow 定義は `src/features/event/EventRow.tsx` に移設、
// PlanScreen listing でも流用 (整合性レベル 2、 D4)。 削除済、 import は line 70 周辺。

const styles = StyleSheet.create({
  // backgroundColor は useColors の c.background で動的指定 (light/dark 両対応)
  container: { flex: 1 },
  // Sess15 PR-TT: KeyboardAvoidingView 内部 ScrollView の親 wrapper。
  flexOne: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scrollContent: { padding: 16, gap: 16 },
});
