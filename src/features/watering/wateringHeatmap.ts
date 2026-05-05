/**
 * F-04 水やり履歴の可視化 — 純関数 (Phase A)。
 *
 * Related:
 * - Issue #29 F-04 (ADR-0013 ヒートマップ単独 + 「最後から X 日」テキスト)
 * - 連動: ADR-0008 (events STI、status='logged' のみ過去確定)
 * - ADR-0011 (記録のみ哲学、判定 / 推奨なし)
 *
 * 役割:
 * - events 配列から「最後の水やりからの経過日数」を算出する純関数。
 * - DB / FileSystem には触れない。Jest で副作用なくテストできるよう設計。
 * - Phase A は LastWateredText 用ロジックのみ。Phase B でヒートマップ集計を追加する。
 *
 * TZ 設計 (ADR-0008 §TZ 3 層防御):
 * - 入力 `events` の `occurredAtUtc` は IsoUtc 形式 (UTC、保存時の唯一の正)。
 * - 「経過日数」はユーザー体感 = ローカル日付ベースで計算する必要がある。
 * - 本関数は `todayLocalIso` (例: "2026-05-03") を引数で受け取り、
 *   イベント側もローカル日付に変換して差分を取る (UI 層が呼出時に変換)。
 * - これにより本関数自体は TZ 非依存・テスト容易。
 */

import type { Event } from '@/src/db/schema';

/**
 * UTC ISO 文字列からローカル日付キー (YYYY-MM-DD) を取り出すヘルパー。
 * tzOffsetMin = ユーザーローカルの UTC オフセット (分単位、JST=540)。
 */
export function toLocalDateKey(isoUtc: string, tzOffsetMin: number): string {
  const utcMs = new Date(isoUtc).getTime();
  const localMs = utcMs + tzOffsetMin * 60_000;
  const local = new Date(localMs);
  // toISOString は常に UTC 表現なので、ローカル時刻にオフセットを足してから
  // toISOString して "YYYY-MM-DD" 部分を取り出す技法。new Date 直接 .getFullYear()
  // 系は環境依存のため使わない。
  return local.toISOString().slice(0, 10);
}

/**
 * 2 つの YYYY-MM-DD キーから経過日数を算出 (b - a の日数差、負値もあり得る)。
 *
 * @example
 *   diffDayKeys('2026-05-01', '2026-05-03') === 2
 *   diffDayKeys('2026-05-03', '2026-05-03') === 0
 */
export function diffDayKeys(fromKey: string, toKey: string): number {
  const from = Date.UTC(
    Number(fromKey.slice(0, 4)),
    Number(fromKey.slice(5, 7)) - 1,
    Number(fromKey.slice(8, 10)),
  );
  const to = Date.UTC(
    Number(toKey.slice(0, 4)),
    Number(toKey.slice(5, 7)) - 1,
    Number(toKey.slice(8, 10)),
  );
  return Math.round((to - from) / 86_400_000);
}

/**
 * events から「最後の水やり」を 1 件抽出する純関数。
 *
 * - kind='watering' かつ status='logged' のみ対象 (planned/cancelled は除外)。
 * - deletedAt は除外 (ゴミ箱)。
 * - 同点なら occurredAtUtc が最新のものを採用。
 *
 * @returns 最後の水やり Event、なければ null。
 */
export function getLastWatering(events: readonly Event[]): Event | null {
  let last: Event | null = null;
  for (const event of events) {
    if (event.type !== 'watering') continue;
    if (event.status !== 'logged') continue;
    if (event.deletedAt != null) continue;
    if (last == null || event.occurredAtUtc > last.occurredAtUtc) {
      last = event;
    }
  }
  return last;
}

/**
 * 「最後の水やりから X 日」を算出する純関数。
 *
 * @param events 対象盆栽の events 配列 (取得側で bonsaiId フィルタ済を想定)
 * @param todayLocalKey 今日のローカル日付キー (YYYY-MM-DD、UI 層が `nowUtc + tzOffsetMin` で算出)
 * @param tzOffsetMin ユーザーローカルの UTC オフセット (分単位、JST=540)
 *
 * @returns
 *   - 水やり 0 件 → null (UI 側で「まだ記録がありません」表示)
 *   - 水やり 1 件以上 → 経過日数 (0 = 今日、1 = 昨日、...)
 *   - **負値は 0 にクランプ** (occurredAtUtc が未来を指す状況は理論上発生しないが防御)。
 */
export function getDaysSinceLastWatering(
  events: readonly Event[],
  todayLocalKey: string,
  tzOffsetMin: number,
): number | null {
  const last = getLastWatering(events);
  if (last == null) return null;
  const lastKey = toLocalDateKey(last.occurredAtUtc, tzOffsetMin);
  const diff = diffDayKeys(lastKey, todayLocalKey);
  return diff < 0 ? 0 : diff;
}

/**
 * しきい値分岐 (ADR-0013 §16) のラベル種別を返す純関数。UI 側でこの種別を見て i18n キーを選ぶ。
 *
 * - null → 'noRecord'
 * - 0 → 'today'
 * - 1 → 'oneDay'
 * - 2-30 → 'severalDays' (Bold 強調表示用)
 * - 31-365 → 'manyDays' (Regular 弱化表示用)
 * - 366+ → 'overYear'
 */
export type LastWateredKind =
  | 'noRecord'
  | 'today'
  | 'oneDay'
  | 'severalDays'
  | 'manyDays'
  | 'overYear';

export function classifyLastWatered(daysSinceLast: number | null): LastWateredKind {
  if (daysSinceLast == null) return 'noRecord';
  if (daysSinceLast === 0) return 'today';
  if (daysSinceLast === 1) return 'oneDay';
  if (daysSinceLast <= 30) return 'severalDays';
  if (daysSinceLast <= 365) return 'manyDays';
  return 'overYear';
}

/**
 * Phase B: events 配列から「日別水やり回数 (count)」マップを返す純関数。
 *
 * - kind='watering' / status='logged' / deletedAt=null のみカウント。
 * - 同日に複数回水やった場合はカウント加算 (= count >= 2)。
 * - キーは toLocalDateKey で算出した YYYY-MM-DD (ユーザー TZ ベース)。
 */
export function getDailyWateringCounts(
  events: readonly Event[],
  tzOffsetMin: number,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.type !== 'watering') continue;
    if (event.status !== 'logged') continue;
    if (event.deletedAt != null) continue;
    const key = toLocalDateKey(event.occurredAtUtc, tzOffsetMin);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Phase B: 配色レベル (L0-L3) を返す純関数 (ColorBrewer Greens 4-class、color-blind safe)。
 *
 * - 0 → 'L0' (空) / 1 → 'L1' / 2 → 'L2' / 3+ → 'L3'
 * 配色値の RGB マッピングは WateringHeatmap.tsx 側で行う。
 */
export type WateringHeatmapLevel = 'L0' | 'L1' | 'L2' | 'L3';

export function getHeatmapLevel(count: number): WateringHeatmapLevel {
  if (count <= 0) return 'L0';
  if (count === 1) return 'L1';
  if (count === 2) return 'L2';
  return 'L3';
}

/**
 * Phase B: today から 過去 N 日分の YYYY-MM-DD キー配列を返す (新しい順 = today が index 0)。
 */
export function buildHeatmapDateKeys(todayLocalKey: string, days: number): string[] {
  const keys: string[] = [];
  const todayUtc = Date.UTC(
    Number(todayLocalKey.slice(0, 4)),
    Number(todayLocalKey.slice(5, 7)) - 1,
    Number(todayLocalKey.slice(8, 10)),
  );
  for (let i = 0; i < days; i++) {
    const ms = todayUtc - i * 86_400_000;
    const d = new Date(ms);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

/**
 * Phase D-1 (AC7): events からヒートマップサマリーを算出する純関数。
 *
 * @param events 対象 events 配列 (取得側で bonsaiId / 期間フィルタ済を想定)
 * @param tzOffsetMin ユーザーローカルの UTC オフセット (分単位)
 * @param windowDays 集計対象日数 (例: 365 なら直近 1 年)、optional
 * @param todayLocalKey windowDays 指定時の起点 (YYYY-MM-DD)、optional
 *
 * @returns
 *   - recordedDays: 水やり記録があった日数 (1 日複数記録は 1 日カウント)
 *   - totalEvents: 水やり記録の総件数 (1 日複数記録は加算)
 *
 * windowDays 指定時は [todayLocalKey - (windowDays-1) ..= todayLocalKey] の範囲で集計、
 * 未指定時は全 events を対象。
 */
export type HeatmapSummary = {
  recordedDays: number;
  totalEvents: number;
};

export function buildHeatmapSummary(
  events: readonly Event[],
  tzOffsetMin: number,
  windowDays?: number,
  todayLocalKey?: string,
): HeatmapSummary {
  const days = new Set<string>();
  let total = 0;
  let windowStartKey: string | null = null;

  if (windowDays != null && todayLocalKey != null) {
    const startMs =
      Date.UTC(
        Number(todayLocalKey.slice(0, 4)),
        Number(todayLocalKey.slice(5, 7)) - 1,
        Number(todayLocalKey.slice(8, 10)),
      ) -
      (windowDays - 1) * 86_400_000;
    windowStartKey = new Date(startMs).toISOString().slice(0, 10);
  }

  for (const event of events) {
    if (event.type !== 'watering') continue;
    if (event.status !== 'logged') continue;
    if (event.deletedAt != null) continue;

    const key = toLocalDateKey(event.occurredAtUtc, tzOffsetMin);
    if (windowStartKey != null && todayLocalKey != null) {
      if (key < windowStartKey || key > todayLocalKey) continue;
    }

    days.add(key);
    total += 1;
  }

  return { recordedDays: days.size, totalEvents: total };
}

/**
 * Phase G-1 (AC2-1, AC3-2): 全盆栽集約モード用の日別「水やった盆栽の割合」純関数。
 *
 * 仕様 (ADR-0013 §K2):
 * - 各日について「水やった盆栽数 / 全盆栽数 × 100 (%)」を返す。
 * - 同日に同盆栽が複数回水やっても 1 盆栽カウント (Set ベース)。
 * - 全盆栽数 (totalBonsaiCount) は外側で渡す (アーカイブ除外済の active のみ想定)。
 * - 0 件の日はキー自体を含めない (UI 側で 0% として扱う)。
 *
 * @param events 全盆栽の events 配列 (bonsaiId フィルタなし)
 * @param totalBonsaiCount 全盆栽数 (active のみ、アーカイブ除外済)
 * @param tzOffsetMin ユーザーローカルの UTC オフセット (分単位)
 *
 * @returns Map<YYYY-MM-DD, ratioPercent>。ratioPercent は 0-100 の整数 (Math.round 済)。
 */
export function getDailyAggregateRatio(
  events: readonly Event[],
  totalBonsaiCount: number,
  tzOffsetMin: number,
): Map<string, number> {
  const result = new Map<string, number>();
  if (totalBonsaiCount <= 0) return result;

  // 日付ごとに「水やった盆栽 ID の Set」を構築。
  const wateredByDay = new Map<string, Set<string>>();
  for (const event of events) {
    if (event.type !== 'watering') continue;
    if (event.status !== 'logged') continue;
    if (event.deletedAt != null) continue;
    const key = toLocalDateKey(event.occurredAtUtc, tzOffsetMin);
    const existing = wateredByDay.get(key);
    if (existing == null) {
      wateredByDay.set(key, new Set([event.bonsaiId]));
    } else {
      existing.add(event.bonsaiId);
    }
  }

  for (const [key, bonsaiSet] of wateredByDay) {
    const ratio = Math.round((bonsaiSet.size / totalBonsaiCount) * 100);
    result.set(key, ratio);
  }
  return result;
}

/**
 * Phase G-1 (AC3-2): 集約モード用の配色レベル (L0-L3) を返す純関数。
 *
 * 仕様 (ADR-0013 §K2):
 * - 0%      → 'L0'
 * - 1-33%   → 'L1'
 * - 34-66%  → 'L2'
 * - 67-100% → 'L3'
 *
 * `getHeatmapLevel` (回数ベース、K1) と対称関係。
 */
export function getAggregateLevel(ratioPercent: number): WateringHeatmapLevel {
  if (ratioPercent <= 0) return 'L0';
  if (ratioPercent <= 33) return 'L1';
  if (ratioPercent <= 66) return 'L2';
  return 'L3';
}

/**
 * Phase D-1 (AC5): 指定日 (YYYY-MM-DD) に該当する events を返す純関数 (BottomSheet 詳細用)。
 *
 * - kind フィルタなし (watering / fertilizing / wiring 全て対象)
 * - status='logged' / deletedAt=null のみ (planned events は別途扱い)
 * - occurredAtUtc 昇順 (古い時刻が先)
 *
 * @param events 対象 events 配列 (取得側で bonsaiId フィルタ済を想定)
 * @param dateKey 対象日 (YYYY-MM-DD ローカル日付)
 * @param tzOffsetMin ユーザーローカルの UTC オフセット (分単位)
 */
export function getEventsForDay(
  events: readonly Event[],
  dateKey: string,
  tzOffsetMin: number,
): Event[] {
  const matched: Event[] = [];
  for (const event of events) {
    if (event.status !== 'logged') continue;
    if (event.deletedAt != null) continue;
    const key = toLocalDateKey(event.occurredAtUtc, tzOffsetMin);
    if (key !== dateKey) continue;
    matched.push(event);
  }
  matched.sort((a, b) => (a.occurredAtUtc < b.occurredAtUtc ? -1 : 1));
  return matched;
}

/**
 * ADR-0020 Phase 3: SS 222921 整合の水やり履歴サマリー (個別盆栽)。
 *
 * 戻り値:
 * - currentStreakDays: 「連続記録」(直近 N 日連続で水やり記録がある日数、今日が水やり済の場合のみカウント)
 * - daysWithMultipleRecords: 「2回の日」(window 内で 1 日に 2 回以上水やり記録がある日数)
 * - recordedDays / totalEvents: window 内の記録日数と総回数
 *
 * @param events 個別盆栽の events 配列 (bonsaiId フィルタ済を想定)
 * @param tzOffsetMin ユーザーローカルの UTC オフセット (分単位)
 * @param windowDays 集計期間 (例: 30 / 90 / 365)
 * @param todayLocalKey 今日のローカル日付キー (YYYY-MM-DD)
 */
export type IndividualHeatmapSummary = {
  currentStreakDays: number;
  daysWithMultipleRecords: number;
  recordedDays: number;
  totalEvents: number;
};

export function buildIndividualSummary(
  events: readonly Event[],
  tzOffsetMin: number,
  windowDays: number,
  todayLocalKey: string,
): IndividualHeatmapSummary {
  const counts = new Map<string, number>();
  let total = 0;
  const startMs =
    Date.UTC(
      Number(todayLocalKey.slice(0, 4)),
      Number(todayLocalKey.slice(5, 7)) - 1,
      Number(todayLocalKey.slice(8, 10)),
    ) -
    (windowDays - 1) * 86_400_000;
  const windowStartKey = new Date(startMs).toISOString().slice(0, 10);

  for (const event of events) {
    if (event.type !== 'watering') continue;
    if (event.status !== 'logged') continue;
    if (event.deletedAt != null) continue;
    const key = toLocalDateKey(event.occurredAtUtc, tzOffsetMin);
    if (key < windowStartKey || key > todayLocalKey) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    total += 1;
  }

  const recordedDays = counts.size;
  let daysWithMultipleRecords = 0;
  for (const c of counts.values()) {
    if (c >= 2) daysWithMultipleRecords += 1;
  }

  // currentStreakDays: 今日から遡って連続で記録がある日数
  let streak = 0;
  let cursorKey = todayLocalKey;
  while (counts.has(cursorKey)) {
    streak += 1;
    const cursorMs =
      Date.UTC(
        Number(cursorKey.slice(0, 4)),
        Number(cursorKey.slice(5, 7)) - 1,
        Number(cursorKey.slice(8, 10)),
      ) - 86_400_000;
    cursorKey = new Date(cursorMs).toISOString().slice(0, 10);
  }

  return {
    currentStreakDays: streak,
    daysWithMultipleRecords,
    recordedDays,
    totalEvents: total,
  };
}
