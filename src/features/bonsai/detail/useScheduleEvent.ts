import { useCallback, useState, type RefObject } from 'react';
import { Alert } from 'react-native';

import type { TranslationKey } from '@/src/core/i18n/locales/en';
import { createEvent } from '@/src/db/eventRepository';
import type { EventType } from '@/src/db/schema';

/**
 * 盆栽詳細「予定追加」フロー (R5)。
 * Issue #298 Phase 2: 作業種別 picker 選択 → DateTimePicker(mode='date')で日付選択 →
 * createEvent({ status: 'planned' }) → reload。3 step を 2 step に簡略化(確認ステップ省略)。
 *
 * Phase 4 A1-10 で `bonsai/[id]/index.tsx` から抽出 (挙動不変)。
 * - 消費側 useFocusEffect (consumeWorkPickerResult → handleSchedulePickerSelect) は
 *   **index.tsx に残置**。reload(useBonsaiDetailData) の useFocusEffect より先に登録する
 *   順序を保つため、本フックは useBonsaiDetailData より前で呼ぶ必要がある。
 * - そのため reload は値ではなく `reloadRef` 経由で注入し、index.tsx が reload 取得後に
 *   `reloadRef.current = reload` で橋渡しする (早期呼出と reload 依存の両立)。
 * - DateTimePicker 本体 JSX は index.tsx の render に残置し、本フックの state で駆動する。
 */
export function useScheduleEvent({
  id,
  t,
  reloadRef,
}: {
  id: string | undefined;
  t: (key: TranslationKey) => string;
  reloadRef: RefObject<(() => Promise<void>) | null>;
}) {
  const [pendingScheduleType, setPendingScheduleType] = useState<EventType | null>(null);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);

  // Step 1: 作業種別選択 → 200ms 後に DatePicker 表示 (picker 画面の閉じアニメーションと競合回避)。
  const handleSchedulePickerSelect = useCallback((type: EventType) => {
    setPendingScheduleType(type);
    setTimeout(() => setShowSchedulePicker(true), 200);
  }, []);

  // Step 2: 日付確定 → planned イベント作成 → reload。
  const handleScheduleDateSelect = useCallback(
    async (date: Date | null) => {
      setShowSchedulePicker(false);
      if (!date || !pendingScheduleType || !id) {
        setPendingScheduleType(null);
        return;
      }
      try {
        await createEvent({
          bonsaiId: id,
          type: pendingScheduleType,
          status: 'planned',
          occurredAtUtc: date.toISOString(),
        });
        setPendingScheduleType(null);
        await reloadRef.current?.();
      } catch (err) {
        Alert.alert(t('error'), String(err));
      }
    },
    [pendingScheduleType, id, t, reloadRef],
  );

  return { showSchedulePicker, handleSchedulePickerSelect, handleScheduleDateSelect };
}
