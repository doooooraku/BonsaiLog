/**
 * F-16 ローカル通知 — Deep Link parser (Issue #30 / ADR-0014)。
 *
 * Related:
 * - ADR-0014 §通知タップ後の遷移
 * - Issue #30 AC4: 通知タップで作業予定カレンダー (S-08) が当日選択状態で開く
 *
 * 設計方針:
 * - 副作用なしの純関数 (URL string → 構造化済み Deep Link)
 * - 不正入力 (壊れた URL / 不明 host / 不正 date) は null 返却、UI 側で fallback
 * - YYYY-MM-DD ISO 8601 date のみ受理 (タイムゾーン情報は持たない、ローカル日付として解釈)
 * - 拡張可能性: 将来 `bonsailog://bonsai/<id>` 等の他 host を追加する場合も同パーサで分岐
 *
 * 例:
 *   parseNotificationDeepLink('bonsailog://calendar?date=2026-05-03')
 *     → { route: 'calendar', date: '2026-05-03' }
 *   parseNotificationDeepLink('bonsailog://calendar')
 *     → { route: 'calendar', date: null }
 *   parseNotificationDeepLink('https://example.com/calendar')
 *     → null (scheme mismatch)
 */

export type NotificationDeepLink = {
  /** 遷移先 route 名 (S-08 = 'calendar')。 */
  route: 'calendar';
  /** YYYY-MM-DD ISO 8601 date (UI でローカル日付として解釈)、未指定なら null。 */
  date: string | null;
};

/** Deep Link scheme (app.config.ts の scheme と一致させる)。 */
export const DEEP_LINK_SCHEME = 'bonsailog';

/** YYYY-MM-DD 形式かを判定する純関数。 */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (year < 1970 || year > 9999) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  // 月別最大日数の厳密チェック (Date を経由せず純計算で 2/30 等を弾く)
  const daysInMonth = [31, 28 + (isLeapYear(year) ? 1 : 0), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * 通知タップ Deep Link をパースする純関数。
 *
 * @param url URL 文字列 (`bonsailog://calendar?date=YYYY-MM-DD` 形式)
 * @returns 解析成功時は構造化オブジェクト、不正入力は null
 */
export function parseNotificationDeepLink(url: unknown): NotificationDeepLink | null {
  if (typeof url !== 'string' || url.length === 0) return null;

  const schemePrefix = `${DEEP_LINK_SCHEME}://`;
  if (!url.startsWith(schemePrefix)) return null;

  // 'bonsailog://calendar?date=...' → 'calendar?date=...'
  const rest = url.slice(schemePrefix.length);
  if (rest.length === 0) return null;

  const queryStart = rest.indexOf('?');
  const host = queryStart === -1 ? rest : rest.slice(0, queryStart);
  const queryStr = queryStart === -1 ? '' : rest.slice(queryStart + 1);

  // 末尾 / は許容 (例: 'calendar/?date=...')
  const normalizedHost = host.replace(/\/+$/, '');

  if (normalizedHost !== 'calendar') return null;

  const date = extractDateParam(queryStr);
  if (date === null) {
    return { route: 'calendar', date: null };
  }
  if (!isValidIsoDate(date)) return null;

  return { route: 'calendar', date };
}

function extractDateParam(queryStr: string): string | null {
  if (queryStr.length === 0) return null;
  const pairs = queryStr.split('&');
  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx);
    const value = pair.slice(eqIdx + 1);
    if (key === 'date') {
      try {
        return decodeURIComponent(value);
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * NotificationResponse の Deep Link URL を抽出する。
 *
 * Listener から渡される `notification.request.content.data.url` を見るが、
 * 値が string 以外の場合は null 返却。Phase D 以降で Listener 配線時に使用。
 */
export function extractDeepLinkUrl(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const url = (data as { url?: unknown }).url;
  return typeof url === 'string' ? url : null;
}
