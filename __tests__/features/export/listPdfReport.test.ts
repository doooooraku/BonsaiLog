/**
 * F-10 list_pdf リッチレポート集計純関数テスト (Issue #33 / ADR-0016 Phase 1)。
 */
import {
  buildListReportBars,
  buildListReportSummary,
  buildMonthAxis,
  type ListReportBonsaiInput,
  type ListReportEventInput,
  monthAxisFromEvents,
  toLocalMonthKey,
} from '@/src/features/export/listPdfReport';

function bonsai(over: Partial<ListReportBonsaiInput> = {}): ListReportBonsaiInput {
  return { id: 'b1', name: '黒松', speciesName: '黒松', style: 'moyogi', ...over };
}
function ev(over: Partial<ListReportEventInput> = {}): ListReportEventInput {
  return {
    bonsaiId: 'b1',
    type: 'watering',
    occurredAtUtc: '2026-05-10T01:00:00.000Z',
    tzOffsetMin: 540,
    ...over,
  };
}

describe('toLocalMonthKey', () => {
  test('JST で月境界をまたぐ (UTC 末日夜 → ローカル翌月)', () => {
    // 2026-05-31 20:00 UTC + 9h = 2026-06-01 05:00 JST → '2026-06'
    expect(toLocalMonthKey('2026-05-31T20:00:00.000Z', 540)).toBe('2026-06');
  });
  test('通常ケース', () => {
    expect(toLocalMonthKey('2026-05-10T01:00:00.000Z', 540)).toBe('2026-05');
  });
});

describe('buildMonthAxis', () => {
  test('連続月を両端含めて生成', () => {
    expect(buildMonthAxis('2026-01', '2026-03')).toEqual(['2026-01', '2026-02', '2026-03']);
  });
  test('年境界をまたぐ', () => {
    expect(buildMonthAxis('2025-11', '2026-02')).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
  });
  test('単月', () => {
    expect(buildMonthAxis('2026-05', '2026-05')).toEqual(['2026-05']);
  });
  test('maxMonths 超過は直近にクランプ (古い側を捨てる)', () => {
    const axis = buildMonthAxis('2020-01', '2026-01', 24);
    expect(axis).toHaveLength(24);
    expect(axis[axis.length - 1]).toBe('2026-01');
    expect(axis[0]).toBe('2024-02'); // 直近 24 ヶ月
  });
  test('from > to の異常入力は [from]', () => {
    expect(buildMonthAxis('2026-05', '2026-01')).toEqual(['2026-05']);
  });
  test('空入力は空配列', () => {
    expect(buildMonthAxis('', '')).toEqual([]);
  });
});

describe('monthAxisFromEvents', () => {
  test('最古〜最新の連続月軸 (欠損月も含む)', () => {
    const axis = monthAxisFromEvents([
      ev({ occurredAtUtc: '2026-01-05T01:00:00.000Z' }),
      ev({ occurredAtUtc: '2026-03-20T01:00:00.000Z' }),
    ]);
    expect(axis).toEqual(['2026-01', '2026-02', '2026-03']);
  });
  test('events 無しは空配列', () => {
    expect(monthAxisFromEvents([])).toEqual([]);
  });
});

describe('buildListReportSummary', () => {
  test('盆栽総数 / 樹種数 / 樹形数 / 通算記録', () => {
    const s = buildListReportSummary(
      [
        bonsai({ id: 'b1', speciesName: '黒松', style: 'moyogi' }),
        bonsai({ id: 'b2', speciesName: '黒松', style: 'chokkan' }), // 樹種重複
        bonsai({ id: 'b3', speciesName: 'モミジ', style: 'moyogi' }), // 樹形重複
      ],
      [ev(), ev(), ev({ bonsaiId: 'b2' })],
    );
    expect(s.bonsaiCount).toBe(3);
    expect(s.speciesCount).toBe(2); // 黒松 / モミジ
    expect(s.styleCount).toBe(2); // moyogi / chokkan
    expect(s.totalEvents).toBe(3);
  });
  test('null の樹種 / 樹形は distinct に数えない', () => {
    const s = buildListReportSummary(
      [
        bonsai({ id: 'b1', speciesName: null, style: null }),
        bonsai({ id: 'b2', speciesName: '黒松', style: null }),
      ],
      [],
    );
    expect(s.speciesCount).toBe(1);
    expect(s.styleCount).toBe(0);
    expect(s.totalEvents).toBe(0);
  });
});

describe('buildListReportBars', () => {
  const opts = { topBonsai: 15, months: [] as string[], othersLabelTemplate: 'Others ({count})' };

  test('perBonsai: 件数降順 + pct は max 基準', () => {
    const bars = buildListReportBars(
      [bonsai({ id: 'b1', name: 'A' }), bonsai({ id: 'b2', name: 'B' })],
      [ev({ bonsaiId: 'b1' }), ev({ bonsaiId: 'b1' }), ev({ bonsaiId: 'b2' })],
      opts,
    );
    expect(bars.perBonsai.map((d) => d.label)).toEqual(['A', 'B']);
    expect(bars.perBonsai[0]).toMatchObject({ count: 2, pct: 100 });
    expect(bars.perBonsai[1]).toMatchObject({ count: 1, pct: 50 });
  });

  test('perBonsai: topBonsai 超過分は「その他({残数})」に集約', () => {
    const list = [
      bonsai({ id: 'b1', name: 'A' }),
      bonsai({ id: 'b2', name: 'B' }),
      bonsai({ id: 'b3', name: 'C' }),
      bonsai({ id: 'b4', name: 'D' }),
    ];
    const events = [
      ev({ bonsaiId: 'b1' }),
      ev({ bonsaiId: 'b1' }),
      ev({ bonsaiId: 'b1' }),
      ev({ bonsaiId: 'b2' }),
      ev({ bonsaiId: 'b2' }),
      ev({ bonsaiId: 'b3' }),
      ev({ bonsaiId: 'b4' }),
    ];
    const bars = buildListReportBars(list, events, { ...opts, topBonsai: 2 });
    expect(bars.perBonsai).toHaveLength(3); // 上位 2 + その他
    expect(bars.perBonsai[2]).toMatchObject({ label: 'Others (2)', count: 2 }); // C+D = 1+1
  });

  test('perSpecies: 樹種ごとの保有本数 降順', () => {
    const bars = buildListReportBars(
      [
        bonsai({ id: 'b1', speciesName: '黒松' }),
        bonsai({ id: 'b2', speciesName: '黒松' }),
        bonsai({ id: 'b3', speciesName: 'モミジ' }),
      ],
      [],
      opts,
    );
    expect(bars.perSpecies[0]).toMatchObject({ label: '黒松', count: 2, pct: 100 });
    expect(bars.perSpecies[1]).toMatchObject({ label: 'モミジ', count: 1, pct: 50 });
  });

  test('perMonth: 月軸に沿って件数 (欠損月は 0)', () => {
    const months = ['2026-01', '2026-02', '2026-03'];
    const bars = buildListReportBars(
      [bonsai({ id: 'b1' })],
      [
        ev({ occurredAtUtc: '2026-01-05T01:00:00.000Z' }),
        ev({ occurredAtUtc: '2026-03-20T01:00:00.000Z' }),
        ev({ occurredAtUtc: '2026-03-21T01:00:00.000Z' }),
      ],
      { ...opts, months },
    );
    expect(bars.perMonth.map((d) => d.count)).toEqual([1, 0, 2]);
    expect(bars.perMonth.map((d) => d.label)).toEqual(months);
  });

  test('0 件: pct は全て 0 (ゼロ除算なし)', () => {
    const bars = buildListReportBars([bonsai({ id: 'b1' })], [], { ...opts, months: ['2026-01'] });
    expect(bars.perBonsai[0]).toMatchObject({ count: 0, pct: 0 });
    expect(bars.perMonth[0]).toMatchObject({ count: 0, pct: 0 });
  });
});
