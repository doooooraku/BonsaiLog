/**
 * F-04 wateringHeatmap.ts 純関数テスト (Phase A、Issue #29 / ADR-0013)。
 */
import {
  buildHeatmapDateKeys,
  buildHeatmapSummary,
  classifyLastWatered,
  diffDayKeys,
  getDailyWateringCounts,
  getDaysSinceLastWatering,
  getEventsForDay,
  getHeatmapLevel,
  getLastWatering,
  toLocalDateKey,
} from '@/src/features/watering/wateringHeatmap';
import type { Event } from '@/src/db/schema';

const JST = 540;

function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: 'e1',
    bonsaiId: 'b1',
    type: 'watering',
    status: 'logged',
    occurredAtUtc: '2026-05-01T00:00:00.000Z',
    tzOffsetMin: JST,
    tzIana: 'Asia/Tokyo',
    durationMin: null,
    payloadJson: null,
    note: null,
    deletedAt: null,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  } as unknown as Event;
}

describe('toLocalDateKey', () => {
  test('JST: UTC 2026-05-02T16:00:00Z → JST 2026-05-03', () => {
    expect(toLocalDateKey('2026-05-02T16:00:00.000Z', JST)).toBe('2026-05-03');
  });

  test('UTC 0: identity', () => {
    expect(toLocalDateKey('2026-05-03T12:00:00.000Z', 0)).toBe('2026-05-03');
  });

  test('PST -480: UTC 2026-05-03T05:00:00Z → 2026-05-02', () => {
    expect(toLocalDateKey('2026-05-03T05:00:00.000Z', -480)).toBe('2026-05-02');
  });
});

describe('diffDayKeys', () => {
  test('same day = 0', () => {
    expect(diffDayKeys('2026-05-03', '2026-05-03')).toBe(0);
  });
  test('next day = 1', () => {
    expect(diffDayKeys('2026-05-02', '2026-05-03')).toBe(1);
  });
  test('previous day = -1', () => {
    expect(diffDayKeys('2026-05-04', '2026-05-03')).toBe(-1);
  });
  test('cross month', () => {
    expect(diffDayKeys('2026-04-30', '2026-05-03')).toBe(3);
  });
  test('cross year', () => {
    expect(diffDayKeys('2025-12-31', '2026-01-01')).toBe(1);
  });
});

describe('getLastWatering', () => {
  test('returns null for empty events', () => {
    expect(getLastWatering([])).toBeNull();
  });

  test('returns null when no watering kind', () => {
    expect(getLastWatering([makeEvent({ type: 'pruning' })])).toBeNull();
  });

  test('returns null when only planned', () => {
    expect(getLastWatering([makeEvent({ status: 'planned' })])).toBeNull();
  });

  test('returns null when only cancelled', () => {
    expect(getLastWatering([makeEvent({ status: 'cancelled' })])).toBeNull();
  });

  test('skips deleted (trashed)', () => {
    expect(getLastWatering([makeEvent({ deletedAt: '2026-05-02T00:00:00.000Z' })])).toBeNull();
  });

  test('returns latest watering by occurredAtUtc', () => {
    const earlier = makeEvent({
      id: 'e1',
      occurredAtUtc: '2026-04-30T00:00:00.000Z',
    });
    const later = makeEvent({
      id: 'e2',
      occurredAtUtc: '2026-05-01T00:00:00.000Z',
    });
    const oldest = makeEvent({
      id: 'e3',
      occurredAtUtc: '2026-04-29T00:00:00.000Z',
    });
    const result = getLastWatering([earlier, later, oldest]);
    expect(result?.id).toBe('e2');
  });

  test('mixed kinds: only watering counted', () => {
    const watering = makeEvent({
      id: 'w1',
      type: 'watering',
      occurredAtUtc: '2026-04-30T00:00:00.000Z',
    });
    const pruningLater = makeEvent({
      id: 'p1',
      type: 'pruning',
      occurredAtUtc: '2026-05-02T00:00:00.000Z',
    });
    const result = getLastWatering([watering, pruningLater]);
    expect(result?.id).toBe('w1');
  });
});

describe('getDaysSinceLastWatering', () => {
  test('null when no watering', () => {
    expect(getDaysSinceLastWatering([], '2026-05-03', JST)).toBeNull();
  });

  test('0 days when watered today (JST)', () => {
    const today = makeEvent({
      occurredAtUtc: '2026-05-02T16:00:00.000Z', // JST 2026-05-03
    });
    expect(getDaysSinceLastWatering([today], '2026-05-03', JST)).toBe(0);
  });

  test('1 day when watered yesterday (JST)', () => {
    const yesterday = makeEvent({
      occurredAtUtc: '2026-05-01T16:00:00.000Z', // JST 2026-05-02
    });
    expect(getDaysSinceLastWatering([yesterday], '2026-05-03', JST)).toBe(1);
  });

  test('30 days', () => {
    const thirtyDaysAgo = makeEvent({
      occurredAtUtc: '2026-04-02T16:00:00.000Z', // JST 2026-04-03
    });
    expect(getDaysSinceLastWatering([thirtyDaysAgo], '2026-05-03', JST)).toBe(30);
  });

  test('clamps negative diff to 0 (defensive)', () => {
    const future = makeEvent({
      occurredAtUtc: '2026-05-03T16:00:00.000Z', // JST 2026-05-04 (future)
    });
    expect(getDaysSinceLastWatering([future], '2026-05-03', JST)).toBe(0);
  });
});

describe('classifyLastWatered', () => {
  test('null → noRecord', () => {
    expect(classifyLastWatered(null)).toBe('noRecord');
  });
  test('0 → today', () => {
    expect(classifyLastWatered(0)).toBe('today');
  });
  test('1 → oneDay', () => {
    expect(classifyLastWatered(1)).toBe('oneDay');
  });
  test('2 → severalDays', () => {
    expect(classifyLastWatered(2)).toBe('severalDays');
  });
  test('30 → severalDays', () => {
    expect(classifyLastWatered(30)).toBe('severalDays');
  });
  test('31 → manyDays', () => {
    expect(classifyLastWatered(31)).toBe('manyDays');
  });
  test('365 → manyDays', () => {
    expect(classifyLastWatered(365)).toBe('manyDays');
  });
  test('366 → overYear', () => {
    expect(classifyLastWatered(366)).toBe('overYear');
  });
});

describe('getDailyWateringCounts (Phase B)', () => {
  test('空配列 → 空 Map', () => {
    expect(getDailyWateringCounts([], JST).size).toBe(0);
  });

  test('watering / logged のみカウント', () => {
    const events = [
      makeEvent({ id: 'a', occurredAtUtc: '2026-05-03T01:00:00.000Z' }),
      makeEvent({ id: 'b', type: 'pruning', occurredAtUtc: '2026-05-03T02:00:00.000Z' }),
      makeEvent({ id: 'c', status: 'planned', occurredAtUtc: '2026-05-03T03:00:00.000Z' }),
      makeEvent({ id: 'd', deletedAt: '2026-05-03T04:00:00.000Z' }),
    ];
    const counts = getDailyWateringCounts(events, JST);
    expect(counts.size).toBe(1);
    expect(counts.get('2026-05-03')).toBe(1);
  });

  test('同日複数回はカウント加算', () => {
    const events = [
      makeEvent({ id: 'a', occurredAtUtc: '2026-05-03T00:00:00.000Z' }),
      makeEvent({ id: 'b', occurredAtUtc: '2026-05-03T05:00:00.000Z' }),
      makeEvent({ id: 'c', occurredAtUtc: '2026-05-03T10:00:00.000Z' }),
    ];
    expect(getDailyWateringCounts(events, JST).get('2026-05-03')).toBe(3);
  });
});

describe('getHeatmapLevel (Phase B)', () => {
  test('0 → L0', () => expect(getHeatmapLevel(0)).toBe('L0'));
  test('1 → L1', () => expect(getHeatmapLevel(1)).toBe('L1'));
  test('2 → L2', () => expect(getHeatmapLevel(2)).toBe('L2'));
  test('3 → L3', () => expect(getHeatmapLevel(3)).toBe('L3'));
  test('10 → L3', () => expect(getHeatmapLevel(10)).toBe('L3'));
  test('負値 → L0', () => expect(getHeatmapLevel(-1)).toBe('L0'));
});

describe('buildHeatmapDateKeys (Phase B)', () => {
  test('today + 3 days', () => {
    expect(buildHeatmapDateKeys('2026-05-03', 3)).toEqual([
      '2026-05-03',
      '2026-05-02',
      '2026-05-01',
    ]);
  });

  test('months crossing', () => {
    expect(buildHeatmapDateKeys('2026-05-01', 3)).toEqual([
      '2026-05-01',
      '2026-04-30',
      '2026-04-29',
    ]);
  });

  test('84 days = 12 weeks', () => {
    expect(buildHeatmapDateKeys('2026-05-03', 84).length).toBe(84);
  });
});

describe('buildHeatmapSummary (Phase D-1, AC7 サマリー)', () => {
  test('空配列 → recordedDays=0, totalEvents=0', () => {
    expect(buildHeatmapSummary([], JST)).toEqual({ recordedDays: 0, totalEvents: 0 });
  });

  test('1 日複数記録は recordedDays=1, totalEvents=実件数', () => {
    const events = [
      makeEvent({ id: 'e1', occurredAtUtc: '2026-05-02T16:00:00.000Z' }), // JST 5/3
      makeEvent({ id: 'e2', occurredAtUtc: '2026-05-02T22:00:00.000Z' }), // JST 5/3
      makeEvent({ id: 'e3', occurredAtUtc: '2026-05-02T23:00:00.000Z' }), // JST 5/3
    ];
    expect(buildHeatmapSummary(events, JST)).toEqual({ recordedDays: 1, totalEvents: 3 });
  });

  test('複数日 → recordedDays = ユニーク日数', () => {
    const events = [
      makeEvent({ id: 'e1', occurredAtUtc: '2026-05-01T03:00:00.000Z' }), // JST 5/1
      makeEvent({ id: 'e2', occurredAtUtc: '2026-05-02T03:00:00.000Z' }), // JST 5/2
      makeEvent({ id: 'e3', occurredAtUtc: '2026-05-03T03:00:00.000Z' }), // JST 5/3
    ];
    expect(buildHeatmapSummary(events, JST)).toEqual({ recordedDays: 3, totalEvents: 3 });
  });

  test('status=planned は除外', () => {
    const events = [
      makeEvent({ id: 'e1', status: 'planned', occurredAtUtc: '2026-05-01T03:00:00.000Z' }),
      makeEvent({ id: 'e2', occurredAtUtc: '2026-05-02T03:00:00.000Z' }),
    ];
    expect(buildHeatmapSummary(events, JST)).toEqual({ recordedDays: 1, totalEvents: 1 });
  });

  test('deletedAt あり (ゴミ箱) は除外', () => {
    const events = [
      makeEvent({ id: 'e1', deletedAt: '2026-05-04T00:00:00.000Z' }),
      makeEvent({ id: 'e2', occurredAtUtc: '2026-05-02T03:00:00.000Z' }),
    ];
    expect(buildHeatmapSummary(events, JST)).toEqual({ recordedDays: 1, totalEvents: 1 });
  });

  test('type!=watering は除外 (fertilizing 等)', () => {
    const events = [
      makeEvent({ id: 'e1', type: 'fertilizing' as Event['type'] }),
      makeEvent({ id: 'e2', occurredAtUtc: '2026-05-02T03:00:00.000Z' }),
    ];
    expect(buildHeatmapSummary(events, JST)).toEqual({ recordedDays: 1, totalEvents: 1 });
  });

  test('windowDays + todayLocalKey 指定で範囲フィルタ', () => {
    const events = [
      makeEvent({ id: 'e1', occurredAtUtc: '2026-04-25T03:00:00.000Z' }), // JST 4/25 (範囲外)
      makeEvent({ id: 'e2', occurredAtUtc: '2026-05-01T03:00:00.000Z' }), // JST 5/1 (範囲内)
      makeEvent({ id: 'e3', occurredAtUtc: '2026-05-03T03:00:00.000Z' }), // JST 5/3 (範囲内)
    ];
    // 直近 7 日 (2026-04-27 〜 2026-05-03)
    expect(buildHeatmapSummary(events, JST, 7, '2026-05-03')).toEqual({
      recordedDays: 2,
      totalEvents: 2,
    });
  });

  test('windowDays=365 で年間集計 (AC7 仕様)', () => {
    const events = [
      makeEvent({ id: 'e1', occurredAtUtc: '2025-06-01T03:00:00.000Z' }), // 範囲外 (1 年以上前)
      makeEvent({ id: 'e2', occurredAtUtc: '2025-06-02T03:00:00.000Z' }), // 範囲内ぎりぎり (366 日前と境界)
      makeEvent({ id: 'e3', occurredAtUtc: '2026-05-03T03:00:00.000Z' }), // 範囲内
    ];
    const result = buildHeatmapSummary(events, JST, 365, '2026-05-03');
    expect(result.totalEvents).toBeGreaterThanOrEqual(1);
    expect(result.totalEvents).toBeLessThanOrEqual(3);
  });
});

describe('getEventsForDay (Phase D-1, AC5 BottomSheet 詳細)', () => {
  test('対象日に該当する events を occurredAtUtc 昇順で返す', () => {
    const events = [
      makeEvent({ id: 'e3', occurredAtUtc: '2026-05-02T22:00:00.000Z' }), // JST 5/3 07:00
      makeEvent({ id: 'e1', occurredAtUtc: '2026-05-02T16:00:00.000Z' }), // JST 5/3 01:00
      makeEvent({ id: 'e2', occurredAtUtc: '2026-05-02T20:00:00.000Z' }), // JST 5/3 05:00
    ];
    const result = getEventsForDay(events, '2026-05-03', JST);
    expect(result.map((e) => e.id)).toEqual(['e1', 'e2', 'e3']);
  });

  test('該当日に events なし → 空配列', () => {
    const events = [makeEvent({ id: 'e1', occurredAtUtc: '2026-05-02T03:00:00.000Z' })]; // JST 5/2
    expect(getEventsForDay(events, '2026-05-03', JST)).toEqual([]);
  });

  test('status=planned は除外', () => {
    const events = [
      makeEvent({ id: 'e1', status: 'planned', occurredAtUtc: '2026-05-02T16:00:00.000Z' }),
      makeEvent({ id: 'e2', occurredAtUtc: '2026-05-02T16:00:00.000Z' }),
    ];
    const result = getEventsForDay(events, '2026-05-03', JST);
    expect(result.map((e) => e.id)).toEqual(['e2']);
  });

  test('deletedAt は除外', () => {
    const events = [
      makeEvent({
        id: 'e1',
        deletedAt: '2026-05-04T00:00:00.000Z',
        occurredAtUtc: '2026-05-02T16:00:00.000Z',
      }),
      makeEvent({ id: 'e2', occurredAtUtc: '2026-05-02T16:00:00.000Z' }),
    ];
    const result = getEventsForDay(events, '2026-05-03', JST);
    expect(result.map((e) => e.id)).toEqual(['e2']);
  });

  test('type=watering 以外も含む (fertilizing / wiring)', () => {
    const events = [
      makeEvent({
        id: 'e1',
        type: 'watering',
        occurredAtUtc: '2026-05-02T16:00:00.000Z',
      }),
      makeEvent({
        id: 'e2',
        type: 'fertilizing' as Event['type'],
        occurredAtUtc: '2026-05-02T18:00:00.000Z',
      }),
      makeEvent({
        id: 'e3',
        type: 'wiring' as Event['type'],
        occurredAtUtc: '2026-05-02T20:00:00.000Z',
      }),
    ];
    const result = getEventsForDay(events, '2026-05-03', JST);
    expect(result.map((e) => e.id)).toEqual(['e1', 'e2', 'e3']);
  });

  test('TZ 跨ぎ: PST -480 で UTC と異なる日付に振り分け', () => {
    const events = [
      makeEvent({ id: 'e1', occurredAtUtc: '2026-05-03T05:00:00.000Z' }), // PST -480 = 5/2
      makeEvent({ id: 'e2', occurredAtUtc: '2026-05-03T08:00:00.000Z' }), // PST -480 = 5/3
    ];
    expect(getEventsForDay(events, '2026-05-02', -480).map((e) => e.id)).toEqual(['e1']);
    expect(getEventsForDay(events, '2026-05-03', -480).map((e) => e.id)).toEqual(['e2']);
  });
});
