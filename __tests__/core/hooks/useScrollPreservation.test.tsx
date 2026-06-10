/**
 * useScrollPreservation 単体 test。
 *
 * 検証項目 (Sess95 PR-2 改修後):
 * 1. onScroll で contentOffset.y を保存し、 focus 時に scrollTo で復元される
 * 2. 初回フォーカス時 lastOffset=0 では復元が走らない (no-op)
 * 3. cleanup で cancelAnimationFrame が呼ばれる (race 防止)
 * 4. scrollRef.current が null の race で例外が出ない
 * 5. 復元 window 中の暗黙 0 リセット (onScroll(0)) で復元目標が失われない
 * 6. 復元 window 中の onContentSizeChange で再復元される (layout 変動に勝つ)
 * 7. 復元 window (500ms) 終了後は通常の onScroll 追跡に復帰する
 *
 * mock 戦略:
 * - expo-router の useFocusEffect を mock し、 渡された callback を test 内で発火させる
 * - requestAnimationFrame / setTimeout は jest.useFakeTimers で制御
 */
import { act, renderHook } from '@testing-library/react-native';

import { useScrollPreservation } from '@/src/core/hooks/useScrollPreservation';

// expo-router の useFocusEffect を mock。 callback を capture して test 内で発火。
let focusEffectCallback: (() => (() => void) | void) | null = null;

jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn((cb: () => (() => void) | void) => {
    focusEffectCallback = cb;
  }),
}));

function scrollEvent(y: number) {
  return { nativeEvent: { contentOffset: { y } } } as never;
}

describe('useScrollPreservation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    focusEffectCallback = null;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('scrollEventThrottle は 16 (≈60fps)', () => {
    const scrollRef = { current: { scrollTo: jest.fn() } };
    const { result } = renderHook(() => useScrollPreservation(scrollRef as never));

    expect(result.current.scrollEventThrottle).toBe(16);
  });

  it('onScroll で保存した y が focus 時 scrollTo で復元される', () => {
    const scrollRef = { current: { scrollTo: jest.fn() } };
    const { result } = renderHook(() => useScrollPreservation(scrollRef as never));

    // ユーザーがスクロールして y=420 で止まった
    act(() => {
      result.current.onScroll(scrollEvent(420));
    });

    // 子画面から戻ってきた = useFocusEffect callback が発火
    act(() => {
      focusEffectCallback?.();
    });

    // requestAnimationFrame の 1 frame を進める
    act(() => {
      jest.runAllTimers();
    });

    expect(scrollRef.current.scrollTo).toHaveBeenCalledWith({ y: 420, animated: false });
  });

  it('初回フォーカス時 lastOffset=0 では復元が走らない (no-op)', () => {
    const scrollRef = { current: { scrollTo: jest.fn() } };
    renderHook(() => useScrollPreservation(scrollRef as never));

    act(() => {
      focusEffectCallback?.();
      jest.runAllTimers();
    });

    expect(scrollRef.current.scrollTo).not.toHaveBeenCalled();
  });

  it('cleanup で cancelAnimationFrame が呼ばれる (focus 後すぐ離脱した race 防止)', () => {
    const cancelSpy = jest.spyOn(global, 'cancelAnimationFrame');
    const scrollRef = { current: { scrollTo: jest.fn() } };
    const { result } = renderHook(() => useScrollPreservation(scrollRef as never));

    // 復元対象を作る (y>0 でないと focus 時に RAF が登録されない)
    act(() => {
      result.current.onScroll(scrollEvent(300));
    });

    let cleanup: (() => void) | void;
    act(() => {
      cleanup = focusEffectCallback?.();
    });

    act(() => {
      (cleanup as () => void)?.();
    });

    expect(cancelSpy).toHaveBeenCalled();
    cancelSpy.mockRestore();
  });

  it('scrollRef.current が null でも例外が出ない (race safety)', () => {
    const nullRef = { current: null };
    const { result } = renderHook(() => useScrollPreservation(nullRef as never));

    expect(() => {
      act(() => {
        result.current.onScroll(scrollEvent(100));
        focusEffectCallback?.();
        result.current.onContentSizeChange(360, 1200);
        jest.runAllTimers();
      });
    }).not.toThrow();
  });

  it('複数回 onScroll が呼ばれた場合、 最後の y で復元される', () => {
    const scrollRef = { current: { scrollTo: jest.fn() } };
    const { result } = renderHook(() => useScrollPreservation(scrollRef as never));

    // 段階的にスクロール: y=100 → y=250 → y=420
    [100, 250, 420].forEach((y) => {
      act(() => {
        result.current.onScroll(scrollEvent(y));
      });
    });

    act(() => {
      focusEffectCallback?.();
      jest.runAllTimers();
    });

    expect(scrollRef.current.scrollTo).toHaveBeenCalledWith({ y: 420, animated: false });
  });

  it('復元 window 中の暗黙 0 リセット (onScroll(0)) で復元目標が失われない', () => {
    const scrollRef = { current: { scrollTo: jest.fn() } };
    const { result } = renderHook(() => useScrollPreservation(scrollRef as never));

    act(() => {
      result.current.onScroll(scrollEvent(420));
    });
    act(() => {
      focusEffectCallback?.();
    });

    // RAF (即時復元) だけ進める (500ms timeout はまだ)
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(scrollRef.current.scrollTo).toHaveBeenCalledWith({ y: 420, animated: false });

    // RN ScrollView の暗黙 0 リセットが scroll イベントとして発火 (旧実装はここで
    // lastOffsetRef が 0 に上書きされ、 復元先を失っていた)
    act(() => {
      result.current.onScroll(scrollEvent(0));
    });

    // layout 変動 → onContentSizeChange で再復元 → 420 が維持される
    scrollRef.current.scrollTo.mockClear();
    act(() => {
      result.current.onContentSizeChange(360, 1500);
    });
    expect(scrollRef.current.scrollTo).toHaveBeenCalledWith({ y: 420, animated: false });
  });

  it('復元 window 外の onContentSizeChange では何もしない', () => {
    const scrollRef = { current: { scrollTo: jest.fn() } };
    const { result } = renderHook(() => useScrollPreservation(scrollRef as never));

    // focus していない (pending なし) 状態の layout 変動
    act(() => {
      result.current.onContentSizeChange(360, 1500);
    });

    expect(scrollRef.current.scrollTo).not.toHaveBeenCalled();
  });

  it('復元 window (500ms) 終了後は通常の onScroll 追跡に復帰する', () => {
    const scrollRef = { current: { scrollTo: jest.fn() } };
    const { result } = renderHook(() => useScrollPreservation(scrollRef as never));

    act(() => {
      result.current.onScroll(scrollEvent(420));
    });
    act(() => {
      focusEffectCallback?.();
    });

    // 復元 window 終了 (500ms 経過)
    act(() => {
      jest.advanceTimersByTime(600);
    });

    // window 終了後のユーザースクロールは追跡される
    act(() => {
      result.current.onScroll(scrollEvent(777));
    });

    // 再 focus で新しい位置 777 に復元される
    scrollRef.current.scrollTo.mockClear();
    act(() => {
      focusEffectCallback?.();
      jest.runAllTimers();
    });

    expect(scrollRef.current.scrollTo).toHaveBeenCalledWith({ y: 777, animated: false });
  });
});
