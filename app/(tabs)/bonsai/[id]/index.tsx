import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FAB } from '@/src/components/common/FAB';
import { useKeyboardAvoidingProps } from '@/src/core/hooks/useKeyboardAvoidingProps';
import { useBonsaiBasicForm } from '@/src/features/bonsai/BonsaiBasicForm';
import { BonsaiHero } from '@/src/features/bonsai/BonsaiHero';
import { BonsaiBasicSection } from '@/src/features/bonsai/detail/BonsaiBasicSection';
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
import { useScheduleEvent } from '@/src/features/bonsai/detail/useScheduleEvent';
import { useScrollToEvent } from '@/src/features/bonsai/detail/useScrollToEvent';
import { useTranslation } from '@/src/core/i18n/i18n';
import { BORDER_DEFAULT, BRAND_GREEN, DANGER, TEXT_SECONDARY } from '@/src/core/theme/colors';
import { useColors } from '@/src/core/theme/useColors';

import { archiveBonsai } from '@/src/db/bonsaiRepository';
import { bulkSoftDeleteEvents } from '@/src/db/eventRepository';
import { cancelForEvents } from '@/src/features/notification/cancelForEvent';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { useToastStore } from '@/src/components/Toast';
import * as Haptics from 'expo-haptics';
import { getTzOffsetMin } from '@/src/core/datetime';
import { type Event } from '@/src/db/schema';
import {
  findGroupKeyForEvent,
  groupContinuousEvents,
} from '@/src/features/event/groupContinuousEvents';
import { usePickerStore } from '@/src/stores/pickerStore';

/**
 * 盆栽詳細画面 (P2-01 PR-D + P2-02 PR-C)。
 * - 基本情報 + 写真年次タイムライン
 * - 写真追加 (カメラ + ライブラリ、Free 3 枚制限)
 * - 写真タップでアクション (カバー写真設定 / 削除)
 * - アーカイブ (Issue #14 AC4)
 */
export default function BonsaiDetailScreen() {
  const params = useLocalSearchParams<{ id: string; tab?: string; focusEventId?: string }>();
  const { id } = params;
  const { t, lang } = useTranslation();
  const router = useRouter();
  const c = useColors();
  // Sess15 PR-RR: Tab bar の高さ取得 (sticky footer を Tab bar の上に固定するため)。
  const tabBarHeight = useBottomTabBarHeight();
  // Sess28 PR-3 (ADR-0037 D1 / R-46): KAV props 共通 hook 適用 (KAV、 container 縮小)。
  const kavProps = useKeyboardAvoidingProps();
  // Sess31 PR-1 (R-46 拡張): ScrollView ref + 基本情報タブ メモ欄 onFocus → scrollToEnd で可視性確保。
  const scrollRef = React.useRef<ScrollView>(null);
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
  // R5 (Phase 4 A1-10): 予定追加フロー (作業種別 picker → DateTimePicker → createEvent planned)。
  // reload は下の useBonsaiDetailData から reloadRef 経由で注入 (consume useFocusEffect を
  // reload effect より先に登録する順序保持のため、本フックを先に呼ぶ)。
  const reloadRef = React.useRef<(() => Promise<void>) | null>(null);
  const { showSchedulePicker, handleSchedulePickerSelect, handleScheduleDateSelect } =
    useScheduleEvent({ id, t, reloadRef });

  // Sess19 PR-6 (ADR-0031 D3): log mode consume + persistEventWithPayload を完全削除。
  // WorkLogConfirm が直接 await + router.replace('/(tabs)/plan?selectedDateKey=...')
  // でカレンダー画面に遷移するため、 bonsai-detail で consume する必要なし。
  // schedule mode (Case A、 ADR-0030 §17 P2) は維持: WorkPicker からの DatePicker dialog 起動。
  useFocusEffect(
    React.useCallback(() => {
      const workResult = usePickerStore.getState().consumeWorkPickerResult();
      if (workResult && workResult.mode === 'schedule') {
        handleSchedulePickerSelect(workResult.type);
      }
    }, [handleSchedulePickerSelect]),
  );

  // R2 (Phase 4 A1-4): bonsai + 写真 + イベント取得 + focus 毎 reload。
  // R5 consume (上) の後・basicForm (下) の前に呼ぶことで useFocusEffect 登録順を保持。
  const { item, loading, photos, setPhotos, captions, setCaptions, events, reload } =
    useBonsaiDetailData({ id, lang, pendingDeletionRef });
  // R5 (A1-10): handleScheduleDateSelect が参照する reload を ref に橋渡し (上の早期呼出のため)。
  reloadRef.current = reload;

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

  // ADR-0036 D1-D4 (Sess25 PR-ζ-2-⑧、 Sess27 PR-4 で D5 撤回): event 削除 ConfirmDialog state + 通知 Toast のみ
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    await bulkSoftDeleteEvents([id]); // R-43 atomic、 単体でも bulk wrapper 経由で統一
    await cancelForEvents([id], t);
    await reload();
    // Sess27 PR-4 (ADR-0036 D5 撤回、 R-44 緩和): Undo button 撤回、 通知 Toast のみ
    useToastStore.getState().show(t('undoSnackbarLoggedDeleteN').replace('{count}', '1'));
  }, [pendingDeleteId, t, reload]);
  const handleCancelDelete = useCallback(() => setPendingDeleteId(null), []);

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

  // ADR-0036 D1: アーカイブ確認も OS 標準 Alert → カスタム ConfirmDialog に統一 (Home 長押しと見た目統一)
  const [archiveConfirmVisible, setArchiveConfirmVisible] = useState(false);
  const handleArchive = useCallback(() => {
    if (!item) return;
    setArchiveConfirmVisible(true);
  }, [item]);
  const handleConfirmArchive = useCallback(async () => {
    if (!item) return;
    setArchiveConfirmVisible(false);
    await archiveBonsai(item.id);
    router.back();
  }, [item, router]);

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
      <View style={styles.detailTabs}>
        {(['history', 'timeline', 'basic'] as const).map((tab) => {
          const on = activeTab === tab;
          const labelKey =
            tab === 'history'
              ? 'detailTabHistory'
              : tab === 'timeline'
                ? 'detailTabPlanTimeline'
                : 'detailTabBasic';
          return (
            <Pressable
              key={tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={t(labelKey)}
              style={[styles.detailTab, on && styles.detailTabOn]}
              onPress={() => setActiveTab(tab)}
              testID={`e2e_detail_tab_${tab}`}
            >
              <ThemedText
                style={[
                  styles.detailTabText,
                  on ? styles.detailTabTextOn : { color: c.textSecondary },
                ]}
              >
                {t(labelKey)}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* Sess28 PR-3 (ADR-0037 D1 / R-46): useKeyboardAvoidingProps() で Platform 別 props を集約。
          旧 Platform.OS 分岐 + offset=64 ハードコード (Sess15 PR-TT) を hook 経由で動的化。 */}
      <KeyboardAvoidingView style={styles.flexOne} {...kavProps}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scrollContent,
            // Sess15 PR-SS: sticky footer 廃止 (PR-RR revert)、 Tab bar + 余裕のみ。
            { paddingBottom: tabBarHeight + 32 },
          ]}
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
                onKebabPressEvent={kebabDeleteEvent}
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

      {/* Issue #440 Phase 1: 緑 FAB (画面右下、tab bar の上)。 作業履歴タブ表示中のみ可視、
          tap で WorkPickerSheet を開く (mockup `bonsai-detail-history-01.png` の緑「+」FAB 整合)。
          ADR-0042 D3 / Sess36 PR-3 で共通 <FAB /> に統一、 旧 ThemedText「+」 文字列を
          PlusIcon SVG に統一 + SafeArea 反映 (旧 bottom=24 固定の bug 解消)。 */}
      {activeTab === 'history' && (
        <FAB
          onPress={() => showEventTypePicker()}
          accessibilityLabel={t('eventLogCta')}
          testID="e2e_history_fab"
        />
      )}

      {/* Issue #441 Phase 1 + Phase G2 part 1 (ADR-0024): 予定タブ FAB。 tap で
          `/work-picker?mode=schedule` (formSheet) を開く (旧 schedulePickerRef は廃止)。
          mockup `bonsai-detail-timeline-01/02.png` の緑「+」FAB 整合。
          ADR-0042 D3 / Sess36 PR-3 で共通 <FAB /> に統一。 */}
      {activeTab === 'timeline' && (
        <FAB
          onPress={() => {
            if (!item) return;
            // Sess16 PR-Q: isPine URL param 撤廃 (松類限定 candle_cut 表示廃止、 全種別常時表示)
            router.push(
              `/work-picker?bonsaiName=${encodeURIComponent(item.name)}&mode=schedule` as Href,
            );
          }}
          accessibilityLabel={t('addScheduleCta')}
          testID="e2e_timeline_fab"
        />
      )}

      {/* Phase G2 part 1 (ADR-0024): 旧 <WorkPickerSheet> 2 件 (記録モード + 予定モード) は
          `(modals)/work-picker` (formSheet) に置換、本コンポーネント直下から削除済。
          Sess18 PR-1 (ADR-0030 D2): log mode は WorkPickerScreen で直接 router.push、
          schedule mode のみ handleSchedulePickerSelect で Case A (DatePicker dialog) を呼び出す。 */}

      {/* Issue #298 Phase 2: 予定追加 日付 picker (action 選択後に表示) */}
      {showSchedulePicker && (
        <DateTimePicker
          testID="e2e_schedule_date_picker"
          value={new Date(Date.now() + 86_400_000)} // デフォルト 明日
          mode="date"
          minimumDate={new Date()}
          onChange={(event, date) => {
            if (event.type === 'set' && date) {
              void handleScheduleDateSelect(date);
            } else {
              void handleScheduleDateSelect(null);
            }
          }}
        />
      )}

      {/* Phase G2-G5 (ADR-0024 Accepted): 作業記録 / 樹種 / 樹形 picker は全 formSheet 化、
          BonsaiBasicFormPickerSheets (旧 @gorhom 空関数) は Phase G5 で削除済。 */}

      {/* Sess15 PR-SS: sticky footer 廃止 (PR-PP revert)、
          アーカイブ + 保存 button は BonsaiBasicSection 内 inline に復活 (PR-NN 構造)。 */}

      {/* ADR-0036 D1/D3/D4 (Sess25 PR-ζ-2-⑧): カスタム ConfirmDialog (history タブ = logged 削除) */}
      <ConfirmDialog
        visible={pendingDeleteId !== null}
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
        onCancel={() => setArchiveConfirmVisible(false)}
        testID="e2e_bonsai_detail_confirm_archive"
      />
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
  // WorkLogConfirm が直接 await + F-05 popup (line 92-129 の persistAndNavigate) で完結するため不要。
  // stale closure bug (deps 欠落の useFocusEffect callback closure が古い item=null を参照) 構造的解消。

  // ADR-0036 D1-D4 (Sess25 PR-ζ-2-⑧、 Sess27 PR-4-5 で D5/D6 撤回): カスタム ConfirmDialog + Haptics
  // history タブ = logged only、 planEventDeleteConfirmLoggedSingleTitle 利用
  function confirmDeleteEvent(ev: Event) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // R-45 長押し成功 fb
    setPendingDeleteId(ev.id);
  }

  // Sess27 PR-5: kebab tap (Haptics なし、 個別 row 代替動線)
  function kebabDeleteEvent(ev: Event) {
    setPendingDeleteId(ev.id);
  }
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
  // displayL 32/38 (design_system.md §3-3、Claude Design detail-screens.jsx)
  bonsaiName: {
    fontFamily: 'NotoSerifJP_500Medium',
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: 0.4,
  },
  sci: { fontStyle: 'italic', opacity: 0.7, fontSize: 13, color: TEXT_SECONDARY },
  archiveBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DANGER,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  archiveText: { color: DANGER, fontSize: 15, fontWeight: '500' },
  // Sess36 PR-3 ADR-0042 D3: 旧 historyFab + historyFabPlus は共通 <FAB /> に移行、 撤去済。
  // ADR-0020 v1.x-2: DetailTabs (Claude Design detail-screens.jsx)
  detailTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_DEFAULT,
  },
  detailTab: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  detailTabOn: { borderBottomColor: BRAND_GREEN },
  detailTabText: { fontSize: 14, fontWeight: '400' },
  detailTabTextOn: { color: BRAND_GREEN, fontWeight: '500' },
  // ADR-0020 Phase 3: 「水やり履歴」リンク (詳細画面 → watering 画面遷移)
  wateringHistoryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    borderRadius: 12,
    minHeight: 48,
  },
  wateringHistoryLinkText: { fontSize: 15, fontWeight: '500', color: BRAND_GREEN },
  wateringHistoryLinkArrow: { fontSize: 20, color: TEXT_SECONDARY },
  yearBlock: { gap: 8 },
  yearLabel: { fontSize: 13, opacity: 0.7 },
  photoRow: { gap: 8 },
  photoThumb: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: BORDER_DEFAULT,
  },
  photoCover: {
    borderWidth: 2,
    borderColor: BRAND_GREEN,
  },
  eventAddBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND_GREEN,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  eventAddText: { color: BRAND_GREEN, fontSize: 15, fontWeight: '500' },
  headerMenuButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 14,
    lineHeight: 22,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    paddingVertical: 24,
  },
  // Issue #298 Phase 1: timeline タブ planned events 表示用 (Card 風)
  eventEntry: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_DEFAULT,
    gap: 4,
    marginBottom: 8,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventDate: { fontSize: 13, color: TEXT_SECONDARY, fontVariant: ['tabular-nums'] },
  entryDesc: { fontSize: 13, opacity: 0.7, lineHeight: 18 },
});
