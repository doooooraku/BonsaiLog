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
 * 初回 occurrence 探索の default 窓 (= 終了日未指定時)。
 * 全 preset は dtstart アンカー型 (= 初回 = 開始日) のため理論上 1 日で足りるが、
 * 非アンカー型 (= FREQ=WEEKLY;BYDAY=...) の最大 7 日 + exdates で初回が複数回飛ぶ
 * ケース (= yearly + 例外日) も拾えるよう 2 年 (= 731 日) を取る。 limit=1 で
 * 探索は初回合致で打ち切られるため窓の広さは性能に影響しない (= between 生成は
 * 窓内全件だが最大でも daily 731 件、 ms オーダー)。
 */
const FIRST_OCCURRENCE_WINDOW_MS = 731 * 24 * 60 * 60 * 1000;

/**
 * 「次回 (= 初回合致日)」 計算の SoT 関数 (Sess101 #1157)。
 *
 * 保存時の events 事前展開 (recurrenceRuleRepository) と**同一経路** (= expandRRule =
 * rrulestr + toLocalDateKey) で初回 occurrence を計算する。 UI の「次回」 表示は必ず
 * 本関数を経由すること — startDate 直表示は禁止 (= 旧 Sess94 PR-B 実装の偽表示 bug):
 * rrule lib は意図的 RFC 5545 非準拠で、 dtstart が rule に合致しない場合 occurrence に
 * 含めない (例: 開始 2026-06-11 木 + FREQ=WEEKLY;BYDAY=MO → 初回 = 2026-06-15 月)。
 *
 * @param rrule - RFC 5545 RRULE 文字列 (DTSTART は含めない)
 * @param startAtUtc - 開始 ISO UTC 日時 (DTSTART として使用)
 * @param endAtUtc - 終了 ISO UTC 日時、 null = 終了日なし (default 窓で探索)
 * @param exdates - 例外日 YYYY-MM-DD 配列
 * @param tzOffsetMin - TZ オフセット分
 * @returns 初回合致日の YYYY-MM-DD、 窓内 (= 終了日まで) に合致なしなら null
 */
export function computeFirstOccurrenceDateKey(
  rrule: string,
  startAtUtc: string,
  endAtUtc: string | null,
  exdates: readonly string[],
  tzOffsetMin: number,
): string | null {
  const windowEndUtc =
    endAtUtc ?? new Date(new Date(startAtUtc).getTime() + FIRST_OCCURRENCE_WINDOW_MS).toISOString();
  const dates = expandRRule(rrule, startAtUtc, windowEndUtc, exdates, tzOffsetMin, 1);
  return dates[0] ?? null;
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

/**
 * 曜日番号 (= JavaScript Date.getDay() 互換、 0=Sun, 1=Mon, ..., 6=Sat) と
 * RFC 5545 BYDAY 表記 (= SU, MO, TU, WE, TH, FR, SA) の対応 (Sess93 PR-2)。
 *
 * UI (= RecurrencePicker の曜日 picker) で 0-6 整数 配列を扱い、 RRULE 保存時に本 helper で 変換。
 */
const WEEKDAY_BYDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

/**
 * 「毎週 + 任意曜日複数」 の RRULE 文字列を生成 (Sess93 PR-2、 ADR-0056 Sess93 Amendment)。
 *
 * 曜日番号 (= 0-6、 0=Sun 〜 6=Sat) 配列を BYDAY=SU,MO,... に変換し、 `FREQ=WEEKLY;BYDAY=...` を返す。
 * 配列が空 / 無効値のみの場合は `FREQ=WEEKLY` (= 曜日指定なし、 開始日基準) を fallback で返す。
 *
 * 重複入力は dedupe + ソート、 範囲外 (= <0 or >6) は除外。
 *
 * @param weekdays - 曜日番号配列 (= 例: [1, 3, 5] = 月水金)
 * @returns RFC 5545 RRULE 文字列 (= 例: `FREQ=WEEKLY;BYDAY=MO,WE,FR`)
 */
export function buildWeeklyByDayRrule(weekdays: readonly number[]): string {
  const unique = Array.from(
    new Set(weekdays.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)),
  ).sort((a, b) => a - b);
  if (unique.length === 0) return 'FREQ=WEEKLY';
  const codes = unique.map((n) => WEEKDAY_BYDAY_CODES[n]).join(',');
  return `FREQ=WEEKLY;BYDAY=${codes}`;
}

/**
 * 「毎週 + 任意曜日複数」 の RRULE から曜日番号配列を 逆算 (= 編集時の初期値ロード用、 Sess93 PR-2)。
 *
 * `FREQ=WEEKLY;BYDAY=SU,MO,...` pattern match で 曜日番号配列 (= 0-6) を返す。
 * - `FREQ=WEEKLY` (= BYDAY なし、 開始日基準): 空配列 [] を返す (= picker UI で「何も選択していない」 状態)
 * - その他 (= FREQ=DAILY 等): null を返す (= 別 preset 扱い)
 *
 * @param rrule - RFC 5545 RRULE 文字列
 * @returns 曜日番号配列 (= 0-6 ソート済)、 weekly preset 以外なら null
 */
export function parseWeeklyByDay(rrule: string): number[] | null {
  if (rrule === 'FREQ=WEEKLY') return [];
  const m = /^FREQ=WEEKLY;BYDAY=([A-Z,]+)$/.exec(rrule);
  if (!m) return null;
  const codes = m[1]!.split(',');
  const days: number[] = [];
  for (const code of codes) {
    const idx = WEEKDAY_BYDAY_CODES.indexOf(code as (typeof WEEKDAY_BYDAY_CODES)[number]);
    if (idx >= 0) days.push(idx);
  }
  return Array.from(new Set(days)).sort((a, b) => a - b);
}
