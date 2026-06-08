import { useCallback, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useRouter, type Href } from 'expo-router';

import { useToastStore } from '@/src/components/Toast';
import type { TranslationKey } from '@/src/core/i18n/locales/en';
import { archiveBonsai, type BonsaiWithSpecies } from '@/src/db/bonsaiRepository';
import { bulkSoftDeleteEvents } from '@/src/db/eventRepository';
import type { Event } from '@/src/db/schema';
import { cancelForEvents } from '@/src/features/notification/cancelForEvent';

/**
 * 盆栽詳細「イベント編集 (R8a) / 削除 (R8) + アーカイブ (R9)」の state とハンドラ (ADR-0036 D1-D4 + ADR-0055 D7)。
 *
 * Phase 4 A1-12 で `bonsai/[id]/index.tsx` から抽出 (挙動不変)。
 * - 編集 (Sess77 ADR-0055): kebab tap → RowActionMenu (編集 + 削除 2 items) → 編集 tap →
 *   `/work-log-confirm?eventId=...` push (mode === 'edit')、 削除 tap → ConfirmDialog (既存) 起動。
 * - 削除: 作業履歴タブの長押し (Haptics 付) で対象 id を保留 → ConfirmDialog で確定。
 *   確定時 bulkSoftDeleteEvents(R-43 atomic) + 通知キャンセル + reload + Toast (D5 撤回で Undo なし)。
 * - アーカイブ: 基本情報タブの「アーカイブ」ボタン → ConfirmDialog → archiveBonsai → onArchived()。
 * - ConfirmDialog / RowActionMenu 本体 JSX は index.tsx の render に残置し、本フックの state で駆動する。
 *
 * `onArchived` は index.tsx が `() => router.back()` を渡す (router 依存を切り離す)。
 */
export function useEventActions({
  bonsaiName,
  bonsaiId,
  item,
  reload,
  t,
  onArchived,
}: {
  bonsaiName: string;
  bonsaiId: string;
  item: BonsaiWithSpecies | null;
  reload: () => Promise<void>;
  t: (key: TranslationKey) => string;
  onArchived: () => void;
}) {
  const router = useRouter();

  // ADR-0055 Sess77 PR-3: kebab tap で開く RowActionMenu の対象 event state。
  // 旧 kebabDeleteEvent (直接 ConfirmDialog 起動) を menu 経由に変更し、 編集 + 削除 の 2 動線を統一。
  const [pendingKebabEvent, setPendingKebabEvent] = useState<Event | null>(null);
  const kebabPressEvent = useCallback((ev: Event) => {
    setPendingKebabEvent(ev);
  }, []);
  const handleKebabDismiss = useCallback(() => setPendingKebabEvent(null), []);

  // 削除 (R8): history タブ = logged only、planEventDeleteConfirmLoggedSingleTitle 利用。
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const confirmDeleteEvent = useCallback((ev: Event) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // R-45 長押し成功 fb
    setPendingDeleteId(ev.id);
  }, []);
  // ADR-0055 PR-3 拡張: kebab menu「削除」 tap → menu 閉じる + ConfirmDialog 起動。
  const handleDeleteFromKebab = useCallback(() => {
    if (!pendingKebabEvent) return;
    const id = pendingKebabEvent.id;
    setPendingKebabEvent(null);
    setPendingDeleteId(id);
  }, [pendingKebabEvent]);
  // ADR-0055 PR-3 新規: kebab menu「編集」 tap → menu 閉じる + WorkLogConfirm を edit mode で起動。
  const handleEditFromKebab = useCallback(() => {
    if (!pendingKebabEvent) return;
    const ev = pendingKebabEvent;
    setPendingKebabEvent(null);
    const bonsaiNameParam = encodeURIComponent(bonsaiName);
    router.push(
      `/work-log-confirm?eventId=${ev.id}&bonsaiId=${bonsaiId}&bonsaiName=${bonsaiNameParam}&type=${ev.type}` as Href,
    );
  }, [pendingKebabEvent, bonsaiId, bonsaiName, router]);

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
    // 削除
    deleteConfirmVisible: pendingDeleteId !== null,
    confirmDeleteEvent,
    handleConfirmDelete,
    handleCancelDelete,
    // kebab menu (Sess77 PR-3)
    kebabPressEvent,
    pendingKebabEvent,
    handleKebabDismiss,
    handleEditFromKebab,
    handleDeleteFromKebab,
    // アーカイブ
    archiveConfirmVisible,
    handleArchive,
    handleConfirmArchive,
    handleCancelArchive,
  };
}
