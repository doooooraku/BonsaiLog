/**
 * Issue #440 Phase 1: 連続日 event グルーピングの純関数 test。
 */
import {
  groupContinuousEvents,
  groupContinuousEventsAsc,
  prevDay,
} from '@/src/features/event/groupContinuousEvents';
import type { Event } from '@/src/db/schema';

function makeEvent(id: string, type: string, occurredAtLocal: string): Event {
  // 'YYYY-MM-DDTHH:mm:ss' をそのまま UTC として扱う (test 用の単純化)。
  return {
    id,
    bonsaiId: 'bonsai-1',
    type: type as Event['type'],
    status: 'logged',
    occurredAtUtc: `${occurredAtLocal}Z`,
    note: null,
    payloadJson: null,
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    syncStatus: 'synced',
  } as unknown as Event;
}

describe('prevDay', () => {
  it('1 日前を返す', () => {
    expect(prevDay('2026-05-11')).toBe('2026-05-10');
  });
  it('月をまたぐ', () => {
    expect(prevDay('2026-05-01')).toBe('2026-04-30');
  });
  it('年をまたぐ', () => {
    expect(prevDay('2026-01-01')).toBe('2025-12-31');
  });
  it('2月末閏年でない', () => {
    expect(prevDay('2026-03-01')).toBe('2026-02-28');
  });
});

describe('groupContinuousEvents', () => {
  // tz=0 (UTC) で簡単化
  const tz = 0;

  it('空配列は空配列を返す', () => {
    expect(groupContinuousEvents([], tz)).toEqual([]);
  });

  it('1 件は single 1 つ', () => {
    const ev = makeEvent('e1', 'watering', '2026-05-11T08:00:00');
    const result = groupContinuousEvents([ev], tz);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ kind: 'single', event: ev });
  });

  it('連続 3 日 同 type は group', () => {
    // 降順入力: 5/11, 5/10, 5/9
    const e1 = makeEvent('e1', 'watering', '2026-05-11T08:00:00');
    const e2 = makeEvent('e2', 'watering', '2026-05-10T08:00:00');
    const e3 = makeEvent('e3', 'watering', '2026-05-09T08:00:00');
    const result = groupContinuousEvents([e1, e2, e3], tz);
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('group');
    if (result[0].kind === 'group') {
      expect(result[0].type).toBe('watering');
      expect(result[0].events).toHaveLength(3);
      expect(result[0].startDate).toBe('2026-05-09');
      expect(result[0].endDate).toBe('2026-05-11');
    }
  });

  it('同日複数 + 翌日は同一 group', () => {
    // 5/11 朝 + 5/11 夕 + 5/10
    const e1 = makeEvent('e1', 'watering', '2026-05-11T18:00:00');
    const e2 = makeEvent('e2', 'watering', '2026-05-11T08:00:00');
    const e3 = makeEvent('e3', 'watering', '2026-05-10T08:00:00');
    const result = groupContinuousEvents([e1, e2, e3], tz);
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('group');
    if (result[0].kind === 'group') {
      expect(result[0].events).toHaveLength(3);
      expect(result[0].startDate).toBe('2026-05-10');
      expect(result[0].endDate).toBe('2026-05-11');
    }
  });

  it('間に違う type が入ったら 2 group', () => {
    const e1 = makeEvent('e1', 'watering', '2026-05-11T08:00:00');
    const e2 = makeEvent('e2', 'pruning', '2026-05-10T08:00:00');
    const e3 = makeEvent('e3', 'watering', '2026-05-09T08:00:00');
    const result = groupContinuousEvents([e1, e2, e3], tz);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ kind: 'single', event: e1 });
    expect(result[1]).toEqual({ kind: 'single', event: e2 });
    expect(result[2]).toEqual({ kind: 'single', event: e3 });
  });

  it('連続 2 日 同 type + 1 日空き + 同 type = 別 group', () => {
    // 5/11 + 5/10 + 5/8 (5/9 が空)
    const e1 = makeEvent('e1', 'watering', '2026-05-11T08:00:00');
    const e2 = makeEvent('e2', 'watering', '2026-05-10T08:00:00');
    const e3 = makeEvent('e3', 'watering', '2026-05-08T08:00:00');
    const result = groupContinuousEvents([e1, e2, e3], tz);
    expect(result).toHaveLength(2);
    expect(result[0].kind).toBe('group');
    if (result[0].kind === 'group') {
      expect(result[0].events).toHaveLength(2);
      expect(result[0].startDate).toBe('2026-05-10');
      expect(result[0].endDate).toBe('2026-05-11');
    }
    expect(result[1]).toEqual({ kind: 'single', event: e3 });
  });

  it('複数 type 混在で順序を保つ', () => {
    // 5/11 watering, 5/10 watering, 5/9 watering, 5/5 pruning, 5/1 watering
    const e1 = makeEvent('e1', 'watering', '2026-05-11T08:00:00');
    const e2 = makeEvent('e2', 'watering', '2026-05-10T08:00:00');
    const e3 = makeEvent('e3', 'watering', '2026-05-09T08:00:00');
    const e4 = makeEvent('e4', 'pruning', '2026-05-05T08:00:00');
    const e5 = makeEvent('e5', 'watering', '2026-05-01T08:00:00');
    const result = groupContinuousEvents([e1, e2, e3, e4, e5], tz);
    expect(result).toHaveLength(3);
    // 1st: water group (3 件)
    expect(result[0].kind).toBe('group');
    if (result[0].kind === 'group') {
      expect(result[0].events).toHaveLength(3);
    }
    // 2nd: pruning single
    expect(result[1]).toEqual({ kind: 'single', event: e4 });
    // 3rd: watering single (5/1)
    expect(result[2]).toEqual({ kind: 'single', event: e5 });
  });
});

describe('groupContinuousEventsAsc', () => {
  const tz = 0;

  it('空配列は空配列を返す', () => {
    expect(groupContinuousEventsAsc([], tz)).toEqual([]);
  });

  it('昇順入力 連続 3 日 同 type は group + group 内 events も asc', () => {
    // 昇順入力: 5/9, 5/10, 5/11
    const e1 = makeEvent('e1', 'watering', '2026-05-09T08:00:00');
    const e2 = makeEvent('e2', 'watering', '2026-05-10T08:00:00');
    const e3 = makeEvent('e3', 'watering', '2026-05-11T08:00:00');
    const result = groupContinuousEventsAsc([e1, e2, e3], tz);
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('group');
    if (result[0].kind === 'group') {
      expect(result[0].events).toEqual([e1, e2, e3]); // asc 維持
      expect(result[0].startDate).toBe('2026-05-09');
      expect(result[0].endDate).toBe('2026-05-11');
    }
  });

  it('昇順入力 複数 group の順序が時系列維持', () => {
    // 5/1 watering, 5/5 pruning, 5/9 + 5/10 watering
    const e1 = makeEvent('e1', 'watering', '2026-05-01T08:00:00');
    const e2 = makeEvent('e2', 'pruning', '2026-05-05T08:00:00');
    const e3 = makeEvent('e3', 'watering', '2026-05-09T08:00:00');
    const e4 = makeEvent('e4', 'watering', '2026-05-10T08:00:00');
    const result = groupContinuousEventsAsc([e1, e2, e3, e4], tz);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ kind: 'single', event: e1 });
    expect(result[1]).toEqual({ kind: 'single', event: e2 });
    expect(result[2].kind).toBe('group');
    if (result[2].kind === 'group') {
      expect(result[2].events).toEqual([e3, e4]);
    }
  });
});
