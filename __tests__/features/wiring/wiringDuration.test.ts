/**
 * F-07 wiringDuration.ts 純関数テスト (Phase A、Issue #24 / ADR-0011)。
 */
import {
  classifyWiringDuration,
  DEFAULT_WIRING_OVERDUE_THRESHOLD_DAYS,
  getDaysSinceWired,
  getScheduledUnwireAt,
  getWeeksSinceWired,
  validateScheduledUnwireAt,
} from '@/src/features/wiring/wiringDuration';
import type { Event } from '@/src/db/schema';

function makeWiringEvent(overrides: Partial<Event>): Event {
  return {
    id: 'w1',
    bonsaiId: 'b1',
    type: 'wiring',
    status: 'logged',
    occurredAtUtc: '2026-04-01T00:00:00.000Z',
    tzOffsetMin: 540,
    tzIana: 'Asia/Tokyo',
    durationMin: null,
    payloadJson: null,
    note: null,
    deletedAt: null,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  } as unknown as Event;
}

describe('getDaysSinceWired', () => {
  test('0 days when wired today', () => {
    const today = new Date('2026-05-03T00:00:00.000Z');
    const event = makeWiringEvent({ occurredAtUtc: '2026-05-03T00:00:00.000Z' });
    expect(getDaysSinceWired(event, today)).toBe(0);
  });

  test('1 day after 24h', () => {
    const today = new Date('2026-05-04T00:00:00.000Z');
    const event = makeWiringEvent({ occurredAtUtc: '2026-05-03T00:00:00.000Z' });
    expect(getDaysSinceWired(event, today)).toBe(1);
  });

  test('42 days after 6 weeks', () => {
    const today = new Date('2026-05-13T00:00:00.000Z');
    const event = makeWiringEvent({ occurredAtUtc: '2026-04-01T00:00:00.000Z' });
    expect(getDaysSinceWired(event, today)).toBe(42);
  });

  test('clamps negative to 0 (defensive)', () => {
    const today = new Date('2026-04-01T00:00:00.000Z');
    const event = makeWiringEvent({ occurredAtUtc: '2026-05-01T00:00:00.000Z' });
    expect(getDaysSinceWired(event, today)).toBe(0);
  });
});

describe('getScheduledUnwireAt', () => {
  test('null when payload_json is null', () => {
    expect(getScheduledUnwireAt(makeWiringEvent({}))).toBeNull();
  });

  test('null when payload has no scheduled_unwire_at', () => {
    const event = makeWiringEvent({
      payloadJson: JSON.stringify({ wire_size_mm: 1.5 }),
    });
    expect(getScheduledUnwireAt(event)).toBeNull();
  });

  test('returns the ISO string when present', () => {
    const event = makeWiringEvent({
      payloadJson: JSON.stringify({ scheduled_unwire_at: '2026-06-01T00:00:00.000Z' }),
    });
    expect(getScheduledUnwireAt(event)).toBe('2026-06-01T00:00:00.000Z');
  });

  test('null when JSON parse fails', () => {
    const event = makeWiringEvent({ payloadJson: 'not-json' });
    expect(getScheduledUnwireAt(event)).toBeNull();
  });

  test('null when scheduled_unwire_at is empty string', () => {
    const event = makeWiringEvent({
      payloadJson: JSON.stringify({ scheduled_unwire_at: '' }),
    });
    expect(getScheduledUnwireAt(event)).toBeNull();
  });
});

describe('classifyWiringDuration', () => {
  test("default threshold = 42, so 41 → 'within'", () => {
    expect(classifyWiringDuration(41)).toBe('within');
  });

  test("default threshold = 42, so 42 → 'overdue'", () => {
    expect(classifyWiringDuration(42)).toBe('overdue');
  });

  test("default threshold = 42, so 100 → 'overdue'", () => {
    expect(classifyWiringDuration(100)).toBe('overdue');
  });

  test('custom threshold 30: 30 → overdue', () => {
    expect(classifyWiringDuration(30, 30)).toBe('overdue');
  });

  test('custom threshold 30: 29 → within', () => {
    expect(classifyWiringDuration(29, 30)).toBe('within');
  });

  test('threshold constant exposes 42 (6 weeks)', () => {
    expect(DEFAULT_WIRING_OVERDUE_THRESHOLD_DAYS).toBe(42);
  });
});

describe('getWeeksSinceWired (Phase B)', () => {
  test('0 日 → 0 週', () => {
    expect(getWeeksSinceWired(0)).toBe(0);
  });

  test('6 日 → 0 週 (1 週未満切り捨て)', () => {
    expect(getWeeksSinceWired(6)).toBe(0);
  });

  test('7 日 → 1 週', () => {
    expect(getWeeksSinceWired(7)).toBe(1);
  });

  test('42 日 → 6 週 (しきい値ちょうど)', () => {
    expect(getWeeksSinceWired(42)).toBe(6);
  });

  test('100 日 → 14 週', () => {
    expect(getWeeksSinceWired(100)).toBe(14);
  });

  test('負値は 0 にクランプ', () => {
    expect(getWeeksSinceWired(-5)).toBe(0);
  });
});

describe('validateScheduledUnwireAt (Phase D, Issue #24 任意項目バリデーション)', () => {
  const now = new Date('2026-05-03T12:00:00.000Z');

  test('null / undefined / 空文字列は OK (任意項目)', () => {
    expect(validateScheduledUnwireAt(null, now)).toBeNull();
    expect(validateScheduledUnwireAt(undefined, now)).toBeNull();
    expect(validateScheduledUnwireAt('', now)).toBeNull();
  });

  test('正常な未来日時 → null (エラーなし)', () => {
    expect(validateScheduledUnwireAt('2026-06-15T09:00:00.000Z', now)).toBeNull();
    expect(validateScheduledUnwireAt('2026-12-31T23:59:00.000Z', now)).toBeNull();
  });

  test('過去日時 → past_datetime', () => {
    expect(validateScheduledUnwireAt('2026-05-03T11:59:59.000Z', now)).toBe('past_datetime');
    expect(validateScheduledUnwireAt('2025-01-01T00:00:00.000Z', now)).toBe('past_datetime');
    expect(validateScheduledUnwireAt('1970-01-01T00:00:00.000Z', now)).toBe('past_datetime');
  });

  test('現在時刻ちょうど (=) は past_datetime ではない (now < parsed が条件)', () => {
    // parsedMs < nowMs の判定なので、parsedMs === nowMs はエラーなし
    expect(validateScheduledUnwireAt('2026-05-03T12:00:00.000Z', now)).toBeNull();
  });

  test('5 年超過 → too_far_future', () => {
    // now + 5 年 + 1 日 = 2031-05-04 (誤入力ガード対象)
    expect(validateScheduledUnwireAt('2031-05-05T00:00:00.000Z', now)).toBe('too_far_future');
    expect(validateScheduledUnwireAt('2099-12-31T00:00:00.000Z', now)).toBe('too_far_future');
  });

  test('5 年ちょうど境界 → null (5 年ぴったりは OK)', () => {
    // 5 年 = 5 * 365 日 = 1825 日後
    const fiveYearsLater = new Date(now.getTime() + 5 * 365 * 86_400_000);
    expect(validateScheduledUnwireAt(fiveYearsLater.toISOString(), now)).toBeNull();
  });

  test('不正フォーマット → invalid_format', () => {
    expect(validateScheduledUnwireAt('not a date', now)).toBe('invalid_format');
    expect(validateScheduledUnwireAt('abc', now)).toBe('invalid_format');
    expect(validateScheduledUnwireAt('2026-13-99T00:00:00Z', now)).toBe('invalid_format');
    // 注: '2026/05/03' は Date.parse() が受理するため (ローカル 0 時として解釈)
    // → now (12:00 Z) より前なので past_datetime と判定される (バリデーション層では適切な挙動)
    expect(validateScheduledUnwireAt('2026/05/03', now)).toBe('past_datetime');
  });

  test('入力型ガード (string 以外、null/undefined 以外) → invalid_format', () => {
    expect(validateScheduledUnwireAt(123 as unknown as string, now)).toBe('invalid_format');
    expect(validateScheduledUnwireAt({} as unknown as string, now)).toBe('invalid_format');
    expect(validateScheduledUnwireAt([] as unknown as string, now)).toBe('invalid_format');
  });

  test('Issue #24 シナリオ A: ユーザーが 1 ヶ月後を選択 → OK', () => {
    expect(validateScheduledUnwireAt('2026-06-03T12:00:00.000Z', now)).toBeNull();
  });

  test('Issue #24 シナリオ B: ユーザーが昨日を誤選択 → past_datetime', () => {
    expect(validateScheduledUnwireAt('2026-05-02T12:00:00.000Z', now)).toBe('past_datetime');
  });

  test('Issue #24 シナリオ C: DatePicker ローラー誤回転で 100 年後 → too_far_future', () => {
    expect(validateScheduledUnwireAt('2126-05-03T12:00:00.000Z', now)).toBe('too_far_future');
  });
});
