/**
 * F-26 オンボーディング Phase A — onboardingStore テスト (Issue #26 / ADR-0018)。
 * AsyncStorage 永続化の実検証は Phase B で Maestro / 実機テストでカバー。
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
import { useOnboardingStore } from '@/src/stores/onboardingStore';

beforeEach(() => {
  useOnboardingStore.setState({ completed: false, dismissed: {} });
});

describe('useOnboardingStore', () => {
  test('初期状態: completed=false, dismissed={}', () => {
    const s = useOnboardingStore.getState();
    expect(s.completed).toBe(false);
    expect(s.dismissed).toEqual({});
  });

  test('setCompleted(true) で completed=true', () => {
    useOnboardingStore.getState().setCompleted(true);
    expect(useOnboardingStore.getState().completed).toBe(true);
  });

  test('markDismissed で各 Step を dismissed に追加', () => {
    useOnboardingStore.getState().markDismissed('tut1');
    useOnboardingStore.getState().markDismissed('tut3');
    const s = useOnboardingStore.getState();
    expect(s.dismissed.tut1).toBe(true);
    expect(s.dismissed.tut3).toBe(true);
    expect(s.dismissed.tut2).toBeUndefined();
  });

  test('resetTutorial は tut1-5 をリセット、welcome / language は保持', () => {
    const store = useOnboardingStore.getState();
    store.markDismissed('welcome');
    store.markDismissed('language');
    store.markDismissed('tut1');
    store.markDismissed('tut3');
    store.resetTutorial();
    const after = useOnboardingStore.getState();
    expect(after.dismissed.welcome).toBe(true);
    expect(after.dismissed.language).toBe(true);
    expect(after.dismissed.tut1).toBeUndefined();
    expect(after.dismissed.tut3).toBeUndefined();
  });
});
