/**
 * F-16 Phase D — F-02 連携 invalidator 純関数テスト (Issue #30 / ADR-0014)。
 *
 * AC8 (F-02 連携) を網羅:
 * - 追加 / 削除 / 変更時の影響日付検出
 * - 7 日ローリング (当日 + 6 日先) フィルタ
 */

import {
  RESCHEDULE_WINDOW_DAYS,
  extractAffectedDateKeys,
  filterUpcomingPlanned,
  shouldRescheduleSummary,
} from '@/src/features/notification/invalidator';

const JST = 540;

function makePlanned(id: string, occurredAtUtc: string, tzOffsetMin: number = JST) {
  return { id, occurredAtUtc, tzOffsetMin };
}

describe('RESCHEDULE_WINDOW_DAYS', () => {
  test('AC3-1 7 日 (当日 + 6 日先)', () => {
    expect(RESCHEDULE_WINDOW_DAYS).toBe(7);
  });
});

describe('extractAffectedDateKeys', () => {
  test('両方空 → 影響なし', () => {
    expect(extractAffectedDateKeys([], [])).toEqual(new Set());
  });

  test('追加のみ → その日付', () => {
    const before: { id: string; occurredAtUtc: string; tzOffsetMin: number }[] = [];
    const after = [makePlanned('e1', '2026-05-02T16:00:00.000Z')]; // JST 5/3
    expect(extractAffectedDateKeys(before, after)).toEqual(new Set(['2026-05-03']));
  });

  test('削除のみ → 旧日付', () => {
    const before = [makePlanned('e1', '2026-05-02T16:00:00.000Z')]; // JST 5/3
    const after: { id: string; occurredAtUtc: string; tzOffsetMin: number }[] = [];
    expect(extractAffectedDateKeys(before, after)).toEqual(new Set(['2026-05-03']));
  });

  test('時刻変更 → 旧日 + 新日 両方', () => {
    const before = [makePlanned('e1', '2026-05-02T16:00:00.000Z')]; // JST 5/3
    const after = [makePlanned('e1', '2026-05-04T16:00:00.000Z')]; // JST 5/5
    expect(extractAffectedDateKeys(before, after)).toEqual(new Set(['2026-05-03', '2026-05-05']));
  });

  test('TZ オフセット変更 → 旧日 + 新日 両方', () => {
    const before = [makePlanned('e1', '2026-05-03T05:00:00.000Z', JST)]; // JST 5/3
    const after = [makePlanned('e1', '2026-05-03T05:00:00.000Z', -480)]; // PST 5/2
    expect(extractAffectedDateKeys(before, after)).toEqual(new Set(['2026-05-03', '2026-05-02']));
  });

  test('変更なし (同一 id 同一値) → 影響なし', () => {
    const events = [makePlanned('e1', '2026-05-02T16:00:00.000Z')];
    expect(extractAffectedDateKeys(events, events)).toEqual(new Set());
  });

  test('複数追加 + 複数削除 + 1 件変更が混在', () => {
    const before = [
      makePlanned('keep', '2026-05-02T16:00:00.000Z'), // JST 5/3 (変更なし)
      makePlanned('remove1', '2026-05-03T16:00:00.000Z'), // JST 5/4 削除
      makePlanned('remove2', '2026-05-04T16:00:00.000Z'), // JST 5/5 削除
      makePlanned('change', '2026-05-05T16:00:00.000Z'), // JST 5/6 → 5/7
    ];
    const after = [
      makePlanned('keep', '2026-05-02T16:00:00.000Z'),
      makePlanned('change', '2026-05-06T16:00:00.000Z'), // JST 5/7
      makePlanned('add1', '2026-05-07T16:00:00.000Z'), // JST 5/8 追加
    ];
    expect(extractAffectedDateKeys(before, after)).toEqual(
      new Set(['2026-05-04', '2026-05-05', '2026-05-06', '2026-05-07', '2026-05-08']),
    );
  });

  test('AC8-3 盆栽削除シナリオ: 関連 planned events 一括削除', () => {
    const before = [
      makePlanned('e1', '2026-05-02T16:00:00.000Z'), // JST 5/3
      makePlanned('e2', '2026-05-03T16:00:00.000Z'), // JST 5/4
      makePlanned('e3', '2026-05-04T16:00:00.000Z'), // JST 5/5
    ];
    const after: { id: string; occurredAtUtc: string; tzOffsetMin: number }[] = [];
    expect(extractAffectedDateKeys(before, after)).toEqual(
      new Set(['2026-05-03', '2026-05-04', '2026-05-05']),
    );
  });
});

describe('shouldRescheduleSummary', () => {
  test('影響なし → false (scheduler 呼出スキップ)', () => {
    const events = [makePlanned('e1', '2026-05-02T16:00:00.000Z')];
    expect(shouldRescheduleSummary(events, events)).toBe(false);
    expect(shouldRescheduleSummary([], [])).toBe(false);
  });

  test('追加 → true', () => {
    expect(shouldRescheduleSummary([], [makePlanned('e1', '2026-05-02T16:00:00.000Z')])).toBe(true);
  });

  test('削除 → true', () => {
    expect(shouldRescheduleSummary([makePlanned('e1', '2026-05-02T16:00:00.000Z')], [])).toBe(true);
  });

  test('変更 → true', () => {
    expect(
      shouldRescheduleSummary(
        [makePlanned('e1', '2026-05-02T16:00:00.000Z')],
        [makePlanned('e1', '2026-05-04T16:00:00.000Z')],
      ),
    ).toBe(true);
  });
});

describe('filterUpcomingPlanned (7 日ローリング)', () => {
  // 基準: 2026-05-03 12:00 JST
  const now = new Date('2026-05-03T03:00:00.000Z'); // JST 12:00

  test('当日 + 6 日先以内のみ抽出 (range: 5/3 - 5/9)', () => {
    const events = [
      makePlanned('past', '2026-05-01T16:00:00.000Z'), // JST 5/2 (範囲外)
      makePlanned('today', '2026-05-02T16:00:00.000Z'), // JST 5/3 (範囲内)
      makePlanned('day3', '2026-05-04T16:00:00.000Z'), // JST 5/5 (範囲内)
      makePlanned('day7', '2026-05-08T16:00:00.000Z'), // JST 5/9 (範囲内、ぎりぎり)
      makePlanned('day8', '2026-05-09T16:00:00.000Z'), // JST 5/10 (範囲外)
    ];
    const result = filterUpcomingPlanned(events, now, JST);
    expect(result.map((e) => e.id)).toEqual(['today', 'day3', 'day7']);
  });

  test('過去日のみ → 空配列', () => {
    const events = [makePlanned('past', '2026-04-01T16:00:00.000Z')];
    expect(filterUpcomingPlanned(events, now, JST)).toEqual([]);
  });

  test('全て遠未来 → 空配列', () => {
    const events = [makePlanned('future', '2027-01-01T16:00:00.000Z')];
    expect(filterUpcomingPlanned(events, now, JST)).toEqual([]);
  });

  test('TZ 跨ぎ: PST -480 で JST と異なる範囲計算', () => {
    const pstNow = new Date('2026-05-03T08:00:00.000Z'); // PST 5/3 01:00
    const events = [
      makePlanned('e1', '2026-05-03T08:00:00.000Z', -480), // PST 5/3
      makePlanned('e2', '2026-05-09T08:00:00.000Z', -480), // PST 5/9
      makePlanned('e3', '2026-05-10T08:00:00.000Z', -480), // PST 5/10 (範囲外)
    ];
    const result = filterUpcomingPlanned(events, pstNow, -480);
    expect(result.map((e) => e.id)).toEqual(['e1', 'e2']);
  });
});

describe('AC8 シナリオ統合', () => {
  test('AC8-1 + AC8-2: 予定追加 → 削除 → 計 2 回 reschedule 必要', () => {
    let history: { id: string; occurredAtUtc: string; tzOffsetMin: number }[] = [];

    // 追加
    const after1 = [makePlanned('e1', '2026-05-02T16:00:00.000Z')];
    expect(shouldRescheduleSummary(history, after1)).toBe(true);
    history = after1;

    // 削除
    const after2: { id: string; occurredAtUtc: string; tzOffsetMin: number }[] = [];
    expect(shouldRescheduleSummary(history, after2)).toBe(true);
  });

  test('AC8-4 F-07 外す予定日時入力 → planned 追加 → reschedule 必要', () => {
    const before: { id: string; occurredAtUtc: string; tzOffsetMin: number }[] = [];
    const after = [
      makePlanned('unwire_event_1', '2026-06-15T00:00:00.000Z'), // 1 ヶ月後の外す予定
    ];
    expect(shouldRescheduleSummary(before, after)).toBe(true);
    expect(extractAffectedDateKeys(before, after)).toEqual(new Set(['2026-06-15']));
  });
});
