import { useCallback, useState } from 'react';
import * as Haptics from 'expo-haptics';

import { useToastStore } from '@/src/components/Toast';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import { archiveBonsai, type BonsaiWithSpecies } from '@/src/db/bonsaiRepository';
import { bulkSoftDeleteEvents } from '@/src/db/eventRepository';
import type { Event } from '@/src/db/schema';
import { cancelForEvents } from '@/src/features/notification/cancelForEvent';

/**
 * 盆栽詳細「イベント削除 (R8) + アーカイブ (R9)」の state とハンドラ (ADR-0036 D1-D4)。
 *
 * Phase 4 A1-12 で `bonsai/[id]/index.tsx` から抽出 (挙動不変)。
 * - 削除: 作業履歴タブの長押し (Haptics 付) / kebab tap で対象 id を保留 → ConfirmDialog で確定。
 *   確定時 bulkSoftDeleteEvents(R-43 atomic) + 通知キャンセル + reload + Toast (D5 撤回で Undo なし)。
 * - アーカイブ: 基本情報タブの「アーカイブ」ボタン → ConfirmDialog → archiveBonsai → onArchived()。
 * - ConfirmDialog 本体 JSX は index.tsx の render に残置し、本フックの visible state で駆動する。
 *
 * `onArchived` は index.tsx が `() => router.back()` を渡す (router 依存を切り離す)。
 */
export function useEventActions({
  item,
  reload,
  t,
  onArchived,
}: {
  item: BonsaiWithSpecies | null;
  reload: () => Promise<void>;
  t: (key: TranslationKey) => string;
  onArchived: () => void;
}) {
  // 削除 (R8): history タブ = logged only、planEventDeleteConfirmLoggedSingleTitle 利用。
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const confirmDeleteEvent = useCallback((ev: Event) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // R-45 長押し成功 fb
    setPendingDeleteId(ev.id);
  }, []);
  // Sess27 PR-5: kebab tap (Haptics なし、 個別 row 代替動線)。
  const kebabDeleteEvent = useCallback((ev: Event) => {
    setPendingDeleteId(ev.id);
  }, []);
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

  // アーカイブ (R9): OS 標準 Alert → カスタム ConfirmDialog に統一 (Home 長押しと見た目統一)。
  const [archiveConfirmVisible, setArchiveConfirmVisible] = useState(false);
  const handleArchive = useCallback(() => {
    if (!item) return;
    setArchiveConfirmVisible(true);
  }, [item]);
  const handleConfirmArchive = useCallback(async () => {
    if (!item) return;
    setArchiveConfirmVisible(false);
    await archiveBonsai(item.id);
    onArchived();
  }, [item, onArchived]);
  const handleCancelArchive = useCallback(() => setArchiveConfirmVisible(false), []);

  return {
    deleteConfirmVisible: pendingDeleteId !== null,
    confirmDeleteEvent,
    kebabDeleteEvent,
    handleConfirmDelete,
    handleCancelDelete,
    archiveConfirmVisible,
    handleArchive,
    handleConfirmArchive,
    handleCancelArchive,
  };
}
