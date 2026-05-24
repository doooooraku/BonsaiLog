/**
 * 作業イベント (events) Repository (P2-03 PR-C)。
 *
 * Related:
 * - Issue #17 F-02 foundation (PR-C)
 * - schema.ts: events + tags + event_tags + events_fts (PR-B)
 * - payloadValidator.ts: 13 種別 Valibot
 * - filePathUtils はファイル系ではないため不要
 *
 * 設計方針:
 * - ULID 主キー、UTC ISO 8601 タイムスタンプ、tz_offset_min + tz_iana で TZ 三層防御
 * - status 遷移: planned → logged (タップ) / planned → cancelled (左スワイプ)
 * - 30 日ゴミ箱: deleted_at セット、起動時に 30 日経過分を物理削除
 * - FTS5 trigger は本 Repository 内で INSERT/UPDATE/DELETE 時に手動同期 (trigger 配線が SQLite trigger だと冪等性難しいため、Repository で明示制御)
 * - tags M:N は Repository 経由でのみ操作 (event_tags 直接いじらない)
 */
import { ulid } from 'ulid';

import { getTzIana, getTzOffsetMin, nowUtc } from '@/src/core/datetime';

import { getDb } from './db';
import { snakeToCamelRow, snakeToCamelRows } from './rowMapper';
import { serializeEventPayload, validateEventPayload } from '@/src/features/event/payloadValidator';
import type { Event, EventStatus, EventType } from './schema';

/** 30 日ゴミ箱の保持日数 (ADR-0008、Issue #17 AC4)。 */
export const TRASH_RETENTION_DAYS = 30;

// Sess19-3 (user 真意「F-05 不要」): EVENT_OVERLOAD_THRESHOLD + countSameDayPlannedOrLoggedEvents 削除済。

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

export type CreateEventInput = {
  bonsaiId: string;
  type: EventType;
  status?: EventStatus; // default 'logged'
  occurredAtUtc?: string; // 省略時は now (logged) / planned 時は明示必須
  durationMin?: number | null;
  payload?: unknown; // Valibot で validate
  note?: string | null;
};

export type UpdateEventInput = {
  status?: EventStatus;
  occurredAtUtc?: string;
  durationMin?: number | null;
  payload?: unknown;
  note?: string | null;
};

// ---------------------------------------------------------------------------
// 作成
// ---------------------------------------------------------------------------

export async function createEvent(input: CreateEventInput): Promise<Event> {
  // payload バリデーション (Valibot)
  validateEventPayload(input.type, input.payload ?? {});
  const payloadJson = serializeEventPayload(input.type, input.payload ?? {});

  const db = await getDb();
  const now = nowUtc() as string;
  const id = ulid();
  const status: EventStatus = input.status ?? 'logged';
  const occurredAt = input.occurredAtUtc ?? now;
  const tzOffset = getTzOffsetMin();
  const tzIana = getTzIana();

  await db.runAsync(
    `INSERT INTO events
       (id, bonsai_id, type, status, occurred_at_utc, tz_offset_min, tz_iana, duration_min, payload_json, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      input.bonsaiId,
      input.type,
      status,
      occurredAt,
      tzOffset as number,
      tzIana as string,
      input.durationMin ?? null,
      payloadJson,
      input.note ?? null,
      now,
      now,
    ],
  );

  // FTS5 同期 (INSERT)
  await db.runAsync(
    'INSERT INTO events_fts (event_id, bonsai_id, note, payload_text) VALUES (?, ?, ?, ?);',
    [id, input.bonsaiId, input.note ?? '', payloadJson ?? ''],
  );

  return {
    id,
    bonsaiId: input.bonsaiId,
    type: input.type,
    status,
    occurredAtUtc: occurredAt,
    tzOffsetMin: tzOffset as number,
    tzIana: tzIana as string,
    durationMin: input.durationMin ?? null,
    payloadJson,
    note: input.note ?? null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// 取得
// ---------------------------------------------------------------------------

export async function getEventById(id: string): Promise<Event | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM events WHERE id = ?;',
    [id],
  );
  return snakeToCamelRow<Event>(row);
}

/**
 * 盆栽の active events (deleted_at IS NULL) を occurred_at 降順で取得。
 */
export async function getActiveEventsByBonsai(bonsaiId: string): Promise<Event[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM events WHERE bonsai_id = ? AND deleted_at IS NULL ORDER BY occurred_at_utc DESC;',
    [bonsaiId],
  );
  return snakeToCamelRows<Event>(rows);
}

/**
 * 全盆栽の水やり events (status='logged') を取得 (F-04 stats タブ集約モード用)。
 *
 * - bonsaiId フィルタなし (全 active 盆栽の events を返す)
 * - type='watering' / status='logged' / deleted_at IS NULL
 * - occurred_at_utc 降順
 *
 * Related: Issue #29 / ADR-0013 §K2 (stats タブ全盆栽集約)
 */
export async function getAllActiveWateringEventsLogged(): Promise<Event[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM events WHERE type = 'watering' AND status = 'logged' AND deleted_at IS NULL ORDER BY occurred_at_utc DESC;",
  );
  return snakeToCamelRows<Event>(rows);
}

/**
 * ADR-0020 Phase 5: 予定タブ Calendar 用、全盆栽の planned + logged events を取得。
 *
 * - bonsaiId フィルタなし (全盆栽)
 * - status IN ('planned', 'logged') (cancelled / deleted は除外)
 * - occurred_at_utc 昇順 (古い → 新しい、Calendar の dot 配置に都合が良い)
 */
export async function getAllActivePlannedAndLoggedEvents(): Promise<Event[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM events WHERE status IN ('planned', 'logged') AND deleted_at IS NULL ORDER BY occurred_at_utc ASC;",
  );
  return snakeToCamelRows<Event>(rows);
}

/**
 * ゴミ箱 (deleted_at NOT NULL) を deleted_at 降順で取得。
 */
export async function getTrashedEvents(bonsaiId?: string): Promise<Event[]> {
  const db = await getDb();
  if (bonsaiId) {
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM events WHERE bonsai_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC;',
      [bonsaiId],
    );
    return snakeToCamelRows<Event>(rows);
  }
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM events WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC;',
  );
  return snakeToCamelRows<Event>(rows);
}

/**
 * status 別取得 (タイムライン UI、F-04 ヒートマップ集計用)。
 */
export async function getEventsByStatus(bonsaiId: string, status: EventStatus): Promise<Event[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM events WHERE bonsai_id = ? AND status = ? AND deleted_at IS NULL ORDER BY occurred_at_utc DESC;',
    [bonsaiId, status],
  );
  return snakeToCamelRows<Event>(rows);
}

/**
 * type 別取得 (例: F-04 水やりヒートマップ用 = type='watering' AND status='logged')。
 */
export async function getEventsByType(
  bonsaiId: string,
  type: EventType,
  options?: { status?: EventStatus },
): Promise<Event[]> {
  const db = await getDb();
  if (options?.status) {
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM events WHERE bonsai_id = ? AND type = ? AND status = ? AND deleted_at IS NULL ORDER BY occurred_at_utc DESC;',
      [bonsaiId, type, options.status],
    );
    return snakeToCamelRows<Event>(rows);
  }
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM events WHERE bonsai_id = ? AND type = ? AND deleted_at IS NULL ORDER BY occurred_at_utc DESC;',
    [bonsaiId, type],
  );
  return snakeToCamelRows<Event>(rows);
}

// ---------------------------------------------------------------------------
// 更新
// ---------------------------------------------------------------------------

export async function updateEvent(id: string, input: UpdateEventInput): Promise<void> {
  const db = await getDb();
  const event = await getEventById(id);
  if (!event) throw new Error(`Event not found: ${id}`);

  const now = nowUtc() as string;
  const fields: string[] = ['updated_at = ?'];
  const values: (string | number | null)[] = [now];

  if (input.status !== undefined) {
    fields.push('status = ?');
    values.push(input.status);
  }
  if (input.occurredAtUtc !== undefined) {
    fields.push('occurred_at_utc = ?');
    values.push(input.occurredAtUtc);
  }
  if (input.durationMin !== undefined) {
    fields.push('duration_min = ?');
    values.push(input.durationMin);
  }
  if (input.payload !== undefined) {
    const payloadJson = serializeEventPayload(event.type, input.payload);
    fields.push('payload_json = ?');
    values.push(payloadJson);
  }
  if (input.note !== undefined) {
    fields.push('note = ?');
    values.push(input.note);
  }

  values.push(id);
  await db.runAsync(`UPDATE events SET ${fields.join(', ')} WHERE id = ?;`, values);

  // FTS5 同期 (note or payload 変化時)
  if (input.note !== undefined || input.payload !== undefined) {
    await db.runAsync('DELETE FROM events_fts WHERE event_id = ?;', [id]);
    const updated = await getEventById(id);
    if (updated && updated.deletedAt === null) {
      await db.runAsync(
        'INSERT INTO events_fts (event_id, bonsai_id, note, payload_text) VALUES (?, ?, ?, ?);',
        [updated.id, updated.bonsaiId, updated.note ?? '', updated.payloadJson ?? ''],
      );
    }
  }
}

/**
 * status 遷移ヘルパー (タイムライン UI 用)。
 * - planned → logged: occurred_at を now に更新
 * - planned → cancelled: occurred_at は変更なし
 */
export async function markEventLogged(id: string): Promise<void> {
  const now = nowUtc() as string;
  await updateEvent(id, { status: 'logged', occurredAtUtc: now });
}

export async function markEventCancelled(id: string): Promise<void> {
  await updateEvent(id, { status: 'cancelled' });
}

// ---------------------------------------------------------------------------
// 30 日ゴミ箱 (Issue #17 AC4)
// ---------------------------------------------------------------------------

/**
 * 論理削除 (deleted_at セット)。FTS5 から除外。
 */
export async function softDeleteEvent(id: string): Promise<void> {
  const db = await getDb();
  const now = nowUtc() as string;
  await db.runAsync('UPDATE events SET deleted_at = ?, updated_at = ? WHERE id = ?;', [
    now,
    now,
    id,
  ]);
  // FTS5 から削除 (再表示時の検索ノイズ防止)
  await db.runAsync('DELETE FROM events_fts WHERE event_id = ?;', [id]);
}

/**
 * ゴミ箱から復元 (deleted_at NULL に戻す)。FTS5 に再 INSERT。
 */
export async function restoreEvent(id: string): Promise<void> {
  const db = await getDb();
  const now = nowUtc() as string;
  await db.runAsync('UPDATE events SET deleted_at = NULL, updated_at = ? WHERE id = ?;', [now, id]);
  const event = await getEventById(id);
  if (event) {
    await db.runAsync(
      'INSERT INTO events_fts (event_id, bonsai_id, note, payload_text) VALUES (?, ?, ?, ?);',
      [event.id, event.bonsaiId, event.note ?? '', event.payloadJson ?? ''],
    );
  }
}

/**
 * 物理削除 (Repository 内部用、通常は purgeOldTrash 経由)。
 */
export async function deleteEventHard(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM events_fts WHERE event_id = ?;', [id]);
  await db.runAsync('DELETE FROM events WHERE id = ?;', [id]);
}

/**
 * 30 日経過したゴミ箱 events を物理削除 (アプリ起動時に呼出推奨)。
 * @returns 削除した件数
 */
export async function purgeOldTrash(now?: Date): Promise<number> {
  const db = await getDb();
  const baseDate = now ?? Date.now();
  const baseMs = typeof baseDate === 'number' ? baseDate : baseDate.getTime();
  const cutoffMs = baseMs - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const cutoff = new Date(cutoffMs).toISOString();

  // 対象 ID 取得 → FTS5 削除 → events 削除
  const targets = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM events WHERE deleted_at IS NOT NULL AND deleted_at <= ?;',
    [cutoff],
  );
  for (const { id } of targets) {
    await db.runAsync('DELETE FROM events_fts WHERE event_id = ?;', [id]);
    await db.runAsync('DELETE FROM events WHERE id = ?;', [id]);
  }
  return targets.length;
}

// ---------------------------------------------------------------------------
// Sess19-3 (user 真意「F-05 不要」): countSameDayPlannedOrLoggedEvents 関数削除済。
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// FTS5 検索 (Issue #17 AC6、F-09 検索の核)
// ---------------------------------------------------------------------------

/**
 * FTS5 で events を検索。3 文字以上推奨 (trigram の特性)。
 * 1〜2 文字検索は PR-D で `fts5vocab + LIKE` フォールバックを実装予定。
 */
export async function searchEvents(query: string, bonsaiId?: string): Promise<Event[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const db = await getDb();
  // FTS5 MATCH で event_id を取得 → events から本体取得 (deleted_at IS NULL のみ)
  const ids = bonsaiId
    ? await db.getAllAsync<{ event_id: string }>(
        'SELECT event_id FROM events_fts WHERE events_fts MATCH ? AND bonsai_id = ?;',
        [trimmed, bonsaiId],
      )
    : await db.getAllAsync<{ event_id: string }>(
        'SELECT event_id FROM events_fts WHERE events_fts MATCH ?;',
        [trimmed],
      );

  if (ids.length === 0) return [];

  const idList = ids.map((r) => r.event_id);
  const placeholders = idList.map(() => '?').join(',');
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM events WHERE id IN (${placeholders}) AND deleted_at IS NULL ORDER BY occurred_at_utc DESC;`,
    idList,
  );
  return snakeToCamelRows<Event>(rows);
}

/** {@link searchEventsWithSnippet} の戻り値: Event + マッチ箇所の前後抜粋 (snippet) + 盆栽名。 */
export type EventWithSnippet = Event & { snippet: string | null; bonsaiName: string };

/**
 * Sess9 PR-1 (ADR-0008 §Notes Amended 2026-05-18): bonsai_tags 経路でタグ AND フィルタした events を返す。
 *
 * セマンティクス: 「指定タグ全部が付いている **盆栽** の active events を返す」。
 *
 * 旧 searchEventsByTags() (event_tags JOIN) は dead code につき廃止。タグは
 * BonsaiBasicForm 経由で bonsai_tags にしか attach されないため、本関数で
 * 「タグ付き盆栽の events」 を返すのが探す画面 (look-back/search) の実用的セマンティクス。
 *
 * - tagIds 全てを持つ盆栽の event のみ抽出 (COUNT(DISTINCT bt.tag_id) = N)
 * - e.deleted_at IS NULL かつ b.archived_at IS NULL
 * - tagIds が空の場合は [] を返す
 */
export async function searchEventsByBonsaiTags(
  tagIds: readonly string[],
): Promise<(Event & { bonsaiName: string })[]> {
  if (tagIds.length === 0) return [];
  const db = await getDb();
  const placeholders = tagIds.map(() => '?').join(',');
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT e.*, b.name AS bonsai_name FROM events e
     INNER JOIN bonsai b ON b.id = e.bonsai_id
     INNER JOIN bonsai_tags bt ON bt.bonsai_id = b.id
     WHERE bt.tag_id IN (${placeholders})
       AND e.deleted_at IS NULL
       AND b.archived_at IS NULL
     GROUP BY e.id
     HAVING COUNT(DISTINCT bt.tag_id) = ?
     ORDER BY e.occurred_at_utc DESC;`,
    [...tagIds, tagIds.length],
  );
  return snakeToCamelRows<Event & { bonsaiName: string }>(rows);
}

/**
 * Issue #31 AC2: FTS5 `snippet()` でマッチ箇所の前後 8 トークンを抜粋して返す。
 *
 * - delimiter は `«` `»` (HTML タグでなく React Native で安全に表示可能)
 * - column 0 = note 列のみ snippet 対象
 * - SO1 ソート: bm25 ASC (低い = 関連度高) → 同 score 時 occurred_at_utc DESC
 * - events 本体取得後、event_id でマッチさせて snippet + rank を merge し JS 側で手動ソート
 */
export async function searchEventsWithSnippet(
  query: string,
  bonsaiId?: string,
): Promise<EventWithSnippet[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const db = await getDb();
  // bm25(events_fts) は MATCH 行に対して関連度スコアを返す (FTS5 §5.1.1)。
  // 値が小さいほど関連度高 (Boltor の標準)。同 score 時の tiebreaker は本体取得後の JS 側で実施。
  const rows = bonsaiId
    ? await db.getAllAsync<{ event_id: string; snippet: string; rank: number }>(
        "SELECT event_id, snippet(events_fts, 0, '«', '»', '...', 8) AS snippet, bm25(events_fts) AS rank FROM events_fts WHERE events_fts MATCH ? AND bonsai_id = ?;",
        [trimmed, bonsaiId],
      )
    : await db.getAllAsync<{ event_id: string; snippet: string; rank: number }>(
        "SELECT event_id, snippet(events_fts, 0, '«', '»', '...', 8) AS snippet, bm25(events_fts) AS rank FROM events_fts WHERE events_fts MATCH ?;",
        [trimmed],
      );

  if (rows.length === 0) return [];

  const snippetMap = new Map(rows.map((r) => [r.event_id, r.snippet]));
  const rankMap = new Map(rows.map((r) => [r.event_id, r.rank]));
  const idList = rows.map((r) => r.event_id);
  const placeholders = idList.map(() => '?').join(',');
  const eventRows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT e.*, b.name AS bonsai_name FROM events e
     JOIN bonsai b ON b.id = e.bonsai_id
     WHERE e.id IN (${placeholders}) AND e.deleted_at IS NULL;`,
    idList,
  );
  const events = snakeToCamelRows<Event & { bonsaiName: string }>(eventRows);
  return events
    .map((ev) => ({ ...ev, snippet: snippetMap.get(ev.id) ?? null }))
    .sort((a, b) => {
      // bm25 ASC (関連度高い順)、同 score 時 occurred_at_utc DESC (新しい順)
      const ra = rankMap.get(a.id) ?? 0;
      const rb = rankMap.get(b.id) ?? 0;
      if (ra !== rb) return ra - rb;
      return a.occurredAtUtc < b.occurredAtUtc ? 1 : -1;
    });
}

// ---------------------------------------------------------------------------
// 一括予定追加 (ADR-0020 §画面マップ row 5、mockup v1.0 02-Home.html bulkSchedWork + bulkSchedDate)
// ---------------------------------------------------------------------------

export type BulkScheduleInput = {
  /** 対象盆栽 ID 配列 (重複なし、selectMode で選択された)。 */
  bonsaiIds: readonly string[];
  /** 全盆栽に共通の作業種別。 */
  type: EventType;
  /** 全盆栽に共通の予定日時 (UTC ISO 8601)。 */
  occurredAtUtc: string;
};

export type BulkScheduleResult = {
  /** 作成成功した event 配列。 */
  created: Event[];
  /** 作成失敗した bonsaiId 配列 (個別エラーで他は continue)。 */
  failed: string[];
};

/**
 * 一括予定追加: 複数の盆栽に同じ EventType / 日付の planned event を作成。
 *
 * - Promise.allSettled で各 bonsai に createEvent を並列呼び出し (個別 transaction)
 * - 1 件失敗しても他は continue (failed 配列に bonsaiId を返す)
 * - payload は空 `{}` (Valibot 全 EventType で optional のみのため通る、payloadValidator.ts 参照)
 * - status='planned' で scheduled event として作成
 *
 * 注: 通知 (scheduled notification) は本 helper のスコープ外。 別途 notification scheduler で配線予定。
 *
 * Caller (Sess12 時点では未配線、 PR-B+C で予定タブ FAB flow に配線):
 * - PlanScreen FAB → useBulkActionFlow → BonsaiMultiSelect → BulkWorkPicker → 本 helper
 *
 * Related:
 * - ADR-0025 §Notes Amended (案 B FAB flow、 BulkScheduleDate 廃止後の新経路)
 * - ADR-0020 §Notes §画面マップ row 5
 * - ADR-0011 (記録のみ哲学整合、 通知デフォルト OFF)
 */
export async function bulkScheduleEvents(input: BulkScheduleInput): Promise<BulkScheduleResult> {
  const results = await Promise.allSettled(
    input.bonsaiIds.map((bonsaiId) =>
      createEvent({
        bonsaiId,
        type: input.type,
        status: 'planned',
        occurredAtUtc: input.occurredAtUtc,
        payload: {},
      }),
    ),
  );
  const created: Event[] = [];
  const failed: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') created.push(r.value);
    else failed.push(input.bonsaiIds[i] as string);
  });
  return { created, failed };
}

// ---------------------------------------------------------------------------
// 一括記録 (Issue #343、ADR-0020 §画面マップ row 5、mockup v1.0 02-Home.html SelectionToolbar「一括記録」)
// ---------------------------------------------------------------------------

export type BulkLogInput = {
  /** 対象盆栽 ID 配列 (重複なし、selectMode で選択された)。 */
  bonsaiIds: readonly string[];
  /** 全盆栽に共通の作業種別。 */
  type: EventType;
  /** 全盆栽に共通の自由メモ (任意、null なら未記入)。 */
  note: string | null;
  /** Sess16 PR-B2: user 入力の日付 (ISO UTC、 任意)。 未指定なら createEvent default = nowUtc。 */
  occurredAtUtc?: string;
  /**
   * Sess17 PR-H1 (ADR-0029 D5): 全盆栽に共通適用する 14 種別固有 payload (任意)。
   * 未指定 (default {}) なら旧 Bulk 動線 (note のみ) 互換維持。
   * Valibot strict ではないため追加 prop は warning なく通過 (ADR-0028)。
   * events.payload は JSON、 schema 変更不要 (events.type CHECK 制約なし)。
   */
  payload?: Record<string, unknown>;
};

export type BulkLogResult = {
  /** 作成成功した event 配列。 */
  created: Event[];
  /** 作成失敗した bonsaiId 配列 (個別エラーで他は continue)。 */
  failed: string[];
};

/**
 * 一括記録: 複数の盆栽に同じ EventType / 共通 note の logged event を作成。
 *
 * - Promise.allSettled で各 bonsai に createEvent を並列呼び出し
 * - 1 件失敗しても他は continue (failed 配列に bonsaiId を返す)
 * - payload は空 `{}` (Valibot 全 EventType で optional のみ、payloadValidator.ts 参照)
 * - status='logged' (occurredAtUtc は createEvent 内部で now を設定)
 *
 * 注: 種別固有 payload (例: watering の amount、pruning の parts) は本 helper のスコープ外。
 *     親 (HomeScreen) で UI 簡略化のため共通 note のみ受け取り、種別固有入力は単独記録経由
 *     (mockup v1.0 BulkLogConfirmSheet の simplified 版、ADR-0011 整合)。
 *
 * Related:
 * - ADR-0020 §Notes §画面マップ row 5 (HomeScreen 一括記録)
 * - mockup v1.0 02-Home.html SelectionToolbar「一括記録」ボタン
 * - Issue #343 (G9 サイクル PR 1)
 */
export async function bulkLogEvents(input: BulkLogInput): Promise<BulkLogResult> {
  // Sess17 PR-H1 (ADR-0029 D5): payload 未指定なら旧 Bulk 動線 (note のみ) 互換、
  // 指定時は 14 種別固有 payload を全選択盆栽に同じ内容で適用。
  const payload = input.payload ?? {};
  const results = await Promise.allSettled(
    input.bonsaiIds.map((bonsaiId) =>
      createEvent({
        bonsaiId,
        type: input.type,
        status: 'logged',
        payload,
        note: input.note,
        // Sess16 PR-B2: user 入力日付を伝搬 (未指定なら createEvent default = nowUtc)
        ...(input.occurredAtUtc ? { occurredAtUtc: input.occurredAtUtc } : {}),
      }),
    ),
  );
  const created: Event[] = [];
  const failed: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') created.push(r.value);
    else failed.push(input.bonsaiIds[i] as string);
  });
  return { created, failed };
}

// ---------------------------------------------------------------------------
// 予定→記録 atomic 変換 (Sess23 ADR-0035 D7、 R-43 整合)
// ---------------------------------------------------------------------------

export type ConvertPlannedToRecordedInput = {
  plannedEventId: string;
  recordPayload: Omit<CreateEventInput, 'status'>;
};

/**
 * 予定 event を記録 event に atomic 変換 (Sess23 ADR-0035 D7)。
 *
 * 単一 `db.withTransactionAsync` で UPDATE deleted_at + DELETE events_fts + INSERT events +
 * INSERT events_fts を atomic 実行 (R-43 整合)。 該当 planned 不在 (UPDATE 0 行) なら
 * throw + rollback で「予定 0 件 + 記録 1 件」 中途半端状態を構造禁止。
 */
export async function convertPlannedToRecorded(
  input: ConvertPlannedToRecordedInput,
): Promise<Event> {
  validateEventPayload(input.recordPayload.type, input.recordPayload.payload ?? {});
  const payloadJson = serializeEventPayload(
    input.recordPayload.type,
    input.recordPayload.payload ?? {},
  );

  const db = await getDb();
  const now = nowUtc() as string;
  const id = ulid();
  const occurredAt = input.recordPayload.occurredAtUtc ?? now;
  const tzOffset = getTzOffsetMin();
  const tzIana = getTzIana();
  const bonsaiId = input.recordPayload.bonsaiId;
  const type = input.recordPayload.type;
  const durationMin = input.recordPayload.durationMin ?? null;
  const note = input.recordPayload.note ?? null;

  await db.withTransactionAsync(async () => {
    const updateResult = await db.runAsync(
      'UPDATE events SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL;',
      [now, now, input.plannedEventId],
    );
    if (updateResult.changes === 0) {
      throw new Error(
        `convertPlannedToRecorded: plannedEventId ${input.plannedEventId} not found or already deleted`,
      );
    }
    await db.runAsync('DELETE FROM events_fts WHERE event_id = ?;', [input.plannedEventId]);
    await db.runAsync(
      `INSERT INTO events
         (id, bonsai_id, type, status, occurred_at_utc, tz_offset_min, tz_iana, duration_min, payload_json, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        bonsaiId,
        type,
        'logged',
        occurredAt,
        tzOffset as number,
        tzIana as string,
        durationMin,
        payloadJson,
        note,
        now,
        now,
      ],
    );
    await db.runAsync(
      'INSERT INTO events_fts (event_id, bonsai_id, note, payload_text) VALUES (?, ?, ?, ?);',
      [id, bonsaiId, note ?? '', payloadJson ?? ''],
    );
  });

  return {
    id,
    bonsaiId,
    type,
    status: 'logged',
    occurredAtUtc: occurredAt,
    tzOffsetMin: tzOffset as number,
    tzIana: tzIana as string,
    durationMin,
    payloadJson,
    note,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export type BulkConvertResult = {
  converted: Event[];
  failed: { plannedEventId: string; error: unknown }[];
};

/**
 * 複数 planned event を atomic 変換 (Sess23 ADR-0035 D7)。
 * **sequential await 必須** (Promise.all 不可、 SQLite ロック競合回避)。
 */
export async function bulkConvertPlannedToRecorded(
  inputs: readonly ConvertPlannedToRecordedInput[],
): Promise<BulkConvertResult> {
  const converted: Event[] = [];
  const failed: { plannedEventId: string; error: unknown }[] = [];
  for (const input of inputs) {
    try {
      const created = await convertPlannedToRecorded(input);
      converted.push(created);
    } catch (error) {
      failed.push({ plannedEventId: input.plannedEventId, error });
    }
  }
  return { converted, failed };
}

/**
 * 同日 + 同 bonsaiId + 同 type の planned event を検索 (Sess23 ADR-0035 D7/D8 場面 B 用)。
 * @param dateKey YYYY-MM-DD (UTC date 部、 呼出側で TZ 補正済前提)
 */
export async function findPlannedEventByCondition(
  dateKey: string,
  bonsaiId: string,
  type: EventType,
): Promise<Event | null> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM events
       WHERE bonsai_id = ? AND type = ? AND status = ? AND deleted_at IS NULL
       ORDER BY occurred_at_utc DESC;`,
    [bonsaiId, type, 'planned'],
  );
  for (const row of rows) {
    const ev = snakeToCamelRow<Event>(row);
    if (!ev) continue;
    const evDateKey = ev.occurredAtUtc.slice(0, 10);
    if (evDateKey === dateKey) {
      return ev;
    }
  }
  return null;
}

/**
 * 複数 event を atomic 一括 softDelete (Sess25 ADR-0036 D5/D8、 R-43 整合)。
 *
 * 用途: PlanScreen group 行 削除 + bonsai-detail 履歴一括削除 + Undo Snackbar 復元 sequence。
 *
 * R-43 atomic transaction 保証: 1 件でも UPDATE が失敗 (該当 ID 不在 etc.) すれば throw + rollback、
 * 部分削除 = データ整合崩れ防止。
 *
 * wiring cascade (ADR-0036 D8): unwiring「event」 は独立 record 不在 (wiring payload 内
 * scheduled_unwire_at で予定日のみ保持)、 通知 cancel は呼出側で `cancelForEvents(eventIds, t)`
 * を sequential 実行で SUMMARY 再計算 → wiring 削除に伴う unwiring scheduled 通知も自動除外 = cascade 完了。
 *
 * @returns deletedCount = 削除成功件数 (input.length と必ず一致、 不一致は throw)
 * @throws Error 該当 ID 不在 / 既削除済 で UPDATE getChanges === 0 の場合、 transaction rollback
 */
export async function bulkSoftDeleteEvents(eventIds: readonly string[]): Promise<number> {
  if (eventIds.length === 0) return 0;
  const db = await getDb();
  const now = nowUtc() as string;
  let totalChanges = 0;

  await db.withTransactionAsync(async () => {
    for (const id of eventIds) {
      const result = await db.runAsync(
        'UPDATE events SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL;',
        [now, now, id],
      );
      if (result.changes === 0) {
        throw new Error(
          `bulkSoftDeleteEvents: event ${id} not found or already deleted (transaction rolled back)`,
        );
      }
      totalChanges += result.changes;
      // FTS5 から削除 (再検索ノイズ防止、 existing softDeleteEvent と同 logic)
      await db.runAsync('DELETE FROM events_fts WHERE event_id = ?;', [id]);
    }
  });

  return totalChanges;
}

/**
 * 複数 event を atomic 一括復元 (Sess25 ADR-0036 D5、 R-43 整合)。
 *
 * 用途: UndoSnackbar [元に戻す] tap で削除直後の N 件を atomic 復元、 通知 reschedule は呼出側で
 * `cancelForEvents(restoredIds, t)` sequential 実行 (SUMMARY 再計算で復元 event も自動再集計)。
 *
 * R-43 atomic: 1 件でも UPDATE が失敗 (該当 ID 不在 etc.) すれば throw + rollback。
 *
 * @returns restoredCount = 復元成功件数 (input.length と必ず一致、 不一致は throw)
 */
export async function restoreEvents(eventIds: readonly string[]): Promise<number> {
  if (eventIds.length === 0) return 0;
  const db = await getDb();
  const now = nowUtc() as string;
  let totalChanges = 0;

  await db.withTransactionAsync(async () => {
    for (const id of eventIds) {
      const result = await db.runAsync(
        'UPDATE events SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL;',
        [now, id],
      );
      if (result.changes === 0) {
        throw new Error(
          `restoreEvents: event ${id} not found or not in trash (transaction rolled back)`,
        );
      }
      totalChanges += result.changes;
      // FTS5 に再 INSERT (existing restoreEvent と同 logic)
      const event = await getEventById(id);
      if (event) {
        await db.runAsync(
          'INSERT INTO events_fts (event_id, bonsai_id, note, payload_text) VALUES (?, ?, ?, ?);',
          [event.id, event.bonsaiId, event.note ?? '', event.payloadJson ?? ''],
        );
      }
    }
  });

  return totalChanges;
}
