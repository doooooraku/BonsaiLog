/**
 * 一括 action 起動 共通 hook (ADR-0025 Phase 2 案 B FAB 起動)。
 *
 * 予定タブ + 記録タブの FAB tap 時の動線を集約。盆栽件数による分岐:
 * - **0 件**: 盆栽タブ (empty CTA) へ誘導
 * - **1 件**: 自動選択 + 直接 bulk-work-picker (mode) 起動
 * - **2+ 件**: bonsai-multi-select modal を起動 (盆栽選択画面)
 *
 * 後続 flow (Sess12 PR-B+C で DB 書き込み配線完了):
 * - schedule: BulkWorkPicker.handleSelect → bulkScheduleEvents → Toast → router.dismissAll
 * - log: BulkWorkPicker.handleSelect → router.push('/bulk-log-confirm') →
 *        BulkLogConfirm.handleSave → bulkLogEvents → Toast → router.dismissAll
 *
 * scheduleDate は schedule mode で予定タブ FAB から渡される (YYYY-MM-DD)。
 * URL param `?date=...` 経由で次画面に伝達 (deep-link 対応も視野)。
 * Phase 2 (#545 後) で導入、 Sess8 PR-2 で 予定/記録タブから利用。
 * (Sess12: BulkScheduleDate は ADR-0025 案 B FAB flow 移行後 dead code として廃止)
 */
import { useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';

import { usePickerStore, type BulkBonsaiRef } from '@/src/stores/pickerStore';

/**
 * BulkActionMode = 一括動作モード:
 * - 'log' = 一括記録 (= BulkWorkPicker → BulkLogConfirm)
 * - 'schedule' = 一括予定追加 (= BulkWorkPicker → 1 タップ直接保存、 PR-6.5)
 * - 'recurring' = 定期予定 新規作成 (= Sess82 PR-D、 BulkWorkPicker → /recurring-rules/new?bonsaiId=...&eventType=...)
 */
export type BulkActionMode = 'log' | 'schedule' | 'recurring';

export function useBulkActionFlow(mode: BulkActionMode) {
  const router = useRouter();

  const startBulkAction = useCallback(
    (bonsais: readonly BulkBonsaiRef[], scheduleDate?: string) => {
      if (bonsais.length === 0) {
        // 0 件: 盆栽タブ empty CTA へ誘導 (盆栽追加導線)
        router.push('/(tabs)/bonsai' as Href);
        return;
      }
      const dateParam = scheduleDate ? `&date=${encodeURIComponent(scheduleDate)}` : '';
      if (bonsais.length === 1) {
        // 1 件: 自動選択 + 直接 bulk-work-picker (mode) 起動
        usePickerStore.getState().setBulkContext({ selectedBonsais: bonsais });
        router.push(`/bulk-work-picker?mode=${mode}${dateParam}` as Href);
        return;
      }
      // 2+ 件: bonsai-multi-select modal を起動
      // Sess12 PR-F bug fix: 新規 flow 起動時は bulkContext を clear (前回の selection が
      // BonsaiMultiSelect の mount 時 restore で復元されないように)。
      // BulkWorkPicker から ← で戻る場合は BonsaiMultiSelect が unmount しないので
      // useState の selectedIds は React Navigation の screen alive 機構で維持される。
      usePickerStore.getState().setBulkContext(null);
      router.push(`/bonsai-multi-select?mode=${mode}${dateParam}` as Href);
    },
    [mode, router],
  );

  return { startBulkAction };
}
