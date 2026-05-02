/**
 * F-16 当日まとめ通知 純関数テスト (Issue #30 / ADR-0014)。
 *
 * 検証範囲:
 * - localDateKeyFromUtc: TZ オフセットによるローカル日キー導出
 * - parseLocalDateKey / addLocalDay: 日付文字列の入出力
 * - buildSummaryFireDate: ローカル時刻 → UTC 変換
 * - aggregateByLocalDay: events 集計 (重複日付の加算)
 * - buildSummarySchedules: 7 日ローリング、0 件の日除外、過去除外
 */
import {
  addLocalDay,
  aggregateByLocalDay,
  buildSummaryFireDate,
  buildSummarySchedules,
  localDateKeyFromUtc,
  parseLocalDateKey,
  SUMMARY_IDENTIFIER_PREFIX,
  SUMMARY_ROLLING_DAYS,
} from '../../../src/features/notification/dailySummary';

describe('localDateKeyFromUtc', () => {
  test('JST (+540) で UTC 22:00 は翌日のローカル日', () => {
    // UTC 2026-05-01 22:00 + 9h = JST 2026-05-02 07:00
    expect(localDateKeyFromUtc('2026-05-01T22:00:00.000Z', 540)).toBe('2026-05-02');
  });

  test('UTC オフセット 0 ならそのまま日付', () => {
    expect(localDateKeyFromUtc('2026-05-02T01:30:00.000Z', 0)).toBe('2026-05-02');
  });

  test('PST (-480) で UTC 03:00 は前日のローカル日', () => {
    // UTC 2026-05-02 03:00 - 8h = PST 2026-05-01 19:00
    expect(localDateKeyFromUtc('2026-05-02T03:00:00.000Z', -480)).toBe('2026-05-01');
  });

  test('不正 ISO は空文字', () => {
    expect(localDateKeyFromUtc('not-a-date', 540)).toBe('');
  });
});

describe('parseLocalDateKey', () => {
  test('正常入力', () => {
    expect(parseLocalDateKey('2026-05-02')).toEqual({ year: 2026, month: 5, day: 2 });
  });

  test('範囲外月日は null', () => {
    expect(parseLocalDateKey('2026-13-01')).toBeNull();
    expect(parseLocalDateKey('2026-05-32')).toBeNull();
  });

  test('形式不正は null', () => {
    expect(parseLocalDateKey('2026/05/02')).toBeNull();
    expect(parseLocalDateKey('20260502')).toBeNull();
  });
});

describe('addLocalDay', () => {
  test('翌日', () => {
    expect(addLocalDay('2026-05-02', 1)).toBe('2026-05-03');
  });

  test('月跨ぎ', () => {
    expect(addLocalDay('2026-05-31', 1)).toBe('2026-06-01');
  });

  test('年跨ぎ', () => {
    expect(addLocalDay('2026-12-31', 1)).toBe('2027-01-01');
  });

  test('閏年: 2028-02-28 + 1 = 2028-02-29', () => {
    expect(addLocalDay('2028-02-28', 1)).toBe('2028-02-29');
  });

  test('不正入力は空文字', () => {
    expect(addLocalDay('invalid', 1)).toBe('');
  });
});

describe('buildSummaryFireDate', () => {
  test('JST (+540) で 2026-05-02 07:00 → UTC 2026-05-01 22:00', () => {
    const fire = buildSummaryFireDate({ year: 2026, month: 5, day: 2 }, 7, 0, 540);
    expect(fire.toISOString()).toBe('2026-05-01T22:00:00.000Z');
  });

  test('UTC (0) で 2026-05-02 07:00 → UTC 2026-05-02 07:00', () => {
    const fire = buildSummaryFireDate({ year: 2026, month: 5, day: 2 }, 7, 0, 0);
    expect(fire.toISOString()).toBe('2026-05-02T07:00:00.000Z');
  });

  test('PST (-480) で 2026-05-02 07:00 → UTC 2026-05-02 15:00', () => {
    const fire = buildSummaryFireDate({ year: 2026, month: 5, day: 2 }, 7, 0, -480);
    expect(fire.toISOString()).toBe('2026-05-02T15:00:00.000Z');
  });
});

describe('aggregateByLocalDay', () => {
  test('同じローカル日の events を合算', () => {
    const events = [
      { occurredAtUtc: '2026-05-01T22:00:00.000Z', tzOffsetMin: 540 },
      { occurredAtUtc: '2026-05-02T01:00:00.000Z', tzOffsetMin: 540 },
      { occurredAtUtc: '2026-05-02T08:00:00.000Z', tzOffsetMin: 540 },
    ];
    const result = aggregateByLocalDay(events);
    expect(result['2026-05-02']).toBe(3);
  });

  test('別日は別キー', () => {
    const events = [
      { occurredAtUtc: '2026-05-01T01:00:00.000Z', tzOffsetMin: 540 },
      { occurredAtUtc: '2026-05-02T01:00:00.000Z', tzOffsetMin: 540 },
    ];
    const result = aggregateByLocalDay(events);
    expect(result['2026-05-01']).toBe(1);
    expect(result['2026-05-02']).toBe(1);
  });

  test('空配列は空オブジェクト', () => {
    expect(aggregateByLocalDay([])).toEqual({});
  });
});

describe('buildSummarySchedules', () => {
  test('当日 + 6 日先まで予約 (ROLLING_DAYS = 7)', () => {
    expect(SUMMARY_ROLLING_DAYS).toBe(7);
    const byDate: Record<string, number> = {};
    for (let i = 0; i < SUMMARY_ROLLING_DAYS; i += 1) {
      const dateKey = addLocalDay('2026-05-02', i);
      byDate[dateKey] = 1;
    }
    // nowMs = 2026-05-02 06:00 JST = 2026-05-01 21:00 UTC
    const nowMs = Date.UTC(2026, 4, 1, 21, 0, 0); // = JST 2026-05-02 06:00
    const result = buildSummarySchedules(byDate, '2026-05-02', 7, 0, 540, nowMs);
    expect(result).toHaveLength(SUMMARY_ROLLING_DAYS);
  });

  test('0 件の日は通知をスキップ (ADR-0014 §21.3.3)', () => {
    const byDate = {
      '2026-05-02': 3,
      '2026-05-04': 2,
      // 2026-05-03 は 0 件
    };
    const nowMs = Date.UTC(2026, 4, 1, 21, 0, 0);
    const result = buildSummarySchedules(byDate, '2026-05-02', 7, 0, 540, nowMs);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.dateKey)).toEqual(['2026-05-02', '2026-05-04']);
  });

  test('過去日時はスキップ (現在 12:00 JST、当日 7:00 はもう過ぎた)', () => {
    const byDate = { '2026-05-02': 5 };
    // 現在 = JST 2026-05-02 12:00 = UTC 2026-05-02 03:00
    const nowMs = Date.UTC(2026, 4, 2, 3, 0, 0);
    const result = buildSummarySchedules(byDate, '2026-05-02', 7, 0, 540, nowMs);
    expect(result).toHaveLength(0);
  });

  test('identifier prefix と件数を保持', () => {
    const byDate = { '2026-05-03': 4 };
    const nowMs = Date.UTC(2026, 4, 1, 21, 0, 0);
    const result = buildSummarySchedules(byDate, '2026-05-02', 7, 0, 540, nowMs);
    expect(result).toEqual([
      expect.objectContaining({
        identifier: `${SUMMARY_IDENTIFIER_PREFIX}2026-05-03`,
        dateKey: '2026-05-03',
        count: 4,
      }),
    ]);
  });

  test('rolling 範囲外 (8 日先) は除外', () => {
    const byDate = {
      '2026-05-02': 1,
      '2026-05-09': 1, // 7 日後 (out of range, 0..6)
    };
    const nowMs = Date.UTC(2026, 4, 1, 21, 0, 0);
    const result = buildSummarySchedules(byDate, '2026-05-02', 7, 0, 540, nowMs);
    expect(result.map((r) => r.dateKey)).toEqual(['2026-05-02']);
  });
});
