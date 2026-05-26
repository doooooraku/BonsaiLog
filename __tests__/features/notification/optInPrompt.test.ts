/**
 * contextual soft-ask opt-in 判定 (ADR-0014 Amended) のテスト。
 *
 * maybePromptNotificationOptIn の表示条件:
 * - 通知 OFF かつ 未提示 → 表示 (showOptIn=true) + prompted=true に固定
 * - 通知 ON → 表示しない
 * - 既に提示済 → 表示しない (生涯 1 回)
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
  };
});

// eslint-disable-next-line import/first -- jest.mock を先に書く必要があるため
import {
  maybePromptNotificationOptIn,
  useNotificationOptInStore,
} from '@/src/features/notification/optInPrompt';
// eslint-disable-next-line import/first
import { useSettingsStore } from '@/src/stores/settingsStore';

function setup(enabled: boolean, prompted: boolean) {
  useSettingsStore.setState({
    notificationDailySummaryEnabled: enabled,
    notificationOptInPrompted: prompted,
  });
  useNotificationOptInStore.setState({ showOptIn: false });
}

describe('maybePromptNotificationOptIn', () => {
  test('通知 OFF かつ 未提示 → モーダル表示 + prompted=true', () => {
    setup(false, false);
    maybePromptNotificationOptIn();
    expect(useNotificationOptInStore.getState().showOptIn).toBe(true);
    expect(useSettingsStore.getState().notificationOptInPrompted).toBe(true);
  });

  test('通知 ON → 表示しない (既に通知を受け取っている)', () => {
    setup(true, false);
    maybePromptNotificationOptIn();
    expect(useNotificationOptInStore.getState().showOptIn).toBe(false);
    // ON のときは prompted を変更しない
    expect(useSettingsStore.getState().notificationOptInPrompted).toBe(false);
  });

  test('既に提示済 → 表示しない (生涯 1 回)', () => {
    setup(false, true);
    maybePromptNotificationOptIn();
    expect(useNotificationOptInStore.getState().showOptIn).toBe(false);
  });
});
