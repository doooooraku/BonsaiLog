/**
 * useScrollPreservation 単体 test。
 *
 * 検証項目:
 * 1. onScroll で contentOffset.y を保存し、 focus 時に scrollTo で復元される
 * 2. 初回フォーカス時 lastOffset=0 で scrollTo(0) が呼ばれても問題ない
 * 3. cleanup で cancelAnimationFrame が呼ばれる (race 防止)
 * 4. scrollRef.current が null の race で例外が出ない
 *
 * mock 戦略:
 * - expo-router の useFocusEffect を mock し、 渡された callback を test 内で発火させる
 * - requestAnimationFrame は jest.useFakeTimers で制御
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
      result.current.onScroll({
        nativeEvent: { contentOffset: { y: 420 } },
      } as never);
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

  it('初回フォーカス時 lastOffset=0 で scrollTo(0) が呼ばれる (no-op として安全)', () => {
    const scrollRef = { current: { scrollTo: jest.fn() } };
    renderHook(() => useScrollPreservation(scrollRef as never));

    act(() => {
      focusEffectCallback?.();
      jest.runAllTimers();
    });

    expect(scrollRef.current.scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
  });

  it('cleanup で cancelAnimationFrame が呼ばれる (focus 後すぐ離脱した race 防止)', () => {
    const cancelSpy = jest.spyOn(global, 'cancelAnimationFrame');
    const scrollRef = { current: { scrollTo: jest.fn() } };
    renderHook(() => useScrollPreservation(scrollRef as never));

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
    renderHook(() => useScrollPreservation(nullRef as never));

    expect(() => {
      act(() => {
        focusEffectCallback?.();
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
        result.current.onScroll({
          nativeEvent: { contentOffset: { y } },
        } as never);
      });
    });

    act(() => {
      focusEffectCallback?.();
      jest.runAllTimers();
    });

    expect(scrollRef.current.scrollTo).toHaveBeenCalledWith({ y: 420, animated: false });
  });
});
