/**
 * F-09 Phase F — searchHistoryStore zustand 統合テスト (Issue #31 / ADR-0008 改訂)。
 *
 * 純関数 (#102) は queryHistory.test.ts で網羅済み。本ファイルでは store の
 * - push / clear / remove メソッドが純関数を正しく呼び出すか
 * - normalize 経由で重複排除 / case-insensitive が機能するか
 * - 初期状態が空配列か
 * を検証する。
 */

import { useSearchHistoryStore } from '@/src/features/search/searchHistoryStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

beforeEach(() => {
  // 各テスト前に store を初期化
  useSearchHistoryStore.setState({ history: [] });
});

describe('useSearchHistoryStore', () => {
  test('初期状態 → 空配列', () => {
    expect(useSearchHistoryStore.getState().history).toEqual([]);
  });

  test('push: クエリ追加 → 履歴先頭', () => {
    useSearchHistoryStore.getState().push('黒松');
    expect(useSearchHistoryStore.getState().history).toEqual(['黒松']);
  });

  test('push: normalize 経由 (大文字 → 小文字)', () => {
    useSearchHistoryStore.getState().push('BONSAI');
    expect(useSearchHistoryStore.getState().history).toEqual(['bonsai']);
  });

  test('push: 同じ意味のクエリは重複排除 (大小文字 + 空白)', () => {
    const { push } = useSearchHistoryStore.getState();
    push('  Bonsai  ');
    push('BONSAI');
    push('bonsai');
    expect(useSearchHistoryStore.getState().history).toEqual(['bonsai']);
  });

  test('push: 空文字 / 空白のみ → no-op', () => {
    useSearchHistoryStore.getState().push('');
    useSearchHistoryStore.getState().push('   ');
    expect(useSearchHistoryStore.getState().history).toEqual([]);
  });

  test('push: 21 件追加 → 古い 1 件押し出し (FIFO 20)', () => {
    const { push } = useSearchHistoryStore.getState();
    for (let i = 0; i < 21; i++) {
      push(`query_${i}`);
    }
    const history = useSearchHistoryStore.getState().history;
    expect(history.length).toBe(20);
    expect(history[0]).toBe('query_20');
    expect(history.includes('query_0')).toBe(false);
    expect(history.includes('query_1')).toBe(true);
  });

  test('clear: 全履歴削除', () => {
    const { push, clear } = useSearchHistoryStore.getState();
    push('a');
    push('b');
    push('c');
    expect(useSearchHistoryStore.getState().history.length).toBe(3);
    clear();
    expect(useSearchHistoryStore.getState().history).toEqual([]);
  });

  test('remove: 指定クエリ削除 (normalize 経由)', () => {
    const { push, remove } = useSearchHistoryStore.getState();
    push('黒松');
    push('赤松');
    push('白松');
    remove('赤松');
    expect(useSearchHistoryStore.getState().history).toEqual(['白松', '黒松']);
  });

  test('remove: case-insensitive で削除 (大文字入力でも小文字履歴を削除)', () => {
    const { push, remove } = useSearchHistoryStore.getState();
    push('bonsai');
    remove('BONSAI');
    expect(useSearchHistoryStore.getState().history).toEqual([]);
  });

  test('remove: 該当なし → no-op', () => {
    const { push, remove } = useSearchHistoryStore.getState();
    push('黒松');
    remove('梅');
    expect(useSearchHistoryStore.getState().history).toEqual(['黒松']);
  });
});

describe('AC7 シナリオ統合', () => {
  test('シナリオ A: 連続検索 → 最新が先頭', () => {
    const { push } = useSearchHistoryStore.getState();
    push('黒松');
    push('赤松');
    push('白松');
    expect(useSearchHistoryStore.getState().history).toEqual(['白松', '赤松', '黒松']);
  });

  test('シナリオ B: 履歴クリア → 再追加', () => {
    const { push, clear } = useSearchHistoryStore.getState();
    push('a');
    push('b');
    clear();
    push('c');
    expect(useSearchHistoryStore.getState().history).toEqual(['c']);
  });

  test('シナリオ C: 同じクエリの再検索 → 履歴の先頭に移動 (重複なし)', () => {
    const { push } = useSearchHistoryStore.getState();
    push('a');
    push('b');
    push('c');
    push('a'); // a を再検索
    expect(useSearchHistoryStore.getState().history).toEqual(['a', 'c', 'b']);
  });
});
