/**
 * F-04 Phase H-1 — recentBonsaiStore テスト (Issue #29 / ADR-0013 §AC6-3)。
 * AsyncStorage 永続化の実検証は Phase H-2 で Maestro / 実機テストでカバー。
 */
jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
      return Promise.resolve();
    }),
  };
});

// eslint-disable-next-line import/first -- jest.mock を先に書く必要があるため
import { useRecentBonsaiStore } from '@/src/stores/recentBonsaiStore';

beforeEach(() => {
  useRecentBonsaiStore.setState({ recentIds: [] });
});

describe('useRecentBonsaiStore', () => {
  test('初期状態: recentIds は空配列', () => {
    expect(useRecentBonsaiStore.getState().recentIds).toEqual([]);
  });

  test('pushRecent で先頭に追加', () => {
    useRecentBonsaiStore.getState().pushRecent('b1');
    expect(useRecentBonsaiStore.getState().recentIds).toEqual(['b1']);
  });

  test('複数回 push: 新しい順に並ぶ', () => {
    useRecentBonsaiStore.getState().pushRecent('b1');
    useRecentBonsaiStore.getState().pushRecent('b2');
    useRecentBonsaiStore.getState().pushRecent('b3');
    expect(useRecentBonsaiStore.getState().recentIds).toEqual(['b3', 'b2', 'b1']);
  });

  test('既存 ID を再 push: 重複なしで先頭に移動', () => {
    useRecentBonsaiStore.getState().pushRecent('b1');
    useRecentBonsaiStore.getState().pushRecent('b2');
    useRecentBonsaiStore.getState().pushRecent('b1');
    expect(useRecentBonsaiStore.getState().recentIds).toEqual(['b1', 'b2']);
  });

  test('最大 3 件超: 末尾から削除', () => {
    useRecentBonsaiStore.getState().pushRecent('b1');
    useRecentBonsaiStore.getState().pushRecent('b2');
    useRecentBonsaiStore.getState().pushRecent('b3');
    useRecentBonsaiStore.getState().pushRecent('b4');
    expect(useRecentBonsaiStore.getState().recentIds).toEqual(['b4', 'b3', 'b2']);
  });

  test('空文字列 / undefined / 非 string は無視', () => {
    useRecentBonsaiStore.getState().pushRecent('b1');
    useRecentBonsaiStore.getState().pushRecent('');
    useRecentBonsaiStore.getState().pushRecent(undefined as unknown as string);
    useRecentBonsaiStore.getState().pushRecent(123 as unknown as string);
    expect(useRecentBonsaiStore.getState().recentIds).toEqual(['b1']);
  });

  test('clear でリセット', () => {
    useRecentBonsaiStore.getState().pushRecent('b1');
    useRecentBonsaiStore.getState().pushRecent('b2');
    useRecentBonsaiStore.getState().clear();
    expect(useRecentBonsaiStore.getState().recentIds).toEqual([]);
  });
});
