/**
 * F-16 scheduler (expo-notifications wrapper) テスト (Issue #30 / ADR-0014)。
 *
 * Mock 戦略:
 * - `expo-notifications` を完全 mock (副作用 API は呼ばない、引数検証のみ)
 * - `react-native` Platform は default 'ios' で OK (Android 専用ロジックは別 case で上書き)
 *
 * 検証範囲:
 * - rescheduleDailySummaryNotifications: enabled=false で全キャンセル
 * - rescheduleDailySummaryNotifications: enabled=true で正しい trigger を組み立てる
 * - cancelAllManagedNotifications: prefix 一致のものだけ削除
 *
 * ADR-0014 Amended: ②水やり繰り返し通知は廃止 (rescheduleWateringNotifications 削除)。
 */

import {
  cancelAllManagedNotifications,
  rescheduleDailySummaryNotifications,
} from '../../../src/features/notification/scheduler';

const mockGetAll = jest.fn();
const mockCancel = jest.fn();
const mockSchedule = jest.fn();
const mockSetChannel = jest.fn();

jest.mock('expo-notifications', () => ({
  __esModule: true,
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily' },
  getAllScheduledNotificationsAsync: (...args: unknown[]) => mockGetAll(...args),
  cancelScheduledNotificationAsync: (...args: unknown[]) => mockCancel(...args),
  scheduleNotificationAsync: (...args: unknown[]) => mockSchedule(...args),
  setNotificationChannelAsync: (...args: unknown[]) => mockSetChannel(...args),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));

jest.mock('react-native', () => ({
  __esModule: true,
  Platform: { OS: 'ios' },
}));

const copy = {
  summary: (count: number) => ({ title: 'BonsaiLog', body: `${count} 件` }),
};

beforeEach(() => {
  mockGetAll.mockReset();
  mockCancel.mockReset();
  mockSchedule.mockReset();
  mockSetChannel.mockReset();
  mockGetAll.mockResolvedValue([]);
  mockCancel.mockResolvedValue(undefined);
  mockSchedule.mockResolvedValue('id');
  mockSetChannel.mockResolvedValue({});
});

describe('rescheduleDailySummaryNotifications', () => {
  test('enabled=false → 既存をキャンセルして 0 件', async () => {
    mockGetAll.mockResolvedValue([
      { identifier: 'daily_summary_2026-05-02' },
      { identifier: 'daily_watering_07_00' },
      { identifier: 'other_keep' },
    ]);
    const scheduled = await rescheduleDailySummaryNotifications({
      enabled: false,
      time: { hour: 7, minute: 0 },
      todayKey: '2026-05-02',
      tzOffsetMin: 540,
      events: [],
      copy,
    });
    expect(scheduled).toBe(0);
    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(mockCancel).toHaveBeenCalledWith('daily_summary_2026-05-02');
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('enabled=true で planned events の日を予約 (件数本文に反映)', async () => {
    const nowMs = Date.UTC(2026, 4, 1, 21, 0, 0); // JST 2026-05-02 06:00
    const scheduled = await rescheduleDailySummaryNotifications({
      enabled: true,
      time: { hour: 7, minute: 0 },
      todayKey: '2026-05-02',
      tzOffsetMin: 540,
      events: [
        { occurredAtUtc: '2026-05-02T01:00:00.000Z', tzOffsetMin: 540 }, // JST 5/2
        { occurredAtUtc: '2026-05-02T05:00:00.000Z', tzOffsetMin: 540 }, // JST 5/2
        { occurredAtUtc: '2026-05-03T05:00:00.000Z', tzOffsetMin: 540 }, // JST 5/3
      ],
      copy,
      nowMs,
    });
    expect(scheduled).toBe(2);
    const args = mockSchedule.mock.calls.map((c) => c[0]);
    const idents = args.map((a) => a.identifier);
    expect(idents).toEqual(['daily_summary_2026-05-02', 'daily_summary_2026-05-03']);
    expect(args[0].content.body).toBe('2 件'); // 5/2 = 2 件
    expect(args[1].content.body).toBe('1 件'); // 5/3 = 1 件
    expect(args[0].trigger.type).toBe('date');
    expect(args[0].trigger.channelId).toBe('bonsai_daily_summary');
  });

  test('該当日 0 件は予約しない (ADR-0014 §21.3.3)', async () => {
    const nowMs = Date.UTC(2026, 4, 1, 21, 0, 0);
    const scheduled = await rescheduleDailySummaryNotifications({
      enabled: true,
      time: { hour: 7, minute: 0 },
      todayKey: '2026-05-02',
      tzOffsetMin: 540,
      events: [],
      copy,
      nowMs,
    });
    expect(scheduled).toBe(0);
    expect(mockSchedule).not.toHaveBeenCalled();
  });
});

describe('cancelAllManagedNotifications', () => {
  test('当日まとめ prefix のみ削除、他系は保持', async () => {
    mockGetAll.mockResolvedValue([
      { identifier: 'daily_summary_2026-05-02' },
      { identifier: 'other_keep' },
    ]);
    await cancelAllManagedNotifications();
    const cancelled = mockCancel.mock.calls.map((c) => c[0]);
    expect(cancelled).toContain('daily_summary_2026-05-02');
    expect(cancelled).not.toContain('other_keep');
  });
});
