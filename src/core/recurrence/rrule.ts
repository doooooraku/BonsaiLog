/**
 * RRULE 展開純関数 (Sess78 PR-3、 ADR-0056 D2/D3)。
 *
 * RFC 5545 RRULE 文字列を期間内の date 配列に展開する。 `rrule` npm lib を 内部で 使用、
 * 戻り値は ADR-0008 R-55 + R-66 整合で `toLocalDateKey` で 正規化された YYYY-MM-DD 配列。
 *
 * 設計方針:
 * - **純関数** (副作用なし、 入力同じなら出力同じ)、 caller (recurrenceRuleRepository) で 現在時刻取得
 * - exdates 例外日は filter で除外 (RRULE 内 EXDATE 句は使わず、 アプリ層 list で 管理)
 * - limit hard cap (default 1000、 ADR-0056 R3 性能ガード)
 *
 * R-66 厳守:
 * - `rrule.between` 戻り値 (Date[]) を 必ず `toLocalDateKey(isoUtc, tzOffsetMin)` で 正規化
 * - `.toISOString().slice(0, 10)` 直書き禁止 (JST 早朝の「昨日」 化 罠)
 */
import { rrulestr } from 'rrule';

import type { IsoUtc } from '@/src/core/datetime/types';
// eslint-disable-next-line boundaries/dependencies -- toLocalDateKey は features/watering 由来の SoT (ADR-0008 R-55)、 Sess78 後の follow-up で core/datetime/format に移動予定
import { toLocalDateKey } from '@/src/features/watering/dateUtils';

/**
 * RRULE を期間内の date 配列に展開。
 *
 * @param rrule - RFC 5545 RRULE 文字列 (例: "FREQ=WEEKLY;BYDAY=MO")。 DTSTART は含めない (別引数)
 * @param startAtUtc - 開始 ISO UTC 日時 (DTSTART として 使用)
 * @param endAtUtc - 終了 ISO UTC 日時 (UNTIL として 使用、 caller で +365 日 default 計算)
 * @param exdates - 例外日 YYYY-MM-DD 配列 (アプリ層管理、 RRULE 内 EXDATE 句は使わない)
 * @param tzOffsetMin - TZ オフセット分 (ADR-0008 ラッパー 3 `getTzOffsetMin()` 戻り値)
 * @param limit - 最大展開件数 (default 1000、 性能ガード)
 * @returns YYYY-MM-DD 文字列配列 (重複なし、 ソート済、 exdates 除外済)
 */
export function expandRRule(
  rrule: string,
  startAtUtc: string,
  endAtUtc: string,
  exdates: readonly string[],
  tzOffsetMin: number,
  limit: number = 1000,
): string[] {
  if (limit <= 0) return [];

  const dtstart = new Date(startAtUtc);
  const until = new Date(endAtUtc);
  if (until.getTime() < dtstart.getTime()) return [];

  // rrulestr は "DTSTART:..." と "RRULE:..." の改行区切り or RRULE のみ + options.dtstart
  const rule = rrulestr(rrule, { dtstart });
  const dates = rule.between(dtstart, until, true);

  const exdateSet = new Set(exdates);
  const result: string[] = [];
  for (const d of dates) {
    if (result.length >= limit) break;
    const dateKey = toLocalDateKey(d.toISOString() as IsoUtc, tzOffsetMin);
    if (!exdateSet.has(dateKey)) {
      result.push(dateKey);
    }
  }
  return result;
}

/**
 * RRULE 文字列の妥当性チェック (parse できれば true、 例外時 false)。
 * UI で「保存前 validation」 等に使用想定。
 */
export function isValidRRule(rrule: string, startAtUtc: string): boolean {
  try {
    const dtstart = new Date(startAtUtc);
    rrulestr(rrule, { dtstart });
    return true;
  } catch {
    return false;
  }
}

/**
 * 6 preset の RRULE 文字列 (ADR-0056 D4)。
 * UI の RecurrencePicker から 直接参照。
 */
export const RECURRENCE_PRESETS = {
  daily: 'FREQ=DAILY',
  weeklyMonday: 'FREQ=WEEKLY;BYDAY=MO',
  weekly: 'FREQ=WEEKLY',
  biweekly: 'FREQ=WEEKLY;INTERVAL=2',
  monthly: 'FREQ=MONTHLY',
  every3Months: 'FREQ=MONTHLY;INTERVAL=3',
} as const;

export type RecurrencePresetKey = keyof typeof RECURRENCE_PRESETS;
