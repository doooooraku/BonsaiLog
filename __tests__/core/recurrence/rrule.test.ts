/**
 * Sess78 PR-3: RRULE 展開純関数 test (ADR-0056 D3、 R-66 整合)。
 *
 * 80 case 想定で 基本 + 境界 + exdate + 終了日 + 異常系 を 網羅。
 * 実 DB は 触らない (= 純関数 test、 Node 20 でも 動く)。
 */
import { expandRRule, isValidRRule, RECURRENCE_PRESETS } from '@/src/core/recurrence/rrule';

const JST_OFFSET = 540; // +09:00

describe('expandRRule (純関数、 RFC 5545 RRULE → YYYY-MM-DD[] 展開)', () => {
  describe('基本 — preset 6 種', () => {
    test('毎日 (FREQ=DAILY) → 1 週間 = 7 件', () => {
      const dates = expandRRule(
        RECURRENCE_PRESETS.daily,
        '2026-06-15T00:00:00.000Z',
        '2026-06-21T23:59:59.000Z',
        [],
        JST_OFFSET,
      );
      expect(dates).toHaveLength(7);
      expect(dates[0]).toBe('2026-06-15');
      expect(dates[6]).toBe('2026-06-21');
    });

    test('毎週月曜 (FREQ=WEEKLY;BYDAY=MO) + 開始月曜 → 8 週で 8 件', () => {
      const dates = expandRRule(
        RECURRENCE_PRESETS.weeklyMonday,
        '2026-06-15T00:00:00.000Z', // 月曜
        '2026-08-09T23:59:59.000Z',
        [],
        JST_OFFSET,
      );
      expect(dates.length).toBeGreaterThanOrEqual(8);
      expect(dates[0]).toBe('2026-06-15');
      expect(dates[1]).toBe('2026-06-22');
      expect(dates[2]).toBe('2026-06-29');
    });

    test('毎週 (FREQ=WEEKLY) + 開始月曜 → 4 週で 4 件 (開始日 基準)', () => {
      const dates = expandRRule(
        RECURRENCE_PRESETS.weekly,
        '2026-06-15T00:00:00.000Z',
        '2026-07-13T23:59:59.000Z',
        [],
        JST_OFFSET,
      );
      expect(dates.length).toBeGreaterThanOrEqual(4);
      expect(dates[0]).toBe('2026-06-15');
    });

    test('隔週 (FREQ=WEEKLY;INTERVAL=2) → 8 週で 4 件', () => {
      const dates = expandRRule(
        RECURRENCE_PRESETS.biweekly,
        '2026-06-15T00:00:00.000Z',
        '2026-08-09T23:59:59.000Z',
        [],
        JST_OFFSET,
      );
      expect(dates).toHaveLength(4);
      expect(dates[0]).toBe('2026-06-15');
      expect(dates[1]).toBe('2026-06-29');
      expect(dates[2]).toBe('2026-07-13');
      expect(dates[3]).toBe('2026-07-27');
    });

    test('毎月 (FREQ=MONTHLY) + 開始 15 日 → 3 ヶ月で 3 件', () => {
      const dates = expandRRule(
        RECURRENCE_PRESETS.monthly,
        '2026-06-15T00:00:00.000Z',
        '2026-08-15T23:59:59.000Z',
        [],
        JST_OFFSET,
      );
      expect(dates).toHaveLength(3);
      expect(dates[0]).toBe('2026-06-15');
      expect(dates[1]).toBe('2026-07-15');
      expect(dates[2]).toBe('2026-08-15');
    });

    test('3 ヶ月ごと (FREQ=MONTHLY;INTERVAL=3) + 開始 4/1 → 1 年で 4 件', () => {
      const dates = expandRRule(
        RECURRENCE_PRESETS.every3Months,
        '2026-04-01T00:00:00.000Z',
        '2027-03-31T23:59:59.000Z',
        [],
        JST_OFFSET,
      );
      expect(dates).toHaveLength(4);
      expect(dates[0]).toBe('2026-04-01');
      expect(dates[1]).toBe('2026-07-01');
      expect(dates[2]).toBe('2026-10-01');
      expect(dates[3]).toBe('2027-01-01');
    });
  });

  describe('exdates (例外日除外)', () => {
    test('1 件 skip → 7 件 - 1 = 6 件', () => {
      const dates = expandRRule(
        RECURRENCE_PRESETS.daily,
        '2026-06-15T00:00:00.000Z',
        '2026-06-21T23:59:59.000Z',
        ['2026-06-17'],
        JST_OFFSET,
      );
      expect(dates).toHaveLength(6);
      expect(dates).not.toContain('2026-06-17');
    });

    test('連続 2 件 skip → 7 件 - 2 = 5 件', () => {
      const dates = expandRRule(
        RECURRENCE_PRESETS.daily,
        '2026-06-15T00:00:00.000Z',
        '2026-06-21T23:59:59.000Z',
        ['2026-06-17', '2026-06-18'],
        JST_OFFSET,
      );
      expect(dates).toHaveLength(5);
    });

    test('全件 skip → 0 件', () => {
      const dates = expandRRule(
        RECURRENCE_PRESETS.daily,
        '2026-06-15T00:00:00.000Z',
        '2026-06-17T23:59:59.000Z',
        ['2026-06-15', '2026-06-16', '2026-06-17'],
        JST_OFFSET,
      );
      expect(dates).toHaveLength(0);
    });

    test('exdates にない日付は除外しない', () => {
      const dates = expandRRule(
        RECURRENCE_PRESETS.daily,
        '2026-06-15T00:00:00.000Z',
        '2026-06-17T23:59:59.000Z',
        ['2026-12-31'],
        JST_OFFSET,
      );
      expect(dates).toHaveLength(3);
    });
  });

  describe('境界 — 月末日 / うるう年 / DST', () => {
    test('毎月 31 日 (BYMONTHDAY=31) → 2/4/6/9/11 月 skip (= rrule lib の仕様)', () => {
      const dates = expandRRule(
        'FREQ=MONTHLY;BYMONTHDAY=31',
        '2026-01-31T00:00:00.000Z',
        '2026-12-31T23:59:59.000Z',
        [],
        JST_OFFSET,
      );
      // 1/3/5/7/8/10/12 月の 31 日 = 7 件
      expect(dates).toHaveLength(7);
      expect(dates).toContain('2026-01-31');
      expect(dates).toContain('2026-03-31');
      expect(dates).toContain('2026-05-31');
      expect(dates).toContain('2026-07-31');
      expect(dates).toContain('2026-08-31');
      expect(dates).toContain('2026-10-31');
      expect(dates).toContain('2026-12-31');
      expect(dates).not.toContain('2026-02-31');
      expect(dates).not.toContain('2026-04-30');
    });

    test('うるう年 2/29 (FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29) → うるう年のみ', () => {
      const dates = expandRRule(
        'FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29',
        '2024-02-29T00:00:00.000Z',
        '2032-12-31T23:59:59.000Z',
        [],
        JST_OFFSET,
      );
      // うるう年: 2024 / 2028 / 2032 = 3 件
      expect(dates).toHaveLength(3);
      expect(dates).toContain('2024-02-29');
      expect(dates).toContain('2028-02-29');
      expect(dates).toContain('2032-02-29');
    });
  });

  describe('終了日 (UNTIL の代替 = endAtUtc 引数)', () => {
    test('endAtUtc < startAtUtc → 0 件 (異常 input ガード)', () => {
      const dates = expandRRule(
        RECURRENCE_PRESETS.daily,
        '2026-06-15T00:00:00.000Z',
        '2026-06-14T00:00:00.000Z',
        [],
        JST_OFFSET,
      );
      expect(dates).toHaveLength(0);
    });

    test('endAtUtc = startAtUtc (同時刻) → 1 件 (開始日のみ)', () => {
      const dates = expandRRule(
        RECURRENCE_PRESETS.daily,
        '2026-06-15T00:00:00.000Z',
        '2026-06-15T00:00:00.000Z',
        [],
        JST_OFFSET,
      );
      expect(dates).toHaveLength(1);
      expect(dates[0]).toBe('2026-06-15');
    });

    test('終了日まで 1 年 (毎週月曜 365 日) → 52 件前後', () => {
      const dates = expandRRule(
        RECURRENCE_PRESETS.weeklyMonday,
        '2026-06-15T00:00:00.000Z',
        '2027-06-14T23:59:59.000Z',
        [],
        JST_OFFSET,
      );
      expect(dates.length).toBeGreaterThanOrEqual(52);
      expect(dates.length).toBeLessThanOrEqual(53);
    });
  });

  describe('limit ガード (ADR-0056 R3 性能)', () => {
    test('limit=5 で 7 件中 5 件のみ', () => {
      const dates = expandRRule(
        RECURRENCE_PRESETS.daily,
        '2026-06-15T00:00:00.000Z',
        '2026-06-21T23:59:59.000Z',
        [],
        JST_OFFSET,
        5,
      );
      expect(dates).toHaveLength(5);
    });

    test('limit=0 → 0 件', () => {
      const dates = expandRRule(
        RECURRENCE_PRESETS.daily,
        '2026-06-15T00:00:00.000Z',
        '2026-06-21T23:59:59.000Z',
        [],
        JST_OFFSET,
        0,
      );
      expect(dates).toHaveLength(0);
    });

    test('limit=-1 → 0 件 (異常 input ガード)', () => {
      const dates = expandRRule(
        RECURRENCE_PRESETS.daily,
        '2026-06-15T00:00:00.000Z',
        '2026-06-21T23:59:59.000Z',
        [],
        JST_OFFSET,
        -1,
      );
      expect(dates).toHaveLength(0);
    });
  });

  describe('TZ 整合 (ADR-0008 R-55 + R-66、 toLocalDateKey 経由)', () => {
    test('JST (+540) で 朝 0:00 UTC = ローカル 9:00 → dateKey は 同日', () => {
      const dates = expandRRule(
        RECURRENCE_PRESETS.daily,
        '2026-06-15T00:00:00.000Z',
        '2026-06-15T23:59:59.000Z',
        [],
        JST_OFFSET,
      );
      expect(dates).toEqual(['2026-06-15']);
    });

    test('PST (-480) で 朝 0:00 UTC = 前日 16:00 → dateKey は 前日', () => {
      const dates = expandRRule(
        RECURRENCE_PRESETS.daily,
        '2026-06-15T00:00:00.000Z',
        '2026-06-15T23:59:59.000Z',
        [],
        -480,
      );
      // toLocalDateKey で PST 補正後、 6/14 が出る (RRULE は UTC で 6/15 1 件、 PST 補正で 6/14)
      expect(dates).toEqual(['2026-06-14']);
    });
  });

  describe('結果の性質 (重複なし / ソート済)', () => {
    test('重複なし', () => {
      const dates = expandRRule(
        RECURRENCE_PRESETS.weeklyMonday,
        '2026-06-15T00:00:00.000Z',
        '2027-06-15T23:59:59.000Z',
        [],
        JST_OFFSET,
      );
      const unique = new Set(dates);
      expect(unique.size).toBe(dates.length);
    });

    test('昇順ソート済', () => {
      const dates = expandRRule(
        RECURRENCE_PRESETS.weeklyMonday,
        '2026-06-15T00:00:00.000Z',
        '2026-12-31T23:59:59.000Z',
        [],
        JST_OFFSET,
      );
      const sorted = [...dates].sort();
      expect(dates).toEqual(sorted);
    });
  });
});

describe('isValidRRule (RRULE 文字列 validation)', () => {
  test('有効な RRULE → true', () => {
    expect(isValidRRule('FREQ=WEEKLY;BYDAY=MO', '2026-06-15T00:00:00.000Z')).toBe(true);
    expect(isValidRRule('FREQ=DAILY', '2026-06-15T00:00:00.000Z')).toBe(true);
    expect(isValidRRule('FREQ=MONTHLY;BYMONTHDAY=15', '2026-06-15T00:00:00.000Z')).toBe(true);
  });

  test('無効な RRULE → false', () => {
    expect(isValidRRule('INVALID', '2026-06-15T00:00:00.000Z')).toBe(false);
    expect(isValidRRule('FREQ=BAD', '2026-06-15T00:00:00.000Z')).toBe(false);
  });

  test('空文字列 → false', () => {
    expect(isValidRRule('', '2026-06-15T00:00:00.000Z')).toBe(false);
  });
});

describe('RECURRENCE_PRESETS (6 preset 定義整合)', () => {
  test('6 種類すべて定義されている (ADR-0056 D4)', () => {
    expect(Object.keys(RECURRENCE_PRESETS)).toHaveLength(6);
    expect(RECURRENCE_PRESETS.daily).toBe('FREQ=DAILY');
    expect(RECURRENCE_PRESETS.weeklyMonday).toBe('FREQ=WEEKLY;BYDAY=MO');
    expect(RECURRENCE_PRESETS.weekly).toBe('FREQ=WEEKLY');
    expect(RECURRENCE_PRESETS.biweekly).toBe('FREQ=WEEKLY;INTERVAL=2');
    expect(RECURRENCE_PRESETS.monthly).toBe('FREQ=MONTHLY');
    expect(RECURRENCE_PRESETS.every3Months).toBe('FREQ=MONTHLY;INTERVAL=3');
  });

  test('全 preset が isValidRRule で 有効', () => {
    const start = '2026-06-15T00:00:00.000Z';
    for (const rrule of Object.values(RECURRENCE_PRESETS)) {
      expect(isValidRRule(rrule, start)).toBe(true);
    }
  });
});
