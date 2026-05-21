/**
 * Sess22 ADR-0034 D2: dotsByDay 純関数 unit test。
 *
 * 5 case 検証:
 * 1. 同日複数同 type (異なる bonsai) → 1 type で size 1
 * 2. 同日 mixed (planned + logged) → 各 status で size 別々
 * 3. 4 種別 logged → size 4
 * 4. 空 events → Map size 0
 * 5. TZ 跨ぎ (UTC 23:59 のイベントが JST で翌日扱い)
 */
import { computeDotsByDay } from '@/src/features/plan/dotsByDay';
import { type Event } from '@/src/db/schema';

function mkEvent(overrides: Partial<Event>): Event {
  return {
    id: 'e-1',
    bonsaiId: 'b-1',
    type: 'watering',
    status: 'logged',
    occurredAtUtc: '2026-05-21T03:00:00.000Z',
    occurredAtTzOffsetMin: 540,
    payload: null,
    note: null,
    createdAtUtc: '2026-05-21T03:00:00.000Z',
    updatedAtUtc: '2026-05-21T03:00:00.000Z',
    ...overrides,
  } as Event;
}

describe('computeDotsByDay (Sess22 ADR-0034 D2)', () => {
  const JST = 540; // UTC+9

  test('case 1: 同日 watering ×3 (異なる bonsai) → loggedTypes.size = 1', () => {
    const events = [
      mkEvent({
        id: 'e-1',
        bonsaiId: 'b-1',
        type: 'watering',
        occurredAtUtc: '2026-05-21T03:00:00.000Z',
      }),
      mkEvent({
        id: 'e-2',
        bonsaiId: 'b-2',
        type: 'watering',
        occurredAtUtc: '2026-05-21T04:00:00.000Z',
      }),
      mkEvent({
        id: 'e-3',
        bonsaiId: 'b-3',
        type: 'watering',
        occurredAtUtc: '2026-05-21T05:00:00.000Z',
      }),
    ];
    const map = computeDotsByDay(events, JST);
    const entry = map.get('2026-05-21');
    expect(entry).toBeDefined();
    expect(entry!.loggedTypes.size).toBe(1);
    expect(entry!.loggedTypes.has('watering')).toBe(true);
    expect(entry!.plannedTypes.size).toBe(0);
  });

  test('case 2: 同日 mixed (planned 1 + logged 2 種別) → 各 status で size 別々', () => {
    const events = [
      mkEvent({
        id: 'e-1',
        type: 'watering',
        status: 'logged',
        occurredAtUtc: '2026-05-21T03:00:00.000Z',
      }),
      mkEvent({
        id: 'e-2',
        type: 'fertilizing',
        status: 'logged',
        occurredAtUtc: '2026-05-21T04:00:00.000Z',
      }),
      mkEvent({
        id: 'e-3',
        type: 'pruning',
        status: 'planned',
        occurredAtUtc: '2026-05-21T05:00:00.000Z',
      }),
    ];
    const map = computeDotsByDay(events, JST);
    const entry = map.get('2026-05-21')!;
    expect(entry.loggedTypes.size).toBe(2);
    expect(entry.loggedTypes.has('watering')).toBe(true);
    expect(entry.loggedTypes.has('fertilizing')).toBe(true);
    expect(entry.plannedTypes.size).toBe(1);
    expect(entry.plannedTypes.has('pruning')).toBe(true);
  });

  test('case 3: 4 種別 logged → size 4 (「+」表示判定の元データ)', () => {
    const events = [
      mkEvent({ id: 'e-1', type: 'watering', status: 'logged' }),
      mkEvent({ id: 'e-2', type: 'fertilizing', status: 'logged' }),
      mkEvent({ id: 'e-3', type: 'pruning', status: 'logged' }),
      mkEvent({ id: 'e-4', type: 'wiring', status: 'logged' }),
    ];
    const map = computeDotsByDay(events, JST);
    const entry = map.get('2026-05-21')!;
    expect(entry.loggedTypes.size).toBe(4);
  });

  test('case 4: 空 events → Map size 0', () => {
    const map = computeDotsByDay([], JST);
    expect(map.size).toBe(0);
  });

  test('case 5: TZ 跨ぎ (UTC 23:59 が JST で翌日 08:59 扱い)', () => {
    const events = [
      mkEvent({
        id: 'e-1',
        type: 'watering',
        status: 'logged',
        occurredAtUtc: '2026-05-21T23:30:00.000Z',
      }),
    ];
    const map = computeDotsByDay(events, JST);
    // JST = UTC+9 → 2026-05-21T23:30 UTC = 2026-05-22T08:30 JST
    expect(map.get('2026-05-22')).toBeDefined();
    expect(map.get('2026-05-21')).toBeUndefined();
  });
});
