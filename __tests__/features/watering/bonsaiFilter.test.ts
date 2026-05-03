/**
 * F-04 Phase D-2 — 盆栽フィルター 純関数テスト (Issue #29 / ADR-0013 AC6)。
 */

import {
  applyBonsaiFilter,
  excludeArchivedBonsai,
  filterBonsaiByQuery,
  sortBonsaiWithRecent,
  type BonsaiLike,
} from '@/src/features/watering/bonsaiFilter';

function makeBonsai(id: string, name: string, archivedAt: string | null = null): BonsaiLike {
  return { id, name, archivedAt };
}

describe('filterBonsaiByQuery (AC6 検索ボックス)', () => {
  const bonsai = [
    makeBonsai('1', '黒松'),
    makeBonsai('2', '赤松'),
    makeBonsai('3', '白松'),
    makeBonsai('4', '太郎の黒松'),
  ];

  test('空 query → 全件返す', () => {
    expect(filterBonsaiByQuery(bonsai, '').length).toBe(4);
  });

  test('部分一致 (中央) → 該当のみ', () => {
    expect(filterBonsaiByQuery(bonsai, '黒松').map((b) => b.id)).toEqual(['1', '4']);
  });

  test('完全一致なし → 空', () => {
    expect(filterBonsaiByQuery(bonsai, '梅')).toEqual([]);
  });

  test('前後空白 trim', () => {
    expect(filterBonsaiByQuery(bonsai, '  黒松  ').map((b) => b.id)).toEqual(['1', '4']);
  });

  test('case-insensitive (英字)', () => {
    const en = [makeBonsai('e1', 'Pine'), makeBonsai('e2', 'PINE TREE')];
    expect(filterBonsaiByQuery(en, 'pine').map((b) => b.id)).toEqual(['e1', 'e2']);
  });

  test('入力型ガード (string 以外) → 全件返す', () => {
    expect(filterBonsaiByQuery(bonsai, undefined as unknown as string).length).toBe(4);
    expect(filterBonsaiByQuery(bonsai, null as unknown as string).length).toBe(4);
  });

  test('空白のみ → 全件返す (trim 後 0 文字)', () => {
    expect(filterBonsaiByQuery(bonsai, '   ').length).toBe(4);
  });
});

describe('excludeArchivedBonsai', () => {
  test('archivedAt=null は残る、非 null は除外', () => {
    const list = [
      makeBonsai('1', '生きてる', null),
      makeBonsai('2', 'アーカイブ', '2026-01-01T00:00:00Z'),
      makeBonsai('3', 'もう一つ生きてる', null),
    ];
    expect(excludeArchivedBonsai(list).map((b) => b.id)).toEqual(['1', '3']);
  });

  test('全 archivedAt → 空', () => {
    const list = [makeBonsai('1', 'a', '2026-01-01Z'), makeBonsai('2', 'b', '2026-02-01Z')];
    expect(excludeArchivedBonsai(list)).toEqual([]);
  });

  test('全 active → 全部残る', () => {
    const list = [makeBonsai('1', 'a'), makeBonsai('2', 'b')];
    expect(excludeArchivedBonsai(list).length).toBe(2);
  });
});

describe('sortBonsaiWithRecent (AC6-3 最近見た 3 本 + アイウエオ順)', () => {
  const bonsai = [
    makeBonsai('1', '黒松'),
    makeBonsai('2', '赤松'),
    makeBonsai('3', '白松'),
    makeBonsai('4', '梅'),
    makeBonsai('5', '紅葉'),
  ];

  test('recentIds 空 → 全件アイウエオ順', () => {
    const sorted = sortBonsaiWithRecent(bonsai, []);
    // ja localeCompare で 赤松 < 紅葉 < 白松 < 梅 < 黒松 等の順序
    expect(sorted.length).toBe(5);
    expect(new Set(sorted.map((b) => b.id))).toEqual(new Set(['1', '2', '3', '4', '5']));
  });

  test('recentIds 1 件 → その 1 本が先頭、残りはアイウエオ順', () => {
    const sorted = sortBonsaiWithRecent(bonsai, ['3']);
    expect(sorted[0].id).toBe('3');
    expect(sorted.length).toBe(5);
  });

  test('recentIds 3 件 → 順序保持で先頭固定', () => {
    const sorted = sortBonsaiWithRecent(bonsai, ['4', '2', '5']);
    expect(sorted.slice(0, 3).map((b) => b.id)).toEqual(['4', '2', '5']);
    expect(sorted.length).toBe(5);
  });

  test('recentIds 4 件以上 → 先頭 3 件のみ採用 (maxRecent=3 default)', () => {
    const sorted = sortBonsaiWithRecent(bonsai, ['1', '2', '3', '4', '5']);
    expect(sorted.slice(0, 3).map((b) => b.id)).toEqual(['1', '2', '3']);
    expect(sorted.length).toBe(5);
  });

  test('maxRecent=5 指定で全部先頭固定', () => {
    const sorted = sortBonsaiWithRecent(bonsai, ['1', '2', '3', '4', '5'], 5);
    expect(sorted.map((b) => b.id)).toEqual(['1', '2', '3', '4', '5']);
  });

  test('maxRecent=0 → 最近見た無視、全アイウエオ順', () => {
    const sorted = sortBonsaiWithRecent(bonsai, ['1', '2', '3'], 0);
    expect(sorted.length).toBe(5);
  });

  test('recentIds に存在しない id が含まれる → スキップ', () => {
    const sorted = sortBonsaiWithRecent(bonsai, ['nonexistent', '1', '2']);
    expect(sorted.slice(0, 2).map((b) => b.id)).toEqual(['1', '2']);
    expect(sorted.length).toBe(5);
  });

  test('recentIds に重複 id → 1 度だけ採用', () => {
    const sorted = sortBonsaiWithRecent(bonsai, ['1', '1', '1', '2']);
    expect(sorted.slice(0, 2).map((b) => b.id)).toEqual(['1', '2']);
    expect(sorted.length).toBe(5);
  });
});

describe('applyBonsaiFilter (統合)', () => {
  const all = [
    makeBonsai('1', '黒松'),
    makeBonsai('2', '赤松'),
    makeBonsai('3', '白松'),
    makeBonsai('4', '梅'),
    makeBonsai('5', 'アーカイブ済', '2026-01-01Z'),
  ];

  test('AC6-1 デフォルト: アーカイブ除外 + クエリなし → active 全件アイウエオ順', () => {
    const result = applyBonsaiFilter({ bonsai: all });
    expect(result.length).toBe(4);
    expect(result.map((b) => b.id).includes('5')).toBe(false);
  });

  test('クエリで絞り込み + アーカイブ除外', () => {
    const result = applyBonsaiFilter({ bonsai: all, query: '松' });
    expect(result.map((b) => b.id).sort()).toEqual(['1', '2', '3']);
  });

  test('最近見た 3 本を先頭固定 + 残りアイウエオ順', () => {
    const result = applyBonsaiFilter({ bonsai: all, recentIds: ['4', '3'] });
    expect(result.slice(0, 2).map((b) => b.id)).toEqual(['4', '3']);
  });

  test('クエリ + 最近見た + アーカイブ除外を全部適用', () => {
    const result = applyBonsaiFilter({
      bonsai: all,
      query: '松',
      recentIds: ['3', '1'],
    });
    expect(result.slice(0, 2).map((b) => b.id)).toEqual(['3', '1']);
    expect(result.map((b) => b.id).sort()).toEqual(['1', '2', '3']);
  });

  test('includeArchived=true でアーカイブも含める', () => {
    const result = applyBonsaiFilter({ bonsai: all, includeArchived: true });
    expect(result.length).toBe(5);
  });

  test('全部空 → アクティブ全件アイウエオ順 (= デフォルト)', () => {
    const result = applyBonsaiFilter({ bonsai: all, query: '', recentIds: [] });
    expect(result.length).toBe(4);
  });
});
