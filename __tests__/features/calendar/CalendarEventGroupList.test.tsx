/**
 * CalendarEventGroupList 空状態の mode 分岐 unit test (#1177)。
 *
 * 旧 bug: plan / record 両モードが planSelectedEmpty 共用 → 記録タブの 0 件日に
 * 「予定はありません。」が誤表示されていた (component が mode を知らなかった)。
 *
 * 確認項目 (Issue #1177 AC):
 * 1. record mode + 0 件 → record 系キーのみ表示 (plan 系キーが出ない)
 * 2. plan mode + 0 件 → plan 系キー + 定期予定リンク表示、tap で /recurring-rules (管理画面) へ遷移
 *    (/recurring-rules/new は bonsaiId+eventType param が caller 必須のため直接遷移しない)
 * 3. record mode + 0 件 → 定期予定リンクは出ない
 * 4. 1 件以上 → 空状態 (タイトル/リンク) が出ない
 */
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import type { Bonsai, Event, EventType } from '@/src/db/schema';
import { CalendarEventGroupList } from '@/src/features/calendar/CalendarEventGroupList';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

type Props = React.ComponentProps<typeof CalendarEventGroupList>;

function baseProps(mode: Props['mode'], selectedDayEvents: readonly Event[] = []): Props {
  return {
    mode,
    testIdPrefix: mode,
    bonsaiDetailTab: mode === 'plan' ? 'timeline' : 'history',
    selectedDateKey: '2026-06-11',
    todayLocalKey: '2026-06-11',
    tzOffsetMin: 0,
    selectedDayEvents,
    plannedGroupedEvents: [],
    loggedGroupedEvents: [],
    expandedTypes: new Set<EventType>(),
    toggleExpand: jest.fn(),
    bonsaiMap: new Map<string, Bonsai>(),
    lang: 'ja',
    // t は key をそのまま返す stub — 表示文言でなく「どのキーが選ばれたか」を検証する
    t: (key) => key,
    formatGroupCount: jest.fn(() => ''),
    formatGroupAccessibility: jest.fn(() => ''),
    confirmDeleteEvent: jest.fn(),
    confirmDeleteGroup: jest.fn(),
    handleKebabPress: jest.fn(),
    handleBulkConvert: jest.fn(),
    handleSingleConvert: jest.fn(),
  };
}

afterEach(() => {
  mockPush.mockClear();
});

describe('CalendarEventGroupList 空状態 mode 分岐 (#1177)', () => {
  test('AC1: record mode + 0 件 → record 系キーのみ (旧 bug「予定はありません」の構造再発防止)', () => {
    const { getByText, queryByText, getByTestId } = render(
      <CalendarEventGroupList {...baseProps('record')} />,
    );
    expect(getByTestId('e2e_record_selected_empty')).toBeTruthy();
    expect(getByText('recordSelectedEmptyTitle')).toBeTruthy();
    expect(getByText('recordSelectedEmptyBody')).toBeTruthy();
    expect(queryByText('planSelectedEmptyTitle')).toBeNull();
    expect(queryByText('planSelectedEmptyBody')).toBeNull();
  });

  test('AC2: plan mode + 0 件 → plan 系キー + 定期予定リンク、tap で /recurring-rules', () => {
    const { getByText, queryByText, getByTestId } = render(
      <CalendarEventGroupList {...baseProps('plan')} />,
    );
    expect(getByTestId('e2e_plan_selected_empty')).toBeTruthy();
    expect(getByText('planSelectedEmptyTitle')).toBeTruthy();
    expect(getByText('planSelectedEmptyBody')).toBeTruthy();
    expect(queryByText('recordSelectedEmptyTitle')).toBeNull();

    fireEvent.press(getByTestId('e2e_plan_selected_empty_recurring_link'));
    expect(mockPush).toHaveBeenCalledWith('/recurring-rules');
  });

  test('AC3: record mode では定期予定リンクが出ない', () => {
    const { queryByTestId } = render(<CalendarEventGroupList {...baseProps('record')} />);
    expect(queryByTestId('e2e_plan_selected_empty_recurring_link')).toBeNull();
  });

  test.each(['plan', 'record'] as const)('AC4: %s mode + 1 件以上 → 空状態が出ない', (mode) => {
    const oneEvent = [{ id: 'e1' } as unknown as Event];
    const { queryByTestId, queryByText } = render(
      <CalendarEventGroupList {...baseProps(mode, oneEvent)} />,
    );
    expect(queryByTestId(`e2e_${mode}_selected_empty`)).toBeNull();
    expect(queryByText('planSelectedEmptyTitle')).toBeNull();
    expect(queryByText('recordSelectedEmptyTitle')).toBeNull();
  });
});
