/**
 * F-09 Phase D — 検索クエリ正規化 + 履歴管理 純関数テスト (Issue #31 / ADR-0008 改訂)。
 *
 * AC9 (Y4 trim / Y5 case-insensitive) + AC7 (履歴 FIFO 20 件) を網羅。
 */

import {
  MAX_HISTORY_SIZE,
  MAX_QUERY_LENGTH,
  clearSearchHistory,
  normalizeSearchQuery,
  pushSearchHistory,
  removeFromSearchHistory,
} from '@/src/features/search/queryHistory';

describe('定数', () => {
  test('MAX_HISTORY_SIZE = 20 (AC7-1)', () => {
    expect(MAX_HISTORY_SIZE).toBe(20);
  });
  test('MAX_QUERY_LENGTH = 100', () => {
    expect(MAX_QUERY_LENGTH).toBe(100);
  });
});

describe('normalizeSearchQuery (Y4 + Y5)', () => {
  test('Y4: 前後空白 trim', () => {
    expect(normalizeSearchQuery('  bonsai  ')).toBe('bonsai');
  });

  test('Y5: case-insensitive (大文字 → 小文字)', () => {
    expect(normalizeSearchQuery('BONSAI')).toBe('bonsai');
    expect(normalizeSearchQuery('BoNsAi')).toBe('bonsai');
  });

  test('連続空白を 1 つに圧縮 (内部正規化)', () => {
    expect(normalizeSearchQuery('黒松   太郎')).toBe('黒松 太郎');
  });

  test('全角空白も連続空白として圧縮', () => {
    expect(normalizeSearchQuery('黒松　　太郎')).toBe('黒松 太郎');
    expect(normalizeSearchQuery('黒松 　太郎')).toBe('黒松 太郎');
  });

  test('空文字列 → 空文字列', () => {
    expect(normalizeSearchQuery('')).toBe('');
  });

  test('空白のみ → 空文字列 (trim 後 0 文字)', () => {
    expect(normalizeSearchQuery('   ')).toBe('');
    expect(normalizeSearchQuery('　　　')).toBe('');
  });

  test('入力型ガード (string 以外) → 空文字列', () => {
    expect(normalizeSearchQuery(undefined)).toBe('');
    expect(normalizeSearchQuery(null)).toBe('');
    expect(normalizeSearchQuery(123)).toBe('');
    expect(normalizeSearchQuery({})).toBe('');
  });

  test('日本語 (ひらがな / カタカナ / 漢字) はそのまま', () => {
    expect(normalizeSearchQuery('くろまつ')).toBe('くろまつ');
    expect(normalizeSearchQuery('クロマツ')).toBe('クロマツ');
    expect(normalizeSearchQuery('黒松')).toBe('黒松');
  });

  test('Latin 拡張 (アクセント付) はそのまま小文字化', () => {
    expect(normalizeSearchQuery('Café')).toBe('café');
  });
});

describe('pushSearchHistory (AC7-1 FIFO + 重複排除)', () => {
  test('空履歴に追加 → 1 件', () => {
    expect(pushSearchHistory([], 'bonsai')).toEqual(['bonsai']);
  });

  test('既存履歴の先頭に追加 (新しい順)', () => {
    expect(pushSearchHistory(['old'], 'new')).toEqual(['new', 'old']);
  });

  test('重複は削除して先頭に再配置', () => {
    expect(pushSearchHistory(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
  });

  test('20 件超過 → 末尾切り捨て', () => {
    const existing = Array.from({ length: 20 }, (_, i) => `q${i}`);
    const result = pushSearchHistory(existing, 'newest');
    expect(result.length).toBe(20);
    expect(result[0]).toBe('newest');
    expect(result[result.length - 1]).toBe('q18'); // q19 が押し出される
  });

  test('max=5 指定でその個数まで切る', () => {
    const existing = ['a', 'b', 'c', 'd', 'e'];
    expect(pushSearchHistory(existing, 'f', 5)).toEqual(['f', 'a', 'b', 'c', 'd']);
  });

  test('max=0 → 空配列返却 (履歴無効化)', () => {
    expect(pushSearchHistory(['a', 'b'], 'c', 0)).toEqual([]);
  });

  test('空 query は no-op (既存をそのまま max 件まで返す)', () => {
    expect(pushSearchHistory(['a', 'b'], '')).toEqual(['a', 'b']);
    expect(pushSearchHistory(['a', 'b'], '', 1)).toEqual(['a']);
  });

  test('入力型ガード (string 以外 query) → 既存を切り詰めて返す', () => {
    expect(pushSearchHistory(['a', 'b'], undefined as unknown as string)).toEqual(['a', 'b']);
    expect(pushSearchHistory(['a', 'b'], null as unknown as string)).toEqual(['a', 'b']);
  });

  test('元配列を変更しない (immutable)', () => {
    const original = ['a', 'b', 'c'];
    const result = pushSearchHistory(original, 'd');
    expect(original).toEqual(['a', 'b', 'c']);
    expect(result).not.toBe(original);
  });
});

describe('clearSearchHistory (AC7-3)', () => {
  test('常に空配列を返す', () => {
    expect(clearSearchHistory()).toEqual([]);
  });

  test('呼出毎に新しい配列を返す (immutable)', () => {
    expect(clearSearchHistory()).not.toBe(clearSearchHistory());
  });
});

describe('removeFromSearchHistory (拡張用)', () => {
  test('該当 1 件削除', () => {
    expect(removeFromSearchHistory(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
  });

  test('複数該当を全て削除', () => {
    expect(removeFromSearchHistory(['a', 'b', 'a', 'c'], 'a')).toEqual(['b', 'c']);
  });

  test('該当なしは no-op', () => {
    expect(removeFromSearchHistory(['a', 'b'], 'z')).toEqual(['a', 'b']);
  });

  test('空 query は no-op', () => {
    expect(removeFromSearchHistory(['a', 'b'], '')).toEqual(['a', 'b']);
  });

  test('入力型ガード', () => {
    expect(removeFromSearchHistory(['a'], undefined as unknown as string)).toEqual(['a']);
    expect(removeFromSearchHistory(['a'], null as unknown as string)).toEqual(['a']);
  });

  test('元配列を変更しない', () => {
    const original = ['a', 'b', 'c'];
    const result = removeFromSearchHistory(original, 'b');
    expect(original).toEqual(['a', 'b', 'c']);
    expect(result).not.toBe(original);
  });
});

describe('AC9 + AC7 統合シナリオ', () => {
  test('シナリオ A: 大文字混在クエリを正規化 → 履歴に追加 → 後で同じ意味のクエリで再ヒット', () => {
    const q1 = normalizeSearchQuery('  Bonsai  ');
    const q2 = normalizeSearchQuery('BONSAI');
    expect(q1).toBe('bonsai');
    expect(q2).toBe('bonsai');

    let history: string[] = [];
    history = pushSearchHistory(history, q1);
    history = pushSearchHistory(history, q2);
    // 同じ正規化結果なので履歴は 1 件のまま
    expect(history).toEqual(['bonsai']);
  });

  test('シナリオ B: 21 件追加 → 古い 1 件押し出される', () => {
    let history: string[] = [];
    for (let i = 0; i < 21; i++) {
      history = pushSearchHistory(history, `query_${i}`);
    }
    expect(history.length).toBe(20);
    expect(history[0]).toBe('query_20');
    expect(history.includes('query_0')).toBe(false);
    expect(history.includes('query_1')).toBe(true);
  });

  test('シナリオ C: 履歴 → クリア → 再追加', () => {
    let history: string[] = ['a', 'b', 'c'];
    history = clearSearchHistory();
    expect(history).toEqual([]);
    history = pushSearchHistory(history, 'fresh');
    expect(history).toEqual(['fresh']);
  });
});
