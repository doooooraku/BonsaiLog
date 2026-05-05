/**
 * 予定タブ Stack (ADR-0020 Phase 5、本 PR は stub)。
 *
 * Phase 5 で Claude Design `care-screens.jsx CalendarScreen` 整合に本実装:
 * - index: 月カレンダー + 当日リスト + FAB「今日の作業を一括記録」
 * - wiring: 針金がけ一覧 (`WiringListScreen`、タブ: すべて/未外し/1週間以内)
 */
import { Stack } from 'expo-router';
import React from 'react';

export default function PlanStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: '予定' }} />
    </Stack>
  );
}
