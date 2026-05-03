/**
 * F-09 Phase E — 3 段組み検索結果整形 純関数テスト (Issue #31 / ADR-0008 改訂 AC2)。
 */

import {
  SEARCH_TOTAL_LIMIT,
  countGroupedResults,
  groupSearchResults,
  sortBySearchScore,
} from '@/src/features/search/searchGrouping';

describe('SEARCH_TOTAL_LIMIT', () => {
  test('AC2 上限 50 件 (合算)', () => {
    expect(SEARCH_TOTAL_LIMIT).toBe(50);
  });
});

describe('sortBySearchScore (SO1: bm25 昇順 + updated_at 降順)', () => {
  test('bm25 昇順 (低いほど上位)', () => {
    const items = [
      { id: 'a', bm25: 5, updatedAt: '2026-01-01' },
      { id: 'b', bm25: 1, updatedAt: '2026-01-01' },
      { id: 'c', bm25: 3, updatedAt: '2026-01-01' },
    ];
    expect(sortBySearchScore(items).map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });

  test('同 bm25 → updated_at 降順 (新しい順)', () => {
    const items = [
      { id: 'a', bm25: 1, updatedAt: '2026-01-01' },
      { id: 'b', bm25: 1, updatedAt: '2026-03-01' },
      { id: 'c', bm25: 1, updatedAt: '2026-02-01' },
    ];
    expect(sortBySearchScore(items).map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });

  test('bm25=null → 末尾扱い (Number.POSITIVE_INFINITY)', () => {
    const items = [
      { id: 'a', bm25: null, updatedAt: '2026-01-01' },
      { id: 'b', bm25: 1, updatedAt: '2026-01-01' },
    ];
    expect(sortBySearchScore(items).map((x) => x.id)).toEqual(['b', 'a']);
  });

  test('bm25=undefined → 末尾扱い', () => {
    const items = [
      { id: 'a', updatedAt: '2026-01-01' },
      { id: 'b', bm25: 1, updatedAt: '2026-01-01' },
    ];
    expect(sortBySearchScore(items).map((x) => x.id)).toEqual(['b', 'a']);
  });

  test('updatedAt が null/undefined → 空文字列扱い (古い側)', () => {
    const items = [
      { id: 'a', bm25: 1, updatedAt: null },
      { id: 'b', bm25: 1, updatedAt: '2026-01-01' },
      { id: 'c', bm25: 1 },
    ];
    expect(sortBySearchScore(items).map((x) => x.id)).toEqual(['b', 'a', 'c']);
  });

  test('元配列を変更しない (immutable)', () => {
    const original = [
      { id: 'a', bm25: 5 },
      { id: 'b', bm25: 1 },
    ];
    const result = sortBySearchScore(original);
    expect(original.map((x) => x.id)).toEqual(['a', 'b']);
    expect(result).not.toBe(original);
  });

  test('空配列 → 空配列', () => {
    expect(sortBySearchScore([])).toEqual([]);
  });
});

describe('groupSearchResults (AC2 3 段組み)', () => {
  test('3 段全部に件数 → 3 セクション返却 (順序: bonsai → species → note)', () => {
    const result = groupSearchResults({
      bonsai: [{ id: 'b1', bm25: 1 }],
      species: [{ id: 's1', bm25: 2 }],
      notes: [{ id: 'n1', bm25: 3 }],
    });
    expect(result.length).toBe(3);
    expect(result[0].kind).toBe('bonsai');
    expect(result[1].kind).toBe('species');
    expect(result[2].kind).toBe('note');
  });

  test('SE1: 0 件セクションは非表示', () => {
    const result = groupSearchResults({
      bonsai: [],
      species: [{ id: 's1', bm25: 1 }],
      notes: [],
    });
    expect(result.length).toBe(1);
    expect(result[0].kind).toBe('species');
  });

  test('全カテゴリ 0 件 → 空配列', () => {
    expect(groupSearchResults({ bonsai: [], species: [], notes: [] })).toEqual([]);
  });

  test('SO1: 各セクション内で bm25 昇順 + updated_at 降順', () => {
    const result = groupSearchResults({
      bonsai: [
        { id: 'b1', bm25: 5 },
        { id: 'b2', bm25: 1 },
      ],
      species: [],
      notes: [],
    });
    expect(result[0].items.map((x) => x.id)).toEqual(['b2', 'b1']);
  });

  test('合算上限 (totalLimit=50) を超えない: 60 件入力 → 50 件カット', () => {
    const bonsai = Array.from({ length: 60 }, (_, i) => ({ id: `b${i}`, bm25: i }));
    const result = groupSearchResults({ bonsai, species: [], notes: [] });
    expect(result[0].items.length).toBe(50);
  });

  test('合算上限カット: bonsai 30 + species 20 + notes 30 → 50 件で切る (note 0 件)', () => {
    const bonsai = Array.from({ length: 30 }, (_, i) => ({ id: `b${i}`, bm25: i }));
    const species = Array.from({ length: 20 }, (_, i) => ({ id: `s${i}`, bm25: i }));
    const notes = Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, bm25: i }));
    const result = groupSearchResults({ bonsai, species, notes });
    // bonsai 30 + species 20 = 50 → notes は 0 件で除外
    expect(result.length).toBe(2);
    expect(result[0].kind).toBe('bonsai');
    expect(result[0].items.length).toBe(30);
    expect(result[1].kind).toBe('species');
    expect(result[1].items.length).toBe(20);
  });

  test('合算上限カット: bonsai 50 → species/notes は除外 (合計 50)', () => {
    const bonsai = Array.from({ length: 50 }, (_, i) => ({ id: `b${i}`, bm25: i }));
    const result = groupSearchResults({
      bonsai,
      species: [{ id: 's1', bm25: 0 }],
      notes: [{ id: 'n1', bm25: 0 }],
    });
    expect(result.length).toBe(1);
    expect(result[0].items.length).toBe(50);
  });

  test('カスタム totalLimit で切る', () => {
    const bonsai = Array.from({ length: 10 }, (_, i) => ({ id: `b${i}`, bm25: i }));
    const result = groupSearchResults({ bonsai, species: [], notes: [], totalLimit: 5 });
    expect(result[0].items.length).toBe(5);
  });

  test('totalLimit=0 → 全カテゴリ除外 (空配列)', () => {
    const result = groupSearchResults({
      bonsai: [{ id: 'b1', bm25: 1 }],
      species: [{ id: 's1', bm25: 1 }],
      notes: [{ id: 'n1', bm25: 1 }],
      totalLimit: 0,
    });
    expect(result).toEqual([]);
  });
});

describe('countGroupedResults', () => {
  test('全セクションの合算件数', () => {
    const sections = [
      { kind: 'bonsai' as const, items: [{ id: 'b1' }, { id: 'b2' }] },
      { kind: 'species' as const, items: [{ id: 's1' }] },
      { kind: 'note' as const, items: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }] },
    ];
    expect(countGroupedResults(sections)).toBe(6);
  });

  test('空配列 → 0', () => {
    expect(countGroupedResults([])).toBe(0);
  });

  test('単一空セクション → 0', () => {
    expect(countGroupedResults([{ kind: 'bonsai' as const, items: [] }])).toBe(0);
  });
});

describe('AC2 シナリオ統合', () => {
  test('「黒松」検索 → 盆栽 + 樹種 + メモ 3 段', () => {
    const result = groupSearchResults({
      bonsai: [{ id: 'b1', name: '黒松「太郎」', bm25: 1, updatedAt: '2026-05-01' }],
      species: [{ id: 'sp1', name: '黒松', bm25: 2 }],
      notes: [
        { id: 'e1', snippet: '...黒松の手入れ...', bm25: 3 },
        { id: 'e2', snippet: '...黒松について...', bm25: 4 },
      ],
    });
    expect(result.length).toBe(3);
    expect(countGroupedResults(result)).toBe(4);
  });

  test('「梅」検索で盆栽 0 件 + 樹種 1 件 + メモ 5 件 → 樹種 + メモの 2 段', () => {
    const result = groupSearchResults({
      bonsai: [],
      species: [{ id: 'sp1', name: '梅', bm25: 1 }],
      notes: Array.from({ length: 5 }, (_, i) => ({ id: `e${i}`, bm25: i + 2 })),
    });
    expect(result.map((s) => s.kind)).toEqual(['species', 'note']);
    expect(countGroupedResults(result)).toBe(6);
  });
});
