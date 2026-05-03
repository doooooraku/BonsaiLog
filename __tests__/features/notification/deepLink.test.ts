/**
 * F-16 Phase C — Deep Link parser テスト (Issue #30 / ADR-0014)。
 *
 * AC4 (通知タップ後の遷移) の純関数部分をカバー:
 * - AC4-4: Deep Link `bonsailog://calendar?date=YYYY-MM-DD` 動作
 * - AC4-3: 完全停止状態タップで Deep Link 復元 (パース部分のみ、Listener 配線は Phase D)
 *
 * S-08 画面遷移と addNotificationResponseReceivedListener 配線は Phase D 以降。
 */

import {
  DEEP_LINK_SCHEME,
  extractDeepLinkUrl,
  isValidIsoDate,
  parseNotificationDeepLink,
} from '@/src/features/notification/deepLink';

describe('DEEP_LINK_SCHEME', () => {
  test('スキーム名は app.config.ts と一致 (bonsailog)', () => {
    expect(DEEP_LINK_SCHEME).toBe('bonsailog');
  });
});

describe('isValidIsoDate (YYYY-MM-DD 厳密チェック)', () => {
  test('正常な日付', () => {
    expect(isValidIsoDate('2026-05-03')).toBe(true);
    expect(isValidIsoDate('2024-02-29')).toBe(true); // 閏年
    expect(isValidIsoDate('1970-01-01')).toBe(true);
    expect(isValidIsoDate('9999-12-31')).toBe(true);
  });

  test('閏年判定', () => {
    expect(isValidIsoDate('2024-02-29')).toBe(true); // 4 で割り切れる
    expect(isValidIsoDate('2025-02-29')).toBe(false); // 平年
    expect(isValidIsoDate('2000-02-29')).toBe(true); // 400 で割り切れる
    expect(isValidIsoDate('1900-02-29')).toBe(false); // 100 で割り切れるが 400 では割り切れない
  });

  test('月別最大日数チェック', () => {
    expect(isValidIsoDate('2026-04-30')).toBe(true);
    expect(isValidIsoDate('2026-04-31')).toBe(false); // 4 月は 30 日まで
    expect(isValidIsoDate('2026-06-31')).toBe(false); // 6 月は 30 日まで
    expect(isValidIsoDate('2026-09-31')).toBe(false); // 9 月は 30 日まで
    expect(isValidIsoDate('2026-11-31')).toBe(false); // 11 月は 30 日まで
  });

  test('境界値外', () => {
    expect(isValidIsoDate('2026-00-01')).toBe(false); // 月 0
    expect(isValidIsoDate('2026-13-01')).toBe(false); // 月 13
    expect(isValidIsoDate('2026-01-00')).toBe(false); // 日 0
    expect(isValidIsoDate('2026-01-32')).toBe(false); // 日 32
  });

  test('フォーマット不一致', () => {
    expect(isValidIsoDate('2026-5-3')).toBe(false); // 0 padding なし
    expect(isValidIsoDate('20260503')).toBe(false); // - なし
    expect(isValidIsoDate('2026/05/03')).toBe(false); // / 区切り
    expect(isValidIsoDate('not-a-date')).toBe(false);
    expect(isValidIsoDate('')).toBe(false);
  });
});

describe('parseNotificationDeepLink (AC4-4)', () => {
  describe('正常系', () => {
    test('calendar + date 指定 → 構造化 (AC4-4)', () => {
      const result = parseNotificationDeepLink('bonsailog://calendar?date=2026-05-03');
      expect(result).toEqual({ route: 'calendar', date: '2026-05-03' });
    });

    test('calendar のみ (date 未指定) → date=null', () => {
      const result = parseNotificationDeepLink('bonsailog://calendar');
      expect(result).toEqual({ route: 'calendar', date: null });
    });

    test('末尾 / 許容', () => {
      const result = parseNotificationDeepLink('bonsailog://calendar/?date=2026-05-03');
      expect(result).toEqual({ route: 'calendar', date: '2026-05-03' });
    });

    test('複数のクエリパラメータでも date のみ抽出', () => {
      const result = parseNotificationDeepLink(
        'bonsailog://calendar?source=notif&date=2026-05-03&trace=abc',
      );
      expect(result).toEqual({ route: 'calendar', date: '2026-05-03' });
    });

    test('date が URL encode されていてもデコード', () => {
      // YYYY-MM-DD はそもそも encode 対象でないが、念のため pass-through 検証
      const result = parseNotificationDeepLink(
        `bonsailog://calendar?date=${encodeURIComponent('2026-05-03')}`,
      );
      expect(result).toEqual({ route: 'calendar', date: '2026-05-03' });
    });
  });

  describe('異常系 → null', () => {
    test('scheme 不一致 (https) → null', () => {
      expect(parseNotificationDeepLink('https://example.com/calendar?date=2026-05-03')).toBeNull();
    });

    test('別スキーム (custom) → null', () => {
      expect(parseNotificationDeepLink('custom://calendar?date=2026-05-03')).toBeNull();
    });

    test('未知 host → null', () => {
      expect(parseNotificationDeepLink('bonsailog://bonsai/abc')).toBeNull();
      expect(parseNotificationDeepLink('bonsailog://settings')).toBeNull();
    });

    test('host が空 (scheme のみ) → null', () => {
      expect(parseNotificationDeepLink('bonsailog://')).toBeNull();
    });

    test('不正な date (フォーマット) → null', () => {
      expect(parseNotificationDeepLink('bonsailog://calendar?date=20260503')).toBeNull();
      expect(parseNotificationDeepLink('bonsailog://calendar?date=invalid')).toBeNull();
    });

    test('不正な date (存在しない日) → null', () => {
      expect(parseNotificationDeepLink('bonsailog://calendar?date=2026-02-30')).toBeNull();
      expect(parseNotificationDeepLink('bonsailog://calendar?date=2025-02-29')).toBeNull();
    });

    test('入力型ガード (string 以外) → null', () => {
      expect(parseNotificationDeepLink(undefined)).toBeNull();
      expect(parseNotificationDeepLink(null)).toBeNull();
      expect(parseNotificationDeepLink(123)).toBeNull();
      expect(parseNotificationDeepLink({})).toBeNull();
    });

    test('空文字列 → null', () => {
      expect(parseNotificationDeepLink('')).toBeNull();
    });
  });
});

describe('extractDeepLinkUrl (NotificationResponse.data.url 抽出)', () => {
  test('正常な data.url を抽出', () => {
    expect(extractDeepLinkUrl({ url: 'bonsailog://calendar?date=2026-05-03' })).toBe(
      'bonsailog://calendar?date=2026-05-03',
    );
  });

  test('data.url が string 以外 → null', () => {
    expect(extractDeepLinkUrl({ url: 123 })).toBeNull();
    expect(extractDeepLinkUrl({ url: null })).toBeNull();
    expect(extractDeepLinkUrl({ url: { nested: true } })).toBeNull();
  });

  test('data.url キーなし → null', () => {
    expect(extractDeepLinkUrl({ source: 'watering' })).toBeNull();
    expect(extractDeepLinkUrl({})).toBeNull();
  });

  test('data 自体が null/undefined/非オブジェクト → null', () => {
    expect(extractDeepLinkUrl(null)).toBeNull();
    expect(extractDeepLinkUrl(undefined)).toBeNull();
    expect(extractDeepLinkUrl('string')).toBeNull();
    expect(extractDeepLinkUrl(42)).toBeNull();
  });
});

describe('AC4 シナリオ統合 (extract → parse のチェーン)', () => {
  test('シナリオ A: 通知 data.url から calendar Deep Link を完全パース', () => {
    const data = { url: 'bonsailog://calendar?date=2026-05-03' };
    const url = extractDeepLinkUrl(data);
    expect(url).not.toBeNull();
    const link = parseNotificationDeepLink(url);
    expect(link).toEqual({ route: 'calendar', date: '2026-05-03' });
  });

  test('シナリオ B: data.url 不在 → 早期 null (UI 側で当日 fallback)', () => {
    const data = { source: 'watering' };
    const url = extractDeepLinkUrl(data);
    expect(url).toBeNull();
  });

  test('シナリオ C: data.url 不正 (壊れた scheme) → parse で null', () => {
    const data = { url: 'broken://link' };
    const url = extractDeepLinkUrl(data);
    expect(url).toBe('broken://link');
    const link = parseNotificationDeepLink(url);
    expect(link).toBeNull();
  });
});
