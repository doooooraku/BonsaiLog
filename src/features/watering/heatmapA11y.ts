/**
 * F-04 ヒートマップ — accessibilityLabel 生成 純関数 (Phase D-3、Issue #29 / ADR-0013 AC10)。
 *
 * AC10-2 セル: "2026年4月15日 水曜日、水やり 2 回"
 * AC10-3 集約: "365 日中 N 日記録、計 M 件"
 *
 * Intl.DateTimeFormat で locale 別の日付 + 曜日を取得 (Hermes Intl 対応済前提)。
 * テンプレート文字列はラベル fragments を引数で受け取り、純関数で組み立て可能。
 */

/** AC10-2 セル用 a11y label 生成パラメータ。 */
export type CellLabelParams = {
  /** YYYY-MM-DD ローカル日付。 */
  dateKey: string;
  /** その日の水やり件数 (>=0)。 */
  count: number;
  /** BCP 47 locale (例: 'ja', 'en', 'zh-Hans')。 */
  locale: string;
  /** ラベルテンプレート (fragments を受け取り完成形 string を返す)。i18n 連携用。 */
  template: (fragments: { dateText: string; weekdayText: string; count: number }) => string;
};

/** AC10-3 集約 a11y label 生成パラメータ。 */
export type AggregateLabelParams = {
  recordedDays: number;
  totalEvents: number;
  windowDays: number;
  template: (fragments: {
    recordedDays: number;
    totalEvents: number;
    windowDays: number;
  }) => string;
};

/**
 * YYYY-MM-DD から locale 別の長い日付文字列を返す純関数。
 *
 * 例: 'ja' + '2026-04-15' → '2026年4月15日'
 *     'en' + '2026-04-15' → 'April 15, 2026'
 *
 * Intl.DateTimeFormat 失敗時は dateKey をそのまま返す (デグレード可)。
 */
export function formatDateForA11y(dateKey: string, locale: string): string {
  if (!isValidDateKey(dateKey)) return dateKey;
  try {
    const date = parseDateKey(dateKey);
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateKey;
  }
}

/**
 * YYYY-MM-DD から locale 別の曜日文字列 (long) を返す純関数。
 *
 * 例: 'ja' + '2026-04-15' → '水曜日'
 *     'en' + '2026-04-15' → 'Wednesday'
 */
export function formatWeekdayForA11y(dateKey: string, locale: string): string {
  if (!isValidDateKey(dateKey)) return '';
  try {
    const date = parseDateKey(dateKey);
    return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
  } catch {
    return '';
  }
}

/**
 * AC10-2: ヒートマップセルの a11y label を生成する純関数。
 *
 * UI 層は template 関数で i18n キーを組み合わせる。
 *
 * @example
 *   buildHeatmapCellLabel({
 *     dateKey: '2026-04-15',
 *     count: 2,
 *     locale: 'ja',
 *     template: ({ dateText, weekdayText, count }) =>
 *       `${dateText} ${weekdayText}、水やり ${count} 回`,
 *   })
 *   // → '2026年4月15日 水曜日、水やり 2 回'
 */
export function buildHeatmapCellLabel(params: CellLabelParams): string {
  const { dateKey, count, locale, template } = params;
  const dateText = formatDateForA11y(dateKey, locale);
  const weekdayText = formatWeekdayForA11y(dateKey, locale);
  const safeCount = Math.max(0, Math.floor(count));
  return template({ dateText, weekdayText, count: safeCount });
}

/**
 * AC10-3: ヒートマップ全体の集約 a11y label を生成する純関数。
 *
 * @example
 *   buildHeatmapAggregateLabel({
 *     recordedDays: 120,
 *     totalEvents: 145,
 *     windowDays: 365,
 *     template: ({ recordedDays, totalEvents, windowDays }) =>
 *       `${windowDays} 日中 ${recordedDays} 日記録、計 ${totalEvents} 件`,
 *   })
 *   // → '365 日中 120 日記録、計 145 件'
 */
export function buildHeatmapAggregateLabel(params: AggregateLabelParams): string {
  const safeRecorded = Math.max(0, Math.floor(params.recordedDays));
  const safeTotal = Math.max(0, Math.floor(params.totalEvents));
  const safeWindow = Math.max(1, Math.floor(params.windowDays));
  return params.template({
    recordedDays: safeRecorded,
    totalEvents: safeTotal,
    windowDays: safeWindow,
  });
}

// ---------------------------------------------------------------------------
// 内部ヘルパ
// ---------------------------------------------------------------------------

function isValidDateKey(value: string): boolean {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseDateKey(dateKey: string): Date {
  const year = Number(dateKey.slice(0, 4));
  const month = Number(dateKey.slice(5, 7)) - 1;
  const day = Number(dateKey.slice(8, 10));
  // UTC で解釈 (TZ 影響回避、ローカル日付の "意味" だけが a11y で重要)
  return new Date(Date.UTC(year, month, day));
}
