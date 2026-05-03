/**
 * F-16 通知時刻の HH:MM 文字列 ⇔ Date 変換 純関数 (Issue #30)。
 *
 * settingsStore の `notificationDailySummaryTime` は "07:00" 等の
 * ZeroPadded HH:MM 文字列で保存される。`@react-native-community/datetimepicker`
 * の `value` / onChange は `Date` を受け渡すため、相互変換が必要。
 */

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * "HH:MM" → Date (今日の日付 + 指定時刻、ローカルタイムゾーン)。
 * 不正形式や未指定時は 07:00 デフォルトで返す (settingsStore のデフォルトと一致)。
 */
export function parseHhmmToDate(hhmm: string, baseDate: Date): Date {
  const m = HHMM_RE.exec(hhmm);
  const next = new Date(baseDate.getTime());
  if (m) {
    next.setHours(Number(m[1]), Number(m[2]), 0, 0);
  } else {
    next.setHours(7, 0, 0, 0);
  }
  return next;
}

/**
 * Date → "HH:MM" (ZeroPadded、ローカルタイムゾーン)。
 */
export function formatDateToHhmm(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
