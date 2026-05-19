/**
 * 一括 action 起動 共通 hook (ADR-0025 Phase 2 案 B FAB 起動)。
 *
 * 予定タブ + 記録タブの FAB tap 時の動線を集約。盆栽件数による分岐:
 * - **0 件**: 盆栽タブ (empty CTA) へ誘導
 * - **1 件**: 自動選択 + 直接 bulk-work-picker (mode) 起動
 * - **2+ 件**: bonsai-multi-select modal を起動 (盆栽選択画面)
 *
 * 後続 flow (BulkWorkPickerScreen → BulkLogConfirm) は
 * 既存 pickerStore 経路 (setBulkContext + consumeBulkWorkPickerResult 等) を再利用。
 * Phase 2 (#545 後) で導入、 Sess8 PR-2 で 予定/記録タブから利用。
 * (Sess12: BulkScheduleDate は ADR-0025 案 B FAB flow 移行後 dead code として廃止)
 */
import { useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';

import { usePickerStore, type BulkBonsaiRef } from '@/src/stores/pickerStore';

export type BulkActionMode = 'log' | 'schedule';

export function useBulkActionFlow(mode: BulkActionMode) {
  const router = useRouter();

  const startBulkAction = useCallback(
    (bonsais: readonly BulkBonsaiRef[]) => {
      if (bonsais.length === 0) {
        // 0 件: 盆栽タブ empty CTA へ誘導 (盆栽追加導線)
        router.push('/(tabs)/bonsai' as Href);
        return;
      }
      if (bonsais.length === 1) {
        // 1 件: 自動選択 + 直接 bulk-work-picker (mode) 起動
        usePickerStore.getState().setBulkContext({ selectedBonsais: bonsais });
        router.push(`/bulk-work-picker?mode=${mode}` as Href);
        return;
      }
      // 2+ 件: bonsai-multi-select modal を起動
      router.push(`/bonsai-multi-select?mode=${mode}` as Href);
    },
    [mode, router],
  );

  return { startBulkAction };
}
