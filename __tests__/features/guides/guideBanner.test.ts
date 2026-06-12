/**
 * GuideBanner store unit test (#1178 / Sess102 意匠統一)。
 *
 * 確認項目:
 * 1. show でメッセージ表示、hide で即消去
 * 2. durationMs 経過で自動消去 (fake timers)
 * 3. 連続 show で前のタイマーがリセットされる (早すぎる消去の防止)
 */
import { useGuideBannerStore } from '@/src/features/guides/GuideBanner';

beforeEach(() => {
  jest.useFakeTimers();
  useGuideBannerStore.getState().hide();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useGuideBannerStore (#1178)', () => {
  test('show → message 表示 / hide → 即消去', () => {
    useGuideBannerStore.getState().show('お祝い');
    expect(useGuideBannerStore.getState().message).toBe('お祝い');
    useGuideBannerStore.getState().hide();
    expect(useGuideBannerStore.getState().message).toBeNull();
  });

  test('durationMs 経過で自動消去 (default 6000ms)', () => {
    useGuideBannerStore.getState().show('お祝い');
    jest.advanceTimersByTime(5999);
    expect(useGuideBannerStore.getState().message).toBe('お祝い');
    jest.advanceTimersByTime(1);
    expect(useGuideBannerStore.getState().message).toBeNull();
  });

  test('連続 show は前のタイマーをリセット (2 通目が早死にしない)', () => {
    useGuideBannerStore.getState().show('1 通目', { durationMs: 1000 });
    jest.advanceTimersByTime(900);
    useGuideBannerStore.getState().show('2 通目', { durationMs: 1000 });
    jest.advanceTimersByTime(900);
    expect(useGuideBannerStore.getState().message).toBe('2 通目');
    jest.advanceTimersByTime(100);
    expect(useGuideBannerStore.getState().message).toBeNull();
  });
});
