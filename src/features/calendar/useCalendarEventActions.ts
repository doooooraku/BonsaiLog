/**
 * カレンダータブ画面の event 操作ロジック (Phase 4 B1 で CalendarTabScreen god から抽出)。
 *
 * 責務:
 * - グループ展開 state (expandedTypes / toggleExpand)
 * - 削除確認 (pendingDelete) + kebab メニュー (kebabMenu) state と各 handler
 * - 予定→記録 変換動線 (handleSingleConvert / handleBulkConvert、 ADR-0035 D7 / R-43)
 * - 削除実行 (bulkSoftDeleteEvents + 通知 cancel + reload + Undo Toast、 ADR-0036)
 * - グループ件数 / a11y ラベル整形
 *
 * 振る舞いは CalendarTabScreen の元実装と完全同一 (純粋な抽出)。
 */
import * as Haptics from 'expo-haptics';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { useToastStore } from '@/src/components/Toast';
import type { TranslationKey } from '@/src/core/i18n/i18n';
import { bulkSoftDeleteEvents } from '@/src/db/eventRepository';
import { type Bonsai, type Event, type EventType } from '@/src/db/schema';
import { cancelForEvents } from '@/src/features/notification/cancelForEvent';
import { usePickerStore } from '@/src/stores/pickerStore';

type PendingDelete = {
  eventIds: readonly string[];
  titleKey:
    | 'planEventDeleteConfirmPlannedSingleTitle'
    | 'planEventDeleteConfirmLoggedSingleTitle'
    | 'planEventDeleteConfirmPlannedGroupTitle'
    | 'planEventDeleteConfirmLoggedGroupTitle';
  count: number;
  hasWiring: boolean;
  undoMessageKey: 'undoSnackbarPlannedDeleteN' | 'undoSnackbarLoggedDeleteN';
};

type KebabMenu = {
  type: EventType;
  events: readonly Event[];
  status: 'planned' | 'logged';
};

type UseCalendarEventActionsArgs = {
  bonsaiMap: Map<string, Bonsai>;
  reload: () => Promise<void>;
  t: (key: TranslationKey) => string;
};

export function useCalendarEventActions({ bonsaiMap, reload, t }: UseCalendarEventActionsArgs) {
  const router = useRouter();

  const [expandedTypes, setExpandedTypes] = useState<Set<EventType>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [kebabMenu, setKebabMenu] = useState<KebabMenu | null>(null);

  const toggleExpand = useCallback((type: EventType) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  // 予定→記録 変換動線 (ADR-0035 D7、 両 mode 共通 = D7 維持)
  const handleSingleConvert = useCallback(
    (ev: Event) => {
      const b = bonsaiMap.get(ev.bonsaiId);
      const bonsaiNameParam = encodeURIComponent(b?.name ?? '');
      router.push(
        `/work-log-confirm?bonsaiId=${ev.bonsaiId}&bonsaiName=${bonsaiNameParam}&type=${ev.type}&fromPlannedId=${ev.id}` as Href,
      );
    },
    [bonsaiMap, router],
  );

  const handleBulkConvert = useCallback(
    (type: EventType, groupEvents: readonly Event[]) => {
      const csvIds = groupEvents.map((e) => e.id).join(',');
      const selectedBonsais = groupEvents.map((e) => ({
        id: e.bonsaiId,
        name: bonsaiMap.get(e.bonsaiId)?.name ?? '',
      }));
      usePickerStore.getState().setBulkContext({ selectedBonsais });
      router.push(`/bulk-log-confirm?type=${type}&fromPlannedIds=${csvIds}` as Href);
    },
    [bonsaiMap, router],
  );

  const triggerLongPressHaptic = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const showIndividualDeleteDialog = useCallback((ev: Event) => {
    setPendingDelete({
      eventIds: [ev.id],
      titleKey:
        ev.status === 'planned'
          ? 'planEventDeleteConfirmPlannedSingleTitle'
          : 'planEventDeleteConfirmLoggedSingleTitle',
      count: 1,
      hasWiring: ev.type === 'wiring',
      undoMessageKey:
        ev.status === 'planned' ? 'undoSnackbarPlannedDeleteN' : 'undoSnackbarLoggedDeleteN',
    });
  }, []);

  const confirmDeleteEvent = useCallback(
    (ev: Event) => {
      triggerLongPressHaptic();
      showIndividualDeleteDialog(ev);
    },
    [triggerLongPressHaptic, showIndividualDeleteDialog],
  );

  const confirmDeleteGroup = useCallback(
    (status: 'planned' | 'logged', type: EventType, groupEvents: readonly Event[]) => {
      triggerLongPressHaptic();
      const hasWiring = type === 'wiring' || groupEvents.some((e) => e.type === 'wiring');
      const isSingle = groupEvents.length === 1;
      setPendingDelete({
        eventIds: groupEvents.map((e) => e.id),
        titleKey: isSingle
          ? status === 'planned'
            ? 'planEventDeleteConfirmPlannedSingleTitle'
            : 'planEventDeleteConfirmLoggedSingleTitle'
          : status === 'planned'
            ? 'planEventDeleteConfirmPlannedGroupTitle'
            : 'planEventDeleteConfirmLoggedGroupTitle',
        count: groupEvents.length,
        hasWiring,
        undoMessageKey:
          status === 'planned' ? 'undoSnackbarPlannedDeleteN' : 'undoSnackbarLoggedDeleteN',
      });
    },
    [triggerLongPressHaptic],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const { eventIds, count, undoMessageKey } = pendingDelete;
    setPendingDelete(null);
    await bulkSoftDeleteEvents(eventIds);
    await cancelForEvents(eventIds, t);
    await reload();
    useToastStore.getState().show(t(undoMessageKey).replace('{count}', String(count)));
  }, [pendingDelete, t, reload]);

  const handleCancelDelete = useCallback(() => setPendingDelete(null), []);

  const handleKebabPress = useCallback(
    (status: 'planned' | 'logged', type: EventType, groupEvents: readonly Event[]) => {
      setKebabMenu({ type, events: groupEvents, status });
    },
    [],
  );
  const handleKebabDismiss = useCallback(() => setKebabMenu(null), []);

  const confirmDialogTitle = useMemo(() => {
    if (!pendingDelete) return '';
    const base = t(pendingDelete.titleKey).replace('{count}', String(pendingDelete.count));
    if (pendingDelete.hasWiring && pendingDelete.eventIds.length > 1) {
      return `${base} ${t('planEventDeleteConfirmWiringCascadeNote')}`;
    }
    return base;
  }, [pendingDelete, t]);

  const formatGroupCount = useCallback(
    (groupEvents: readonly Event[]): string => {
      const uniqueBonsaiCount = new Set(groupEvents.map((e) => e.bonsaiId)).size;
      if (groupEvents.length === uniqueBonsaiCount) return `×${groupEvents.length}`;
      return `×${groupEvents.length} (${t('planListingBonsaiCount').replace('{count}', String(uniqueBonsaiCount))})`;
    },
    [t],
  );

  const formatGroupAccessibility = useCallback(
    (groupLabel: string, groupEvents: readonly Event[], toggleText: string): string => {
      const uniqueBonsaiCount = new Set(groupEvents.map((e) => e.bonsaiId)).size;
      if (groupEvents.length === uniqueBonsaiCount) {
        return `${groupLabel} ×${groupEvents.length}, ${toggleText}`;
      }
      return `${groupLabel} ${groupEvents.length}件 ${uniqueBonsaiCount}鉢, ${toggleText}`;
    },
    [],
  );

  return {
    expandedTypes,
    toggleExpand,
    pendingDelete,
    kebabMenu,
    handleSingleConvert,
    handleBulkConvert,
    showIndividualDeleteDialog,
    confirmDeleteEvent,
    confirmDeleteGroup,
    handleConfirmDelete,
    handleCancelDelete,
    handleKebabPress,
    handleKebabDismiss,
    confirmDialogTitle,
    formatGroupCount,
    formatGroupAccessibility,
  };
}
