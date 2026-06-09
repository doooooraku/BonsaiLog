/**
 * Recurrence Rule Repository (Sess78 PR-3、 ADR-0056 定期予定機能)。
 *
 * - recurrence_rules テーブル CRUD (schemaV16、 Sess78 PR-2 で 追加済)
 * - cascade: rule create/update/delete 時に events 連動 (recurrence_rule_id FK で結合)
 * - 8 週分 events 事前展開 + 起動時バッチで 不足分を 追加展開
 * - scope 3 択 (this / following / all) は updateRecurrenceRule で 使用 (実装は 簡易版、 PR-5 で 完成)
 *
 * Pro 境界 (ADR-0049 ⑦ Amendment、 ADR-0056 D7):
 * - FREE_RECURRENCE_RULE_LIMIT = 3 (タグ ②・カスタム樹種 ⑥ pattern 完全踏襲)
 * - countActiveRecurrenceRules / canCreateRecurrenceRule で UI 配線
 *
 * R-66 厳守: RRULE 展開は expandRRule 純関数経由のみ、 `toLocalDateKey` で 正規化済。
 */
import { ulid } from 'ulid';

import { nowUtc, getTzOffsetMin, getTzIana, toLocalDateKey } from '@/src/core/datetime';
import type { IsoUtc } from '@/src/core/datetime/types';
import { expandRRule } from '@/src/core/recurrence/rrule';

import { getDb } from './db';

/** Free user の 定期予定ルール 上限 (ADR-0049 ⑦ + ADR-0056 D7、 タグ ②・カスタム樹種 ⑥ pattern 踏襲)。 */
export const FREE_RECURRENCE_RULE_LIMIT = 3;

/** rule 作成時 / 起動時 batch で 何週分先まで 事前展開するか (ADR-0056 D3)。 */
export const RECURRENCE_PREEXPAND_WEEKS = 8;

/** 1 rule あたり最大展開件数 (ADR-0056 R3 性能ガード = 約 20 年 weekly)。 */
export const RECURRENCE_MAX_EVENTS_PER_RULE = 1000;

export type CreateRecurrenceRuleInput = {
  bonsaiId: string;
  eventType: string;
  rrule: string; // RFC 5545 RRULE 文字列 (例: "FREQ=WEEKLY;BYDAY=MO")
  startAtUtc: string; // ISO UTC
  endAtUtc: string | null; // null = 永遠 (= caller default +365 日 推奨)
};

export type RecurrenceRuleRow = {
  id: string;
  bonsaiId: string;
  eventType: string;
  rrule: string;
  startAtUtc: string;
  endAtUtc: string | null;
  exdates: string[];
  tzIana: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * 定期予定ルール作成 + 8 週分 events 事前展開。
 *
 * Sess14 罠回避: `withTransactionAsync` の代わりに 個別 runAsync で 部分失敗時の
 * orphan rule を許容 (= 起動時 batch で 追加展開で 補完)。
 */
export async function createRecurrenceRule(
  input: CreateRecurrenceRuleInput,
): Promise<RecurrenceRuleRow> {
  const db = await getDb();
  const id = ulid();
  const now = nowUtc() as string;
  const tzIana = getTzIana() as string;
  const tzOffsetMin = getTzOffsetMin() as number;
  const exdates: string[] = [];

  await db.runAsync(
    `INSERT INTO recurrence_rules
       (id, bonsai_id, event_type, rrule, start_at_utc, end_at_utc, exdates, tz_iana, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      input.bonsaiId,
      input.eventType,
      input.rrule,
      input.startAtUtc,
      input.endAtUtc,
      JSON.stringify(exdates),
      tzIana,
      now,
      now,
    ],
  );

  // 8 週分先まで events 事前展開 (default 終了日が null = 永遠 の場合の安全策)
  const eightWeeksLaterMs = 8 * 7 * 24 * 60 * 60 * 1000;
  const expandUntilMs = Math.min(
    input.endAtUtc ? new Date(input.endAtUtc).getTime() : Number.POSITIVE_INFINITY,
    new Date(input.startAtUtc).getTime() + eightWeeksLaterMs,
  );
  const expandUntilIso = new Date(expandUntilMs).toISOString();

  const dateKeys = expandRRule(
    input.rrule,
    input.startAtUtc,
    expandUntilIso,
    exdates,
    tzOffsetMin,
    RECURRENCE_MAX_EVENTS_PER_RULE,
  );

  for (const dateKey of dateKeys) {
    const eventId = ulid();
    const occurredAtUtc = `${dateKey}T00:00:00.000Z`;
    await db.runAsync(
      `INSERT INTO events
         (id, bonsai_id, type, status, occurred_at_utc, tz_offset_min, tz_iana,
          recurrence_rule_id, created_at, updated_at)
       VALUES (?, ?, ?, 'planned', ?, ?, ?, ?, ?, ?);`,
      [eventId, input.bonsaiId, input.eventType, occurredAtUtc, tzOffsetMin, tzIana, id, now, now],
    );
  }

  return {
    id,
    bonsaiId: input.bonsaiId,
    eventType: input.eventType,
    rrule: input.rrule,
    startAtUtc: input.startAtUtc,
    endAtUtc: input.endAtUtc,
    exdates,
    tzIana,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 複数の盆栽に同じ定期予定を一括作成 (= Sess89 PR-C、 R-73 起票 (= 旧 R-72 は PR #1033 と衝突で R-73 hotfix))。
 *
 * 各 input ごとに createRecurrenceRule と同じ logic (= recurrence_rules INSERT +
 * 8 週分 events 事前展開) を実行、 全件をひとつの transaction で wrap。
 * 途中で失敗した場合は **全件 rollback** で原子性保証 (= データ不整合防止)。
 *
 * 設計判断:
 * - 既存 createRecurrenceRule の内部 logic を inline で展開 (= 入れ子 transaction 回避)
 * - 既存 bulkScheduleEvents / bulkLogEvents pattern と同型 (= db.withTransactionAsync)
 * - R-73: 「caller で複数件 INSERT する時は必ず本 bulk ラッパー経由で原子性保証」
 *
 * @param inputs - 作成する rule 入力配列、 各要素が createRecurrenceRule の input と同型
 * @returns 作成された全 rule 配列 (= 順序は inputs 順)
 * @throws inputs[i] の INSERT が 1 件でも失敗すると全件 rollback して再 throw
 */
export async function bulkCreateRecurrenceRules(
  inputs: readonly CreateRecurrenceRuleInput[],
): Promise<RecurrenceRuleRow[]> {
  if (inputs.length === 0) return [];

  const db = await getDb();
  const now = nowUtc() as string;
  const tzIana = getTzIana() as string;
  const tzOffsetMin = getTzOffsetMin() as number;
  const exdates: string[] = [];
  const results: RecurrenceRuleRow[] = [];

  await db.withTransactionAsync(async () => {
    for (const input of inputs) {
      const id = ulid();

      await db.runAsync(
        `INSERT INTO recurrence_rules
           (id, bonsai_id, event_type, rrule, start_at_utc, end_at_utc, exdates, tz_iana, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          id,
          input.bonsaiId,
          input.eventType,
          input.rrule,
          input.startAtUtc,
          input.endAtUtc,
          JSON.stringify(exdates),
          tzIana,
          now,
          now,
        ],
      );

      // 8 週分先まで events 事前展開 (= createRecurrenceRule と同 logic、 default 永遠 rule の安全策)
      const eightWeeksLaterMs = 8 * 7 * 24 * 60 * 60 * 1000;
      const expandUntilMs = Math.min(
        input.endAtUtc ? new Date(input.endAtUtc).getTime() : Number.POSITIVE_INFINITY,
        new Date(input.startAtUtc).getTime() + eightWeeksLaterMs,
      );
      const expandUntilIso = new Date(expandUntilMs).toISOString();

      const dateKeys = expandRRule(
        input.rrule,
        input.startAtUtc,
        expandUntilIso,
        exdates,
        tzOffsetMin,
        RECURRENCE_MAX_EVENTS_PER_RULE,
      );

      for (const dateKey of dateKeys) {
        const eventId = ulid();
        const occurredAtUtc = `${dateKey}T00:00:00.000Z`;
        await db.runAsync(
          `INSERT INTO events
             (id, bonsai_id, type, status, occurred_at_utc, tz_offset_min, tz_iana,
              recurrence_rule_id, created_at, updated_at)
           VALUES (?, ?, ?, 'planned', ?, ?, ?, ?, ?, ?);`,
          [
            eventId,
            input.bonsaiId,
            input.eventType,
            occurredAtUtc,
            tzOffsetMin,
            tzIana,
            id,
            now,
            now,
          ],
        );
      }

      results.push({
        id,
        bonsaiId: input.bonsaiId,
        eventType: input.eventType,
        rrule: input.rrule,
        startAtUtc: input.startAtUtc,
        endAtUtc: input.endAtUtc,
        exdates,
        tzIana,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      });
    }
  });

  return results;
}

/**
 * 現在 active な (deleted_at IS NULL) ルール件数を返す。
 * Pro 境界判定 (ADR-0049 ⑦ + ADR-0056 D7) で使用。
 */
export async function countActiveRecurrenceRules(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM recurrence_rules WHERE deleted_at IS NULL;',
  );
  return row?.count ?? 0;
}

/**
 * 現在 active な (deleted_at IS NULL) 全 ルールを 作成順 (新しい順) で 取得。
 *
 * Sess81 PR-7.5 で 追加。 LookBackHub「🔁 定期予定を管理」 card → RecurrenceListScreen で
 * active rules 一覧表示に 使用。
 *
 * @returns RecurrenceRuleRow[] (deleted_at IS NULL、 ORDER BY created_at DESC)
 */
export async function listActiveRecurrenceRules(): Promise<RecurrenceRuleRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    bonsai_id: string;
    event_type: string;
    rrule: string;
    start_at_utc: string;
    end_at_utc: string | null;
    exdates: string;
    tz_iana: string;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, bonsai_id, event_type, rrule, start_at_utc, end_at_utc, exdates,
            tz_iana, deleted_at, created_at, updated_at
     FROM recurrence_rules
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC;`,
  );
  return rows.map((r) => ({
    id: r.id,
    bonsaiId: r.bonsai_id,
    eventType: r.event_type,
    rrule: r.rrule,
    startAtUtc: r.start_at_utc,
    endAtUtc: r.end_at_utc,
    exdates: JSON.parse(r.exdates) as string[],
    tzIana: r.tz_iana,
    deletedAt: r.deleted_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

/**
 * 指定 rule の 次回予定日 (= 最も近い未来の planned event の occurred_at_utc) を 取得。
 *
 * Sess82 PR-B で 追加 (= RecurrenceListScreen の表示要素再設計、 「次回 yyyy-mm-dd」 表示用)。
 * 既存の 8 週分 eager 展開済 events を 参照するだけで O(log N)、 expandRRule 再実行不要。
 *
 * - 未来 1 件以上: MIN(occurred_at_utc) を 返す
 * - 全て過去 / 全て exdate / rule 削除済: null を 返す
 *
 * @param ruleId 対象 rule ID
 * @param nowUtcIso 「今」 の ISO 文字列 (= 通常 `nowUtc()`、 test mock 容易化のため引数化)
 * @returns 次回予定日 occurred_at_utc (ISO 8601 UTC) or null
 */
export async function getNextOccurrence(ruleId: string, nowUtcIso: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ next_at: string | null }>(
    `SELECT MIN(occurred_at_utc) AS next_at
     FROM events
     WHERE recurrence_rule_id = ?
       AND status = 'planned'
       AND occurred_at_utc >= ?
       AND deleted_at IS NULL;`,
    [ruleId, nowUtcIso],
  );
  return row?.next_at ?? null;
}

/**
 * 新規 rule 作成可否 (Pro 境界判定、 ADR-0056 D7 + Grandfathered 戦略整合)。
 *
 * - Pro user: 常に true
 * - Free user: 現在件数 < FREE_RECURRENCE_RULE_LIMIT (= 3) なら true
 * - Grandfathered: 既存 4+ rule は表示/編集/削除 OK + 追加のみ Paywall (本関数で 規制)
 */
export async function canCreateRecurrenceRule(isPro: boolean): Promise<boolean> {
  if (isPro) return true;
  const count = await countActiveRecurrenceRules();
  return count < FREE_RECURRENCE_RULE_LIMIT;
}

/**
 * 起動時バッチ: 全 active rule に対して、 次の 8 週分の events を 追加展開。
 *
 * 重複 insert は (recurrence_rule_id + occurred_at_utc) の hash check で 回避
 * (= 既存 events SELECT で dateKey 集合と diff 計算)。
 *
 * Sess78 PR-3 では 基本実装のみ、 PR-5 で 通知 cascade と統合。
 */
export async function expandFutureEventsForAllActiveRules(): Promise<number> {
  const db = await getDb();
  const rules = await db.getAllAsync<{
    id: string;
    bonsai_id: string;
    event_type: string;
    rrule: string;
    start_at_utc: string;
    end_at_utc: string | null;
    exdates: string;
    tz_iana: string;
  }>(
    'SELECT id, bonsai_id, event_type, rrule, start_at_utc, end_at_utc, exdates, tz_iana FROM recurrence_rules WHERE deleted_at IS NULL;',
  );

  const now = nowUtc() as string;
  const tzOffsetMin = getTzOffsetMin() as number;
  const eightWeeksLaterMs = 8 * 7 * 24 * 60 * 60 * 1000;
  const nowDate = new Date(now);
  let insertedCount = 0;

  for (const rule of rules) {
    const startAt =
      nowDate.getTime() > new Date(rule.start_at_utc).getTime() ? now : rule.start_at_utc;
    const expandUntilMs = Math.min(
      rule.end_at_utc ? new Date(rule.end_at_utc).getTime() : Number.POSITIVE_INFINITY,
      nowDate.getTime() + eightWeeksLaterMs,
    );
    const expandUntilIso = new Date(expandUntilMs).toISOString();
    const exdates: string[] = JSON.parse(rule.exdates) as string[];

    const dateKeys = expandRRule(
      rule.rrule,
      startAt,
      expandUntilIso,
      exdates,
      tzOffsetMin,
      RECURRENCE_MAX_EVENTS_PER_RULE,
    );

    // 既存 events の occurred_at_utc 集合を取得 (重複 insert 回避)
    const existing = await db.getAllAsync<{ occurred_at_utc: string }>(
      'SELECT occurred_at_utc FROM events WHERE recurrence_rule_id = ? AND deleted_at IS NULL;',
      [rule.id],
    );
    const existingKeys = new Set(
      existing.map((row) => toLocalDateKey(row.occurred_at_utc as IsoUtc, tzOffsetMin)),
    );

    for (const dateKey of dateKeys) {
      if (existingKeys.has(dateKey)) continue;
      const eventId = ulid();
      const occurredAtUtc = `${dateKey}T00:00:00.000Z`;
      await db.runAsync(
        `INSERT INTO events
           (id, bonsai_id, type, status, occurred_at_utc, tz_offset_min, tz_iana,
            recurrence_rule_id, created_at, updated_at)
         VALUES (?, ?, ?, 'planned', ?, ?, ?, ?, ?, ?);`,
        [
          eventId,
          rule.bonsai_id,
          rule.event_type,
          occurredAtUtc,
          tzOffsetMin,
          rule.tz_iana,
          rule.id,
          now,
          now,
        ],
      );
      insertedCount += 1;
    }
  }
  return insertedCount;
}

/**
 * 指定 ID の rule を 取得 (= 編集画面の初期値ロード用、 Sess82 PR-D 追加)。
 *
 * - rule 存在 + deleted_at IS NULL: RecurrenceRuleRow を返す
 * - rule 存在しない or 削除済: null を返す (= caller で router.back() + Toast 用)
 *
 * @param id ULID
 * @returns RecurrenceRuleRow or null
 */
export async function getRecurrenceRuleById(id: string): Promise<RecurrenceRuleRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: string;
    bonsai_id: string;
    event_type: string;
    rrule: string;
    start_at_utc: string;
    end_at_utc: string | null;
    exdates: string;
    tz_iana: string;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, bonsai_id, event_type, rrule, start_at_utc, end_at_utc, exdates,
            tz_iana, deleted_at, created_at, updated_at
     FROM recurrence_rules
     WHERE id = ? AND deleted_at IS NULL;`,
    [id],
  );
  if (!row) return null;
  return {
    id: row.id,
    bonsaiId: row.bonsai_id,
    eventType: row.event_type,
    rrule: row.rrule,
    startAtUtc: row.start_at_utc,
    endAtUtc: row.end_at_utc,
    exdates: JSON.parse(row.exdates) as string[],
    tzIana: row.tz_iana,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Rule 編集 (= 削除 + 新規ラッパー、 Sess82 PR-D + plan §C Option A)。
 *
 * 設計: 既存 softDeleteRecurrenceRule + createRecurrenceRule を 100% 流用。
 * - 旧 rule soft-delete (= cascade で 未来 planned events も soft-delete)
 * - 新 rule create (= 8 週 buffer 自動展開)
 * - 過去 logged events は recurrence_rule_id を 旧 rule id のまま保持 (= audit trail 連続性)
 *
 * トレードオフ:
 * - rule id 変更 = Sentry tag 連続性なし (= 現状 Sentry tag 未配線、 影響なし)
 * - 2 phase で部分失敗 (= softDelete 完了 + create 失敗) → softDelete 済 rule が 30 日ゴミ箱に残り
 *   user は 同等 rule を 再作成可能 (= 復旧 path あり)、 Toast「保存に失敗しました」 で 即対応
 * - v1.x で updateRecurrenceRule 純正実装に置き換え可能 (= 後方互換 wrapper)
 *
 * @param oldRuleId 編集対象 rule ID
 * @param newInput 編集後の入力値 (= 全列、 部分編集なし)
 * @returns 新規作成された RecurrenceRuleRow
 */
export async function replaceRecurrenceRule(
  oldRuleId: string,
  newInput: CreateRecurrenceRuleInput,
): Promise<RecurrenceRuleRow> {
  await softDeleteRecurrenceRule(oldRuleId);
  return await createRecurrenceRule(newInput);
}

/**
 * Rule soft-delete + 関連 future planned events も soft-delete cascade。
 * 過去 events (status='logged' or 過去日付の planned) は不変。
 *
 * 通知 cascade reschedule は PR-5 で 配線 (invalidator pattern、 ADR-0014 §20)。
 */
export async function softDeleteRecurrenceRule(id: string): Promise<void> {
  const db = await getDb();
  const now = nowUtc() as string;

  // rule soft-delete
  await db.runAsync(
    `UPDATE recurrence_rules SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL;`,
    [now, now, id],
  );

  // 関連 future planned events soft-delete (過去 logged events は不変)
  await db.runAsync(
    `UPDATE events SET deleted_at = ?, updated_at = ?
     WHERE recurrence_rule_id = ?
       AND status = 'planned'
       AND occurred_at_utc >= ?
       AND deleted_at IS NULL;`,
    [now, now, id, now],
  );
}

/**
 * 1 件 skip (this scope): rule.exdates に該当日追加 + 該当 event soft-delete。
 * ADR-0056 D6 「この 1 件だけ」 動線。
 */
export async function skipOneOccurrence(ruleId: string, dateKey: string): Promise<void> {
  const db = await getDb();
  const now = nowUtc() as string;

  const rule = await db.getFirstAsync<{ exdates: string }>(
    'SELECT exdates FROM recurrence_rules WHERE id = ? AND deleted_at IS NULL;',
    [ruleId],
  );
  if (!rule) return;

  const exdates = JSON.parse(rule.exdates) as string[];
  if (!exdates.includes(dateKey)) {
    exdates.push(dateKey);
    await db.runAsync('UPDATE recurrence_rules SET exdates = ?, updated_at = ? WHERE id = ?;', [
      JSON.stringify(exdates),
      now,
      ruleId,
    ]);
  }

  // 該当 event soft-delete
  const occurredAtUtc = `${dateKey}T00:00:00.000Z`;
  await db.runAsync(
    `UPDATE events SET deleted_at = ?, updated_at = ?
     WHERE recurrence_rule_id = ?
       AND occurred_at_utc = ?
       AND status = 'planned'
       AND deleted_at IS NULL;`,
    [now, now, ruleId, occurredAtUtc],
  );
}
