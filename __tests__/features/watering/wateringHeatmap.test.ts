/**
 * F-04 wateringHeatmap.ts 純関数テスト (Phase A、Issue #29 / ADR-0013)。
 */
import {
  classifyLastWatered,
  diffDayKeys,
  getDaysSinceLastWatering,
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
