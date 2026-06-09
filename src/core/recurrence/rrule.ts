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

import { toLocalDateKey } from '@/src/core/datetime';
import type { IsoUtc } from '@/src/core/datetime/types';

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
 * 7 preset + custom の RRULE 文字列 (ADR-0056 D4 Sess89 PR-B Amendment)。
 * UI の RecurrencePicker から 直接参照。
 *
 * 改訂経緯:
 * - Sess78 当初 = 6 preset (= daily / weeklyMonday / weekly / biweekly / monthly / every3Months)
 * - Sess89 PR-B = 業界整合 (Apple/Google/Todoist/Things 3) + 盆栽特有「長周期」 (= 半年/毎年)
 *   需要 + ユーザー任意「N 日ごと」 で 7 preset + custom に再構成。
 *   - 追加: every6Months / yearly / custom (= 動的生成 helper buildCustomRrule)
 *   - 削除: weeklyMonday (= 曜日固定で他曜日 user 排除) / biweekly (= 業界 preset 不在、 低頻度)
 *   - 注: 既存 rule の RRULE (= 旧 weeklyMonday/biweekly) は migration せず維持、
 *         rruleToHumanLabel で「カスタム」 fallback 表示
 *
 * `custom` key は **静的 default = FREQ=DAILY;INTERVAL=7**。 実際の保存値は caller で
 * `buildCustomRrule(n)` 経由で動的生成、 user 入力値で上書き。
 */
export const RECURRENCE_PRESETS = {
  daily: 'FREQ=DAILY',
  weekly: 'FREQ=WEEKLY',
  monthly: 'FREQ=MONTHLY',
  every3Months: 'FREQ=MONTHLY;INTERVAL=3',
  every6Months: 'FREQ=MONTHLY;INTERVAL=6',
  yearly: 'FREQ=YEARLY',
  custom: 'FREQ=DAILY;INTERVAL=7',
} as const;

export type RecurrencePresetKey = keyof typeof RECURRENCE_PRESETS;

/**
 * カスタム周期の RRULE 動的生成 (= Sess89 PR-B、 ADR-0056 D4 Amendment)。
 *
 * 「N 日ごとに繰り返す」 を表す RFC 5545 RRULE (= `FREQ=DAILY;INTERVAL=N`) を返す。
 * caller (= RecurrencePicker / RecurrenceFormScreen) で user 入力値を本 helper 経由で
 * 生成し、 保存時に `RECURRENCE_PRESETS.custom` を上書き。
 *
 * @param days - 繰り返し間隔 (日数)、 1-365 範囲。 範囲外 / 非整数は 7 で fallback。
 * @returns RFC 5545 RRULE 文字列 (= 例: `FREQ=DAILY;INTERVAL=10`)
 */
export function buildCustomRrule(days: number): string {
  const safeDays = Number.isInteger(days) && days >= 1 && days <= 365 ? days : 7;
  return `FREQ=DAILY;INTERVAL=${safeDays}`;
}

/**
 * カスタム周期の RRULE から N 日数を逆算 (= 編集時の初期値ロード用、 Sess89 PR-B)。
 *
 * `FREQ=DAILY;INTERVAL=N` pattern match で N を返す。 match 失敗時は null。
 * `FREQ=DAILY` (= INTERVAL なし、 daily preset と同義) は null を返す (= preset で十分)。
 *
 * @param rrule - RFC 5545 RRULE 文字列
 * @returns N (= 日数、 1-365 範囲)、 match 失敗時 null
 */
export function parseCustomRruleDays(rrule: string): number | null {
  const m = /^FREQ=DAILY;INTERVAL=(\d+)$/.exec(rrule);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n >= 1 && n <= 365 ? n : null;
}
