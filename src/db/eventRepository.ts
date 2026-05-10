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

/** F-05 気遣い型ポップアップの発火閾値 (Issue #25、ADR-0011)。5 件超 = 6 件目で発火。 */
export const EVENT_OVERLOAD_THRESHOLD = 5;

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
// F-05 気遣い型ポップアップ用件数カウント (Issue #25、ADR-0011)
// ---------------------------------------------------------------------------

/**
 * 指定 UTC タイムスタンプと**同じローカル日**に存在する planned / logged events の件数を返す。
 *
 * F-05 「気遣い型」予定確認ポップアップ (ADR-0011) の発火判定に使用:
 * - 同じローカル日に既に 5 件以上ある状態で 6 件目を登録するとポップアップ発火
 * - bonsaiId 指定なし (ユーザーの 1 日全体の予定 + 実績で判定)
 * - cancelled は対象外 (取消済は無視)
 * - deleted_at IS NULL のみ対象 (ゴミ箱は対象外)
 *
 * TZ 取扱 (lessons/db.md / ADR-0008 §TZ 3 層防御):
 * - tzOffsetMin: 引数 occurredAtUtc を含む「現地日付」を決めるオフセット (分)。
 *   未指定時は端末の現在 TZ (`getTzOffsetMin()`)、JST=+540 / PST=-480。
 * - 「同じローカル日」 = `floor((utcMs + offsetMin*60_000) / 86_400_000)` が同じ値
 * - SQL では `CAST((strftime('%s', occurred_at_utc)/60 + ?) / 1440 AS INTEGER)` で日キーを算出
 *
 * @param occurredAtUtc - 判定対象の UTC ISO 8601 タイムスタンプ
 * @param options.tzOffsetMin - 現地日を決めるオフセット (分)、省略時は端末 TZ
 * @returns その日の planned + logged の件数 (deleted_at 除外、cancelled 除外)
 */
export async function countSameDayPlannedOrLoggedEvents(
  occurredAtUtc: string,
  options?: { tzOffsetMin?: number },
): Promise<number> {
  const tzOffset = options?.tzOffsetMin ?? (getTzOffsetMin() as number);
  // strftime('%s', ...) は秒、/60 で分に揃える。+ tzOffset で local 分、/1440 で local 日キー。
  // 1440 = 60 * 24 (1 日 = 1440 分)
  const db = await getDb();
  const result = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM events
       WHERE deleted_at IS NULL
         AND status IN ('planned', 'logged')
         AND CAST((strftime('%s', occurred_at_utc) / 60 + ?) / 1440 AS INTEGER)
           = CAST((strftime('%s', ?) / 60 + ?) / 1440 AS INTEGER);`,
    [tzOffset, occurredAtUtc, tzOffset],
  );
  return result?.cnt ?? 0;
}

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

/** {@link searchEventsWithSnippet} の戻り値: Event + マッチ箇所の前後抜粋 (snippet)。 */
export type EventWithSnippet = Event & { snippet: string | null };

/**
 * Issue #31 AC3 (Y7): event_tags M:N で AND フィルタした events を返す。
 *
 * - tagIds 全てを持つ event のみ抽出 (COUNT(DISTINCT tag_id) = N)
 * - deleted_at IS NULL のみ
 * - tagIds が空の場合は [] を返す
 */
export async function searchEventsByTags(tagIds: readonly string[]): Promise<Event[]> {
  if (tagIds.length === 0) return [];
  const db = await getDb();
  const placeholders = tagIds.map(() => '?').join(',');
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT e.* FROM events e
     INNER JOIN event_tags et ON et.event_id = e.id
     WHERE et.tag_id IN (${placeholders}) AND e.deleted_at IS NULL
     GROUP BY e.id
     HAVING COUNT(DISTINCT et.tag_id) = ?
     ORDER BY e.occurred_at_utc DESC;`,
    [...tagIds, tagIds.length],
  );
  return snakeToCamelRows<Event>(rows);
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
    `SELECT * FROM events WHERE id IN (${placeholders}) AND deleted_at IS NULL;`,
    idList,
  );
  const events = snakeToCamelRows<Event>(eventRows);
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
 * 注: 通知 (notify=true 時の scheduled notification) は本 helper のスコープ外。
 *     親 (HomeScreen) で notify state を保持し、別途 notification scheduler で実装予定 (Issue)。
 *
 * Related:
 * - ADR-0020 §Notes §画面マップ row 5 (HomeScreen 一括予定追加)
 * - mockup v1.0 02-Home.html `01c 一括予定・作業選択` / `01d 一括予定・日付`
 * - ADR-0011 (記録のみ哲学整合、通知デフォルト OFF)
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
  const results = await Promise.allSettled(
    input.bonsaiIds.map((bonsaiId) =>
      createEvent({
        bonsaiId,
        type: input.type,
        status: 'logged',
        payload: {},
        note: input.note,
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
