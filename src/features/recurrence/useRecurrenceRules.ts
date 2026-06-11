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
  ruleGroupKey,
  type RecurrenceRuleRow,
} from '@/src/db/recurrenceRuleRepository';
import type { Bonsai } from '@/src/db/schema';

/**
 * Sess99 #1122 案 G2: 定期予定グループ (= 同時作成された rule 群を 1 単位で表示/編集)。
 * representative = 一覧表示・編集起点に使う代表 rule (= 全 member が同じ rrule/種別/開始日)。
 */
export type RecurrenceRuleGroup = {
  key: string;
  rules: RecurrenceRuleRow[];
  representative: RecurrenceRuleRow;
};

export type UseRecurrenceRules = {
  rules: RecurrenceRuleRow[];
  /** Sess99 #1122 案 G2: group_id (旧データは rule.id) でまとめたグループ一覧 (作成新しい順)。 */
  groups: RecurrenceRuleGroup[];
  bonsaiMap: Map<string, Bonsai>;
  /** ruleId → 次回予定日 ISO 8601 UTC (= 全て過去 / 全 exdate なら null)、 Sess82 PR-B 追加 */
  nextOccurrenceMap: Map<string, string | null>;
  loading: boolean;
  reload: () => Promise<void>;
};

/** rules (created_at DESC) → グループ配列 (初出順 = 新しい順) の純関数。 */
export function groupRecurrenceRules(rules: RecurrenceRuleRow[]): RecurrenceRuleGroup[] {
  const map = new Map<string, RecurrenceRuleRow[]>();
  for (const rule of rules) {
    const key = ruleGroupKey(rule);
    const list = map.get(key);
    if (list) list.push(rule);
    else map.set(key, [rule]);
  }
  return [...map.entries()].map(([key, groupRules]) => ({
    key,
    rules: groupRules,
    representative: groupRules[0]!, // map value は必ず 1 件以上
  }));
}

export function useRecurrenceRules(): UseRecurrenceRules {
  const [rules, setRules] = useState<RecurrenceRuleRow[]>([]);
  const [groups, setGroups] = useState<RecurrenceRuleGroup[]>([]);
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
      setGroups(groupRecurrenceRules(loadedRules));
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

  return { rules, groups, bonsaiMap, nextOccurrenceMap, loading, reload };
}
