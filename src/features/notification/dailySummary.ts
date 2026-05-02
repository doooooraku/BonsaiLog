/**
 * 当日まとめ通知 — 純関数 (Issue #30 / ADR-0014)。
 *
 * Related:
 * - ADR-0014 §通知の 2 系統 / §通知数の上限管理 (7 日ローリング、最大 7 件)
 * - functional_spec §21.3.3 (DATE trigger 0〜7 件、aggregateByLocalDay 集計)
 * - ADR-0008 datetime ラッパー (getTzOffsetMin / getTzIana 必須使用)
 *
 * 設計方針:
 * - expo-notifications API に依存しない (副作用ゼロ、テスト容易)
 * - events から「ローカル日付別件数」を集計する純関数 + DATE trigger 仕様生成
 * - identifier prefix `daily_summary_` を `scheduler.ts` 側でも使用 (キャンセル時の prefix マッチ)
 * - 7 日ローリング = 当日 + 6 日先 (ADR-0014 §通知数の上限管理)
 *
 * TZ 取扱 (lessons/db.md / ADR-0008 §TZ 3 層防御):
 * - 「ローカル日付」キー = `floor((utcMs + offsetMin*60_000) / 86_400_000)` で算出
 * - aggregateByLocalDay は tz_offset_min を引数で受け取り、内部で `new Date()` を使わない
 * - `buildSummaryFireDate` は (year, month, day, hour, minute, tzOffsetMin) → UTC Date を返す
 *   (Date オブジェクトは UTC ms を保持するので tz オフセットを明示的に減算する)
 */

/** 当日まとめ通知の予約日数 (ADR-0014 §通知数の上限管理、7 日 = 当日 + 6 日先)。 */
export const SUMMARY_ROLLING_DAYS = 7;

/** 当日まとめ通知識別子の prefix (scheduler.ts のキャンセル prefix マッチでも使用)。 */
export const SUMMARY_IDENTIFIER_PREFIX = 'daily_summary_';

/** events 集計入力 (status='planned' のみが対象、cancelled / deleted_at は呼出側で除外)。 */
export type PlannedEventLike = {
  /** UTC ISO 8601 (例: '2026-05-02T01:30:00.000Z')。 */
  occurredAtUtc: string;
  /**
   * 当該 event 登録時の TZ オフセット (分、JST=+540)。
   * ADR-0008 で events.tz_offset_min に保存済み。
   */
  tzOffsetMin: number;
};

/** 集計結果: ローカル日付キー (YYYY-MM-DD) → 件数。 */
export type SummaryByDate = Record<string, number>;

export type SummaryScheduleSpec = {
  identifier: string;
  /** ローカル日付キー (YYYY-MM-DD)。 */
  dateKey: string;
  /** 件数 (>=1)。 */
  count: number;
  /** scheduler が `trigger.date` に渡す UTC Date (= ローカル日 hh:mm を UTC に変換)。 */
  fireDate: Date;
};

// ---------------------------------------------------------------------------
// ローカル日付計算 (TZ 安全)
// ---------------------------------------------------------------------------

/**
 * UTC ms と TZ オフセット (分) からローカル日付キー "YYYY-MM-DD" を返す。
 *
 * 計算式: localMs = utcMs + offsetMin * 60_000
 *         dayMs   = floor(localMs / 86_400_000) * 86_400_000
 *         "YYYY-MM-DD" = new Date(dayMs).toISOString().slice(0, 10)
 *
 * ADR-0008 datetime ラッパーの `formatLocal` は date-fns-tz 依存で重いため、
 * 集計用途ではこの軽量関数を使用する (純関数、依存ゼロ)。
 */
export function localDateKeyFromUtc(occurredAtUtcIso: string, tzOffsetMin: number): string {
  const utcMs = Date.parse(occurredAtUtcIso);
  if (!Number.isFinite(utcMs)) return '';
  const localMs = utcMs + tzOffsetMin * 60_000;
  const dayMs = Math.floor(localMs / 86_400_000) * 86_400_000;
  // dayMs を ISO 化すると「ローカル日 0:00 を UTC として表現した文字列」が出る
  return new Date(dayMs).toISOString().slice(0, 10);
}

/**
 * "YYYY-MM-DD" 文字列を年月日コンポーネントに分解する。形式不正なら null。
 */
export function parseLocalDateKey(
  dateKey: string,
): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return null;
  const year = Number.parseInt(m[1], 10);
  const month = Number.parseInt(m[2], 10); // 1-12
  const day = Number.parseInt(m[3], 10); // 1-31
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  return { year, month, day };
}

/**
 * (ローカル年月日, ローカル時刻 hh:mm, TZ オフセット) → 通知発火 UTC Date。
 *
 * 計算: ローカル時刻を UTC として作成し、tzOffsetMin 分を減算 → 真の UTC ms。
 *
 * @example
 *   buildSummaryFireDate({ year: 2026, month: 5, day: 2 }, 7, 0, 540).toISOString()
 *     === '2026-05-01T22:00:00.000Z'  // JST 2026-05-02 07:00 = UTC 2026-05-01 22:00
 */
export function buildSummaryFireDate(
  localDate: { year: number; month: number; day: number },
  hour: number,
  minute: number,
  tzOffsetMin: number,
): Date {
  // Date.UTC(year, month0, day, hour, minute) はローカル時刻成分をそのまま UTC として解釈する。
  // tzOffsetMin (例: JST=+540) を分単位で差し引けば実際の UTC ms。
  const asUtcMs = Date.UTC(localDate.year, localDate.month - 1, localDate.day, hour, minute, 0, 0);
  return new Date(asUtcMs - tzOffsetMin * 60_000);
}

/** "YYYY-MM-DD" を 1 日加算する純関数 (タイムゾーン非依存、UTC 12:00 を基準に踏み外し回避)。 */
export function addLocalDay(dateKey: string, deltaDays: number): string {
  const parsed = parseLocalDateKey(dateKey);
  if (!parsed) return '';
  // 1 日の真ん中 (12:00 UTC) を基準に進めると DST 跨ぎでも安全
  const baseMs = Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12, 0, 0, 0);
  const next = new Date(baseMs + deltaDays * 86_400_000);
  const yyyy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(next.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// 集計 (純関数)
// ---------------------------------------------------------------------------

/**
 * planned events をローカル日付キーで集計する純関数。
 *
 * - 入力 events は呼出側で `status='planned' AND deleted_at IS NULL` 済みである前提
 * - 各 event の tzOffsetMin (events 行の値) を使ってローカル日を決定する
 * - 戻り値は `{ "YYYY-MM-DD": count }` の dict
 */
export function aggregateByLocalDay(events: readonly PlannedEventLike[]): SummaryByDate {
  const byDate: SummaryByDate = {};
  for (const event of events) {
    const key = localDateKeyFromUtc(event.occurredAtUtc, event.tzOffsetMin);
    if (!key) continue;
    byDate[key] = (byDate[key] ?? 0) + 1;
  }
  return byDate;
}

// ---------------------------------------------------------------------------
// 仕様生成 (純関数、scheduler に渡す)
// ---------------------------------------------------------------------------

/**
 * 集計結果 + 通知時刻 + ローリング期間から、scheduler が予約する DATE trigger 仕様を返す。
 *
 * - 当日 (todayKey) から ROLLING_DAYS 日先まで (= 当日 + 6 日先) のみ採用
 * - 件数 0 の日は通知不要 (ADR-0014 §21.3.3、当日まとめ 0 件はキャンセル)
 * - 通知発火日時が現在時刻より過去ならスキップ (DATE trigger は過去拒否)
 *
 * @param byDate         aggregateByLocalDay の戻り値
 * @param todayKey       端末ローカル "YYYY-MM-DD" (ADR-0008 datetime ラッパー由来)
 * @param hour           通知時刻 (時)
 * @param minute         通知時刻 (分)
 * @param tzOffsetMin    現在の TZ オフセット (分、JST=+540)
 * @param nowMs          現在の UTC ms (テスト容易性のため引数化、production は Date.now())
 * @param rollingDays    ローリング日数 (default = SUMMARY_ROLLING_DAYS)
 */
export function buildSummarySchedules(
  byDate: SummaryByDate,
  todayKey: string,
  hour: number,
  minute: number,
  tzOffsetMin: number,
  nowMs: number,
  rollingDays: number = SUMMARY_ROLLING_DAYS,
): SummaryScheduleSpec[] {
  const result: SummaryScheduleSpec[] = [];
  for (let i = 0; i < rollingDays; i += 1) {
    const dateKey = addLocalDay(todayKey, i);
    if (!dateKey) continue;
    const count = byDate[dateKey] ?? 0;
    if (count <= 0) continue;
    const parsed = parseLocalDateKey(dateKey);
    if (!parsed) continue;
    const fireDate = buildSummaryFireDate(parsed, hour, minute, tzOffsetMin);
    if (fireDate.getTime() <= nowMs) continue; // 過去 / 現在ちょうどは予約しない
    result.push({
      identifier: `${SUMMARY_IDENTIFIER_PREFIX}${dateKey}`,
      dateKey,
      count,
      fireDate,
    });
  }
  return result;
}
