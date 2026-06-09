/**
 * Active recurrence rules を 取得 + reload する hook (Sess81 PR-7.5)。
 *
 * 責務:
 * - 起動時 + focus 毎に listActiveRecurrenceRules() 呼出
 * - bonsai (名前 lookup 用) 同時取得
 * - **Sess82 PR-B**: 各 rule の 次回予定日 (nextOccurrenceMap) 同時取得
 * - reload 関数 export (削除/編集後の再取得)
 * - loading state
 *
 * 参照: src/features/calendar/useCalendarData.ts (focus reload pattern 踏襲)
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { nowUtc } from '@/src/core/datetime';
import { getAllActiveBonsai } from '@/src/db/bonsaiRepository';
import {
  getNextOccurrence,
  listActiveRecurrenceRules,
  type RecurrenceRuleRow,
} from '@/src/db/recurrenceRuleRepository';
import type { Bonsai } from '@/src/db/schema';

export type UseRecurrenceRules = {
  rules: RecurrenceRuleRow[];
  bonsaiMap: Map<string, Bonsai>;
  /** ruleId → 次回予定日 ISO 8601 UTC (= 全て過去 / 全 exdate なら null)、 Sess82 PR-B 追加 */
  nextOccurrenceMap: Map<string, string | null>;
  loading: boolean;
  reload: () => Promise<void>;
};

export function useRecurrenceRules(): UseRecurrenceRules {
  const [rules, setRules] = useState<RecurrenceRuleRow[]>([]);
  const [bonsaiMap, setBonsaiMap] = useState<Map<string, Bonsai>>(new Map());
  const [nextOccurrenceMap, setNextOccurrenceMap] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [loadedRules, bonsai] = await Promise.all([
        listActiveRecurrenceRules(),
        getAllActiveBonsai(),
      ]);
      // Sess82 PR-B: 各 rule の 次回予定日を 並列取得 (= N+1 だが N 小 (Pro でも数十)、 Promise.all で OK)
      const nowIso = nowUtc() as string;
      const nextOccurrences = await Promise.all(
        loadedRules.map(async (r) => [r.id, await getNextOccurrence(r.id, nowIso)] as const),
      );
      setRules(loadedRules);
      setBonsaiMap(new Map(bonsai.map((b) => [b.id, b])));
      setNextOccurrenceMap(new Map(nextOccurrences));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { rules, bonsaiMap, nextOccurrenceMap, loading, reload };
}
