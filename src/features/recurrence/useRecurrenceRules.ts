/**
 * Active recurrence rules を 取得 + reload する hook (Sess81 PR-7.5)。
 *
 * 責務:
 * - 起動時 + focus 毎に listActiveRecurrenceRules() 呼出
 * - bonsai (名前 lookup 用) 同時取得
 * - reload 関数 export (削除/編集後の再取得)
 * - loading state
 *
 * 参照: src/features/calendar/useCalendarData.ts (focus reload pattern 踏襲)
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { getAllActiveBonsai } from '@/src/db/bonsaiRepository';
import {
  listActiveRecurrenceRules,
  type RecurrenceRuleRow,
} from '@/src/db/recurrenceRuleRepository';
import type { Bonsai } from '@/src/db/schema';

export type UseRecurrenceRules = {
  rules: RecurrenceRuleRow[];
  bonsaiMap: Map<string, Bonsai>;
  loading: boolean;
  reload: () => Promise<void>;
};

export function useRecurrenceRules(): UseRecurrenceRules {
  const [rules, setRules] = useState<RecurrenceRuleRow[]>([]);
  const [bonsaiMap, setBonsaiMap] = useState<Map<string, Bonsai>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [loadedRules, bonsai] = await Promise.all([
        listActiveRecurrenceRules(),
        getAllActiveBonsai(),
      ]);
      setRules(loadedRules);
      setBonsaiMap(new Map(bonsai.map((b) => [b.id, b])));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { rules, bonsaiMap, loading, reload };
}
