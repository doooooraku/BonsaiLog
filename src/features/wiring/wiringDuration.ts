/**
 * F-07 針金がけ記録改良 — 純関数 (Phase A、Issue #24 / ADR-0011)。
 *
 * 役割:
 * - 針金 event (`type='wiring'` + `status='logged'`) の装着期間 (日数) を算出
 * - ユーザー指定外し日時 (`payload.scheduled_unwire_at`) を取り出し
 * - 装着期間しきい値 (既定 6 週 = 42 日) からの状態種別を判定
 *
 * 設計方針:
 * - 推奨/命令文言を出さない (ADR-0011 「記録のみ」哲学)。「外しましょう」「作業してください」禁止。
 * - 事実のみ表示: 「装着期間 6 週経過しました」
 * - 純関数で IO なし、Jest で副作用なくテスト可能
 * - UI / scheduler 統合は Phase B (別 PR)
 */

import type { Event } from '@/src/db/schema';

/** 6 週 = 42 日 を既定の経過しきい値とする (ADR-0011 / Issue #24)。 */
export const DEFAULT_WIRING_OVERDUE_THRESHOLD_DAYS = 42;

/**
 * 針金 event の装着期間 (日数、UTC ベース) を算出する純関数。
 *
 * @param wiringEvent type='wiring' / status='logged' の event を想定 (呼出側でフィルタ済)
 * @param todayUtc 現在時刻 (Date オブジェクト、UI 層が `new Date(nowUtc())` で生成)
 *
 * @returns 装着開始 (occurred_at_utc) からの経過日数。
 *   - 負値は 0 にクランプ (occurred_at が未来を指す状況は理論上発生しないが防御)
 */
export function getDaysSinceWired(wiringEvent: Event, todayUtc: Date): number {
  const wiredAt = new Date(wiringEvent.occurredAtUtc).getTime();
  const now = todayUtc.getTime();
  const diffDays = Math.floor((now - wiredAt) / 86_400_000);
  return diffDays < 0 ? 0 : diffDays;
}

/** payload_json から `scheduled_unwire_at` を取り出す純関数 (parse 失敗は null)。 */
export function getScheduledUnwireAt(wiringEvent: Event): string | null {
  if (wiringEvent.payloadJson == null) return null;
  try {
    const payload = JSON.parse(wiringEvent.payloadJson) as Record<string, unknown>;
    const value = payload.scheduled_unwire_at;
    return typeof value === 'string' && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

/**
 * Sess16 PR-M (T-6、 ADR-0028 §Follow-up): wiring 旧 logged events backward-compat。
 *
 * Sess16 PR-A5 (#627) で wiring payload schema を `gauge`/`parts`/`duration` (旧) →
 * `wire_size_mm`/`body_part`/`scheduled_unwire_at` (新、 ADR-0008 整合) に変更。 旧 logged
 * events は DB 上に `payload.duration` ('8w' / '12w' 等) を持つため、 表示時に「外し予定日」
 * を導出するため `occurredAtUtc + duration weeks` で計算 fallback。
 *
 * 動作:
 * - 新 schema (`scheduled_unwire_at`) 優先、 あればそれを返却
 * - 旧 schema (`duration` 文字列、 例 '8w') あれば `occurredAtUtc + N weeks` で ISO 計算
 * - 両方なし or parse 失敗 → null
 */
export function getScheduledUnwireAtWithFallback(wiringEvent: Event): string | null {
  // 新 schema 優先
  const newField = getScheduledUnwireAt(wiringEvent);
  if (newField) return newField;

  // 旧 schema fallback (Sess16 PR-A5 以前の logged events)
  if (wiringEvent.payloadJson == null) return null;
  try {
    const payload = JSON.parse(wiringEvent.payloadJson) as Record<string, unknown>;
    const duration = payload.duration;
    if (typeof duration !== 'string') return null;
    const match = duration.match(/^(\d+)w$/);
    if (!match) return null;
    const weeks = parseInt(match[1] as string, 10);
    if (!Number.isFinite(weeks) || weeks < 0) return null;
    const days = weeks * 7;
    const wiredMs = new Date(wiringEvent.occurredAtUtc).getTime();
    if (!Number.isFinite(wiredMs)) return null;
    const unwireMs = wiredMs + days * 86_400_000;
    return new Date(unwireMs).toISOString();
  } catch {
    return null;
  }
}

/** payload_json から `wire_size_mm` を「Nmm」形式で取り出す純関数 (parse 失敗 / 未指定は null)。 */
export function getWireSize(wiringEvent: Event): string | null {
  if (wiringEvent.payloadJson == null) return null;
  try {
    const payload = JSON.parse(wiringEvent.payloadJson) as Record<string, unknown>;
    const value = payload.wire_size_mm;
    return typeof value === 'number' ? `${value}mm` : null;
  } catch {
    return null;
  }
}

/** payload_json から `body_part` を取り出す純関数 (parse 失敗 / 未指定は null)。 */
export function getBodyPart(wiringEvent: Event): string | null {
  if (wiringEvent.payloadJson == null) return null;
  try {
    const payload = JSON.parse(wiringEvent.payloadJson) as Record<string, unknown>;
    const value = payload.body_part;
    return typeof value === 'string' && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

/**
 * 装着期間 vs しきい値の状態種別。UI / 通知側でこの種別を見て i18n キーを選ぶ。
 *
 * - 'within': しきい値未満 (通常状態、通知不要)
 * - 'overdue': しきい値以上 (事実通知の対象)
 */
export type WiringDurationKind = 'within' | 'overdue';

export function classifyWiringDuration(
  daysSinceWired: number,
  thresholdDays: number = DEFAULT_WIRING_OVERDUE_THRESHOLD_DAYS,
): WiringDurationKind {
  return daysSinceWired >= thresholdDays ? 'overdue' : 'within';
}

/**
 * 経過日数を「週単位 (切り捨て)」に変換する純関数。
 *
 * UI 層 (盆栽詳細画面 → 針金 event 行) で「装着期間: X 週」表示に使う。
 * Phase B (Issue #24): ADR-0014 で F-07 装着期間経過通知を削除し、アプリ内事実表示に変更したため。
 *
 * @example getWeeksSinceWired(0) === 0
 * @example getWeeksSinceWired(6) === 0  // 1 週未満
 * @example getWeeksSinceWired(7) === 1
 * @example getWeeksSinceWired(42) === 6 // しきい値ちょうど
 */
export function getWeeksSinceWired(daysSinceWired: number): number {
  if (daysSinceWired < 0) return 0;
  return Math.floor(daysSinceWired / 7);
}

/**
 * Phase D (Issue #24): 「外す予定日時」入力バリデーション (任意項目)。
 *
 * Issue #24 AC:
 * - 過去日時はバリデーション NG
 * - 不正フォーマットも NG
 * - 任意項目 (空入力は OK = null 返却)
 *
 * 5 年以上先の日付は誤入力ガードとして 'too_far_future' を返す
 * (DatePicker でローラーが大きく回って事故的に遠未来を選択するケース防止)。
 */
export type ScheduledUnwireAtError = 'invalid_format' | 'past_datetime' | 'too_far_future' | null;

const FIVE_YEARS_MS = 5 * 365 * 86_400_000;

export function validateScheduledUnwireAt(
  input: string | null | undefined,
  now: Date,
): ScheduledUnwireAtError {
  // 任意項目: 空 / null / undefined は OK (バリデーションエラーなし)
  if (input == null || (typeof input === 'string' && input.length === 0)) return null;
  if (typeof input !== 'string') return 'invalid_format';

  const parsed = new Date(input);
  const parsedMs = parsed.getTime();
  if (Number.isNaN(parsedMs)) return 'invalid_format';

  const nowMs = now.getTime();
  if (parsedMs < nowMs) return 'past_datetime';
  if (parsedMs > nowMs + FIVE_YEARS_MS) return 'too_far_future';

  return null;
}
